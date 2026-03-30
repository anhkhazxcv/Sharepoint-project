import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import type { IOrderDetail, IOrderItem } from '../orderDetail/types';

const ASSET_LIST_TITLE: string = 'lstSanPham';
const ORDER_LIST_TITLE: string = 'lstDonHang';
const ORDER_DETAIL_LIST_TITLE: string = 'lstChiTietDonHang';
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

export interface IUpdateOrderPaymentStatusOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  orderId: string;
  paymentStatus: string;
}

export interface IUpdateAssetStockOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  assetItemId: string;
  nextStock: number;
}

export interface IRollbackTransactionOrderOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  orderId: string;
}

export interface IUserTransactionLineRecord {
  productCode: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IUserTransactionRecord {
  orderId: string;
  orderCode: string;
  buyerName: string;
  buyerEmail: string;
  purchaseDate: string;
  totalAmount: number;
  totalQuantity: number;
  status: string;
  paymentStatus: string;
  items: IUserTransactionLineRecord[];
}

type TSharePointItem = Record<string, unknown>;

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

function getStringValue(item: TSharePointItem, candidates: string[], fallback: string = ''): string {
  for (let index: number = 0; index < candidates.length; index += 1) {
    const candidate: string = candidates[index];
    const value: unknown = item[candidate];

    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return fallback;
}

function getNumberValue(item: TSharePointItem, candidates: string[], fallback: number = 0): number {
  for (let index: number = 0; index < candidates.length; index += 1) {
    const candidate: string = candidates[index];
    const value: unknown = item[candidate];

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsedValue: number = Number(value);

      if (!isNaN(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return fallback;
}

async function postListItem(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  payload: Record<string, unknown>
): Promise<void> {
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
    throw new Error('Không thể ghi dữ liệu vào SharePoint list ' + listTitle + '. Response: ' + errorText);
  }
}

async function getListItemByFilter(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  filterQuery: string
): Promise<{ Id: number } | undefined> {
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
    throw new Error('Không thể đọc dữ liệu từ SharePoint list ' + listTitle + '. Response: ' + errorText);
  }

  const json: { value?: Array<{ Id: number }> } = (await response.json()) as { value?: Array<{ Id: number }> };

  if (!json.value || !json.value.length) {
    return undefined;
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
    throw new Error('Không thể cập nhật dữ liệu trong SharePoint list ' + listTitle + '. Response: ' + errorText);
  }
}

async function deleteListItemById(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  itemId: number
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
        'IF-MATCH': '*',
        'X-HTTP-Method': 'DELETE'
      }
    }
  );

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error('Không thể xóa dữ liệu trong SharePoint list ' + listTitle + '. Response: ' + errorText);
  }
}

async function getListItems(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  selectFields: string[],
  filterQuery?: string
): Promise<TSharePointItem[]> {
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(listTitle) +
    "')/items?$top=5000&$select=" +
    selectFields.join(',') +
    (filterQuery ? '&$filter=' + encodeURIComponent(filterQuery) : '');
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
    throw new Error('Không thể đọc dữ liệu từ SharePoint list ' + listTitle + '. Response: ' + errorText);
  }

  const json: { value?: TSharePointItem[] } = (await response.json()) as { value?: TSharePointItem[] };
  return Array.isArray(json.value) ? json.value : [];
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function buildOrFilter(fieldName: string, values: string[]): string {
  return values
    .map((value: string) => fieldName + " eq '" + escapeODataValue(value) + "'")
    .join(' or ');
}

export async function createTransactionItem(options: ICreateTransactionOptions): Promise<void> {
  const items: IOrderItem[] = options.orderDetail.items;
  const totalQuantity: number = items.reduce((sum: number, item: IOrderItem) => sum + item.quantity, 0);

  if (!items.length) {
    throw new Error('Không có sản phẩm trong đơn hàng để tạo giao dịch.');
  }

  await postListItem(options.siteUrl, options.spHttpClient, ORDER_LIST_TITLE, {
    OrderId: options.orderDetail.orderCode,
    EmployeeName: options.buyerName,
    EmployeeEmail: options.buyerEmail,
    OrderDate: options.orderDetail.purchaseDate,
    TotalQuantity: totalQuantity,
    TotalAmount: options.orderDetail.totalAmount,
    Status: options.orderDetail.handoverStatus,
    PaymentStatus: options.orderDetail.paymentStatus,
    Note: 'Created from cart'
  });

  await Promise.all(
    items.map((item: IOrderItem) =>
      postListItem(options.siteUrl, options.spHttpClient, ORDER_DETAIL_LIST_TITLE, {
        OrderId: options.orderDetail.orderCode,
        ProductCode: item.assetCode,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
        LineTotal: item.amount
      })
    )
  );
}

export async function generateUniqueOrderId(siteUrl: string, spHttpClient: SPHttpClient): Promise<string> {
  let attemptIndex: number = 0;

  while (attemptIndex < 10) {
    const candidate: string = createTwelveDigitCandidate();
    const existingItem = await getListItemByFilter(
      siteUrl,
      spHttpClient,
      ORDER_LIST_TITLE,
      "OrderId eq '" + escapeODataValue(candidate) + "'"
    );

    if (!existingItem) {
      return candidate;
    }

    attemptIndex += 1;
  }

  throw new Error('Không thể sinh mã đơn hàng 12 chữ số duy nhất.');
}

export async function getTransactionsByUser(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  userEmail: string
): Promise<IUserTransactionRecord[]> {
  const escapedEmail: string = escapeODataValue(userEmail);
  const orderHeaders: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    ORDER_LIST_TITLE,
    ['OrderId', 'EmployeeName', 'EmployeeEmail', 'OrderDate', 'Created', 'TotalQuantity', 'TotalAmount', 'Status', 'PaymentStatus', 'Id'],
    "EmployeeEmail eq '" + escapedEmail + "'"
  );

  if (!orderHeaders.length) {
    return [];
  }

  const orderIds: string[] = orderHeaders
    .map((item: TSharePointItem) => getStringValue(item, ['OrderId']))
    .filter((value: string) => !!value);

  const orderDetailItems: TSharePointItem[] = orderIds.length
    ? await getListItems(
        siteUrl,
        spHttpClient,
        ORDER_DETAIL_LIST_TITLE,
        ['OrderId', 'ProductCode', 'Quantity', 'UnitPrice', 'LineTotal'],
        buildOrFilter('OrderId', orderIds)
      )
    : [];

  const detailMap: Record<string, IUserTransactionLineRecord[]> = {};
  orderDetailItems.forEach((item: TSharePointItem) => {
    const orderId: string = getStringValue(item, ['OrderId']);

    if (!detailMap[orderId]) {
      detailMap[orderId] = [];
    }

    detailMap[orderId].push({
      productCode: getStringValue(item, ['ProductCode']),
      quantity: getNumberValue(item, ['Quantity'], 0),
      unitPrice: getNumberValue(item, ['UnitPrice'], 0),
      lineTotal: getNumberValue(item, ['LineTotal'], 0)
    });
  });

  return orderHeaders.map((item: TSharePointItem): IUserTransactionRecord => {
    const orderId: string = getStringValue(item, ['OrderId'], 'N/A');

    return {
      orderId,
      orderCode: orderId,
      buyerName: getStringValue(item, ['EmployeeName'], 'Chưa cập nhật'),
      buyerEmail: getStringValue(item, ['EmployeeEmail'], ''),
      purchaseDate: getStringValue(item, ['OrderDate', 'Created'], new Date().toISOString()),
      totalAmount: getNumberValue(item, ['TotalAmount'], 0),
      totalQuantity: getNumberValue(item, ['TotalQuantity'], 0),
      status: getStringValue(item, ['Status'], 'Chưa bàn giao'),
      paymentStatus: getStringValue(item, ['PaymentStatus'], 'Chờ xác nhận'),
      items: detailMap[orderId] || []
    };
  });
}

export async function getAllTransactions(siteUrl: string, spHttpClient: SPHttpClient): Promise<IUserTransactionRecord[]> {
  const orderHeaders: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    ORDER_LIST_TITLE,
    ['OrderId', 'EmployeeName', 'EmployeeEmail', 'OrderDate', 'Created', 'TotalQuantity', 'TotalAmount', 'Status', 'PaymentStatus', 'Id']
  );

  if (!orderHeaders.length) {
    return [];
  }

  const orderIds: string[] = orderHeaders
    .map((item: TSharePointItem) => getStringValue(item, ['OrderId']))
    .filter((value: string) => !!value);

  const orderDetailItems: TSharePointItem[] = orderIds.length
    ? await getListItems(
        siteUrl,
        spHttpClient,
        ORDER_DETAIL_LIST_TITLE,
        ['OrderId', 'ProductCode', 'Quantity', 'UnitPrice', 'LineTotal'],
        buildOrFilter('OrderId', orderIds)
      )
    : [];

  const detailMap: Record<string, IUserTransactionLineRecord[]> = {};
  orderDetailItems.forEach((item: TSharePointItem) => {
    const orderId: string = getStringValue(item, ['OrderId']);

    if (!detailMap[orderId]) {
      detailMap[orderId] = [];
    }

    detailMap[orderId].push({
      productCode: getStringValue(item, ['ProductCode']),
      quantity: getNumberValue(item, ['Quantity'], 0),
      unitPrice: getNumberValue(item, ['UnitPrice'], 0),
      lineTotal: getNumberValue(item, ['LineTotal'], 0)
    });
  });

  return orderHeaders.map((item: TSharePointItem): IUserTransactionRecord => {
    const orderId: string = getStringValue(item, ['OrderId'], 'N/A');

    return {
      orderId,
      orderCode: orderId,
      buyerName: getStringValue(item, ['EmployeeName'], 'Chưa cập nhật'),
      buyerEmail: getStringValue(item, ['EmployeeEmail'], ''),
      purchaseDate: getStringValue(item, ['OrderDate', 'Created'], new Date().toISOString()),
      totalAmount: getNumberValue(item, ['TotalAmount'], 0),
      totalQuantity: getNumberValue(item, ['TotalQuantity'], 0),
      status: getStringValue(item, ['Status'], 'Chưa bàn giao'),
      paymentStatus: getStringValue(item, ['PaymentStatus'], 'Chờ xác nhận'),
      items: detailMap[orderId] || []
    };
  });
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
    console.warn('Không ghi được đầy đủ field lstThanhToan, thử fallback về Title.', error);

    await postListItem(options.siteUrl, options.spHttpClient, PAYMENT_HISTORY_LIST_TITLE, {
      Title: options.transferContent
    });
  }
}

export async function updateTransactionStatus(options: IUpdateTransactionStatusOptions): Promise<void> {
  const listItem = await getListItemByFilter(
    options.siteUrl,
    options.spHttpClient,
    ORDER_LIST_TITLE,
    "OrderId eq '" + escapeODataValue(options.orderId) + "'"
  );

  if (!listItem) {
    throw new Error('Không tìm thấy đơn hàng để cập nhật trạng thái.');
  }

  await updateListItemById(options.siteUrl, options.spHttpClient, ORDER_LIST_TITLE, listItem.Id, {
    Status: options.status
  });
}

export async function updateOrderPaymentStatus(options: IUpdateOrderPaymentStatusOptions): Promise<void> {
  const listItem = await getListItemByFilter(
    options.siteUrl,
    options.spHttpClient,
    ORDER_LIST_TITLE,
    "OrderId eq '" + escapeODataValue(options.orderId) + "'"
  );

  if (!listItem) {
    throw new Error('Không tìm thấy đơn hàng để cập nhật thanh toán.');
  }

  await updateListItemById(options.siteUrl, options.spHttpClient, ORDER_LIST_TITLE, listItem.Id, {
    PaymentStatus: options.paymentStatus
  });
}

export async function updateAssetStock(options: IUpdateAssetStockOptions): Promise<void> {
  const assetItemId: number = Number(options.assetItemId);

  if (!assetItemId) {
    throw new Error('Asset item id không hợp lệ.');
  }

  await updateListItemById(options.siteUrl, options.spHttpClient, ASSET_LIST_TITLE, assetItemId, {
    Stock: options.nextStock
  });
}

export async function rollbackTransactionOrder(options: IRollbackTransactionOrderOptions): Promise<void> {
  const escapedOrderId: string = escapeODataValue(options.orderId);
  const orderDetailItems: TSharePointItem[] = await getListItems(
    options.siteUrl,
    options.spHttpClient,
    ORDER_DETAIL_LIST_TITLE,
    ['Id', 'OrderId'],
    "OrderId eq '" + escapedOrderId + "'"
  );
  const orderHeaders: TSharePointItem[] = await getListItems(
    options.siteUrl,
    options.spHttpClient,
    ORDER_LIST_TITLE,
    ['Id', 'OrderId'],
    "OrderId eq '" + escapedOrderId + "'"
  );

  await Promise.all(
    orderDetailItems.map((item: TSharePointItem) =>
      deleteListItemById(options.siteUrl, options.spHttpClient, ORDER_DETAIL_LIST_TITLE, getNumberValue(item, ['Id']))
    )
  );

  await Promise.all(
    orderHeaders.map((item: TSharePointItem) =>
      deleteListItemById(options.siteUrl, options.spHttpClient, ORDER_LIST_TITLE, getNumberValue(item, ['Id']))
    )
  );
}
