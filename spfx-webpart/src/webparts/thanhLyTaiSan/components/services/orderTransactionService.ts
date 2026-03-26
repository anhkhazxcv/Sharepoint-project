import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import type { IOrderDetail } from '../orderDetail/types';

const ASSET_LIST_TITLE: string = 'lstDanhMucTaiSan';
const TRANSACTION_LIST_TITLE: string = 'lstGiaoDich';
const PAYMENT_HISTORY_LIST_TITLE: string = 'lstThanhToan';
let lastGeneratedOrderId: string = '';

export interface ICreateTransactionOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  buyerName: string;
  buyerEmail: string;
  orderDetail: IOrderDetail;
}

export interface ICreatePaymentHistoryOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  transferContent: string;
  paymentConfirmedAt: string;
}

export interface IUpdateTransactionStatusOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  orderId: string;
  status: string;
}

export interface IUpdateAssetStockOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  assetItemId: string;
  nextStock: number;
}

function createTwelveDigitCandidate(): string {
  const timestampPart: string = ('000000000' + String(Date.now())).slice(-9);
  const randomPart: string = ('000' + String(Math.floor(Math.random() * 1000))).slice(-3);
  let candidate: string = timestampPart + randomPart;

  if (lastGeneratedOrderId && candidate <= lastGeneratedOrderId) {
    candidate = String(Number(lastGeneratedOrderId) + 1);
  }

  candidate = ('000000000000' + candidate).slice(-12);
  lastGeneratedOrderId = candidate;

  return candidate;
}

async function postListItem(siteUrl: string, spHttpClient: SPHttpClient, listTitle: string, payload: Record<string, unknown>): Promise<void> {
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(listTitle) +
    "')/items";
  const response: SPHttpClientResponse = await spHttpClient.post(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=none',
        'Content-Type': 'application/json;odata.metadata=none'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error('Khong the ghi du lieu vao SharePoint list ' + listTitle + '. Response: ' + errorText);
  }
}

async function getListItemByFilter(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  filterQuery: string
): Promise<{ Id: number } | null> {
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(listTitle) +
    "')/items?$top=1&$select=Id&$filter=" +
    filterQuery;
  const response: SPHttpClientResponse = await spHttpClient.get(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=none'
      }
    }
  );

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error('Khong the doc du lieu tu SharePoint list ' + listTitle + '. Response: ' + errorText);
  }

  const json: { value?: Array<{ Id: number }> } = (await response.json()) as { value?: Array<{ Id: number }> };

  if (!json.value || !json.value.length) {
    return null;
  }

  return json.value[0];
}

async function updateListItemById(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  itemId: number,
  payload: Record<string, unknown>
): Promise<void> {
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(listTitle) +
    "')/items(" +
    String(itemId) +
    ')';
  const response: SPHttpClientResponse = await spHttpClient.post(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=none',
        'Content-Type': 'application/json;odata.metadata=none',
        'IF-MATCH': '*',
        'X-HTTP-Method': 'MERGE'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error('Khong the cap nhat du lieu trong SharePoint list ' + listTitle + '. Response: ' + errorText);
  }
}

export async function createTransactionItem(options: ICreateTransactionOptions): Promise<void> {
  const firstItem = options.orderDetail.items[0];

  if (!firstItem) {
    throw new Error('Khong co san pham trong don hang de tao giao dich.');
  }

  await postListItem(options.siteUrl, options.spHttpClient, TRANSACTION_LIST_TITLE, {
    Title: options.orderDetail.orderCode,
    EmployeeName: options.buyerName,
    EmployeeEmail: options.buyerEmail,
    AssetCode: firstItem.assetCode,
    AssetName: firstItem.assetName,
    Quantity: firstItem.quantity,
    UnitPrice: firstItem.unitPrice,
    Total: firstItem.amount,
    Status: options.orderDetail.paymentStatus
  });
}

export async function generateUniqueOrderId(siteUrl: string, spHttpClient: SPHttpClient): Promise<string> {
  let attemptIndex: number = 0;

  while (attemptIndex < 10) {
    const candidate: string = createTwelveDigitCandidate();
    const existingItem = await getListItemByFilter(
      siteUrl,
      spHttpClient,
      TRANSACTION_LIST_TITLE,
      "Title eq '" + candidate + "'"
    );

    if (!existingItem) {
      return candidate;
    }

    attemptIndex += 1;
  }

  throw new Error('Khong the sinh ma don hang 12 chu so duy nhat.');
}

export async function createPaymentHistoryItem(options: ICreatePaymentHistoryOptions): Promise<void> {
  try {
    await postListItem(options.siteUrl, options.spHttpClient, PAYMENT_HISTORY_LIST_TITLE, {
      Title: options.transferContent,
      TransferContent: options.transferContent,
      PaymentConfirmedAt: options.paymentConfirmedAt
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Khong ghi duoc day du field lstThanhToan, thu fallback ve Title.', error);

    await postListItem(options.siteUrl, options.spHttpClient, PAYMENT_HISTORY_LIST_TITLE, {
      Title: options.transferContent
    });
  }
}

export async function updateTransactionStatus(options: IUpdateTransactionStatusOptions): Promise<void> {
  const orderId: string = options.orderId.replace(/'/g, "''");
  const listItem = await getListItemByFilter(
    options.siteUrl,
    options.spHttpClient,
    TRANSACTION_LIST_TITLE,
    "Title eq '" + orderId + "'"
  );

  if (!listItem) {
    throw new Error('Khong tim thay giao dich de cap nhat trang thai.');
  }

  await updateListItemById(options.siteUrl, options.spHttpClient, TRANSACTION_LIST_TITLE, listItem.Id, {
    Status: options.status
  });
}

export async function updateAssetStock(options: IUpdateAssetStockOptions): Promise<void> {
  const assetItemId: number = Number(options.assetItemId);

  if (!assetItemId) {
    throw new Error('Asset item id khong hop le.');
  }

  await updateListItemById(options.siteUrl, options.spHttpClient, ASSET_LIST_TITLE, assetItemId, {
    Stock: options.nextStock
  });
}
