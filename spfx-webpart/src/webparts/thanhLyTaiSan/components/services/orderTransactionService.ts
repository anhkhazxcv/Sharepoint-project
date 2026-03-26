import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import type { IOrderDetail } from '../orderDetail/types';

const SHAREPOINT_SITE_URL: string = 'https://masterisegroup.sharepoint.com';
const ASSET_LIST_TITLE: string = 'lstDanhMucTaiSan';
const TRANSACTION_LIST_TITLE: string = 'lstGiaoDich';
const PAYMENT_HISTORY_LIST_TITLE: string = 'lstThanhToan';

export interface ICreateTransactionOptions {
  spHttpClient: SPHttpClient;
  buyerName: string;
  buyerEmail: string;
  orderDetail: IOrderDetail;
}

export interface ICreatePaymentHistoryOptions {
  spHttpClient: SPHttpClient;
  transferContent: string;
  paymentConfirmedAt: string;
}

export interface IUpdateTransactionStatusOptions {
  spHttpClient: SPHttpClient;
  orderId: string;
  status: string;
}

export interface IUpdateAssetStockOptions {
  spHttpClient: SPHttpClient;
  assetItemId: string;
  nextStock: number;
}

async function postListItem(spHttpClient: SPHttpClient, listTitle: string, payload: Record<string, unknown>): Promise<void> {
  const requestUrl: string =
    SHAREPOINT_SITE_URL.replace(/\/$/, '') +
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
    throw new Error('Khong the ghi du lieu vao SharePoint list ' + listTitle + '.');
  }
}

async function getListItemByFilter(
  spHttpClient: SPHttpClient,
  listTitle: string,
  filterQuery: string
): Promise<{ Id: number } | null> {
  const requestUrl: string =
    SHAREPOINT_SITE_URL.replace(/\/$/, '') +
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
    throw new Error('Khong the doc du lieu tu SharePoint list ' + listTitle + '.');
  }

  const json: { value?: Array<{ Id: number }> } = (await response.json()) as { value?: Array<{ Id: number }> };

  if (!json.value || !json.value.length) {
    return null;
  }

  return json.value[0];
}

async function updateListItemById(
  spHttpClient: SPHttpClient,
  listTitle: string,
  itemId: number,
  payload: Record<string, unknown>
): Promise<void> {
  const requestUrl: string =
    SHAREPOINT_SITE_URL.replace(/\/$/, '') +
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
    throw new Error('Khong the cap nhat du lieu trong SharePoint list ' + listTitle + '.');
  }
}

export async function createTransactionItem(options: ICreateTransactionOptions): Promise<void> {
  const firstItem = options.orderDetail.items[0];

  await postListItem(options.spHttpClient, TRANSACTION_LIST_TITLE, {
    Title: options.orderDetail.orderCode,
    OrderId: options.orderDetail.orderCode,
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

export async function createPaymentHistoryItem(options: ICreatePaymentHistoryOptions): Promise<void> {
  await postListItem(options.spHttpClient, PAYMENT_HISTORY_LIST_TITLE, {
    Title: options.transferContent,
    TransferContent: options.transferContent,
    PaymentConfirmedAt: options.paymentConfirmedAt
  });
}

export async function updateTransactionStatus(options: IUpdateTransactionStatusOptions): Promise<void> {
  const orderId: string = options.orderId.replace(/'/g, "''");
  const listItem = await getListItemByFilter(
    options.spHttpClient,
    TRANSACTION_LIST_TITLE,
    "OrderId eq '" + orderId + "'"
  );

  if (!listItem) {
    throw new Error('Khong tim thay giao dich de cap nhat trang thai.');
  }

  await updateListItemById(options.spHttpClient, TRANSACTION_LIST_TITLE, listItem.Id, {
    Status: options.status
  });
}

export async function updateAssetStock(options: IUpdateAssetStockOptions): Promise<void> {
  const assetItemId: number = Number(options.assetItemId);

  if (!assetItemId) {
    throw new Error('Asset item id khong hop le.');
  }

  await updateListItemById(options.spHttpClient, ASSET_LIST_TITLE, assetItemId, {
    Stock: options.nextStock
  });
}
