import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

const CART_LIST_TITLE: string = 'lstGioHang';
const CART_DETAIL_LIST_TITLE: string = 'lstChiTietGioHang';

export interface ICartLineRecord {
  productCode: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

type TSharePointItem = Record<string, unknown>;

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

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function createCartId(userEmail: string): string {
  return 'CART-' + userEmail.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
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

async function getListItemByFilter(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  filterQuery: string
): Promise<{ Id: number } | undefined> {
  const items: TSharePointItem[] = await getListItems(siteUrl, spHttpClient, listTitle, ['Id'], filterQuery);

  if (!items.length) {
    return undefined;
  }

  return {
    Id: getNumberValue(items[0], ['Id'], 0)
  };
}

async function getCartDetailItemByFilter(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  filterQuery: string
): Promise<{ Id: number; quantity: number } | undefined> {
  const items: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    CART_DETAIL_LIST_TITLE,
    ['Id', 'Quantity'],
    filterQuery
  );

  if (!items.length) {
    return undefined;
  }

  return {
    Id: getNumberValue(items[0], ['Id'], 0),
    quantity: getNumberValue(items[0], ['Quantity'], 0)
  };
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

async function ensureCartHeader(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  buyerName: string,
  buyerEmail: string
): Promise<string> {
  const escapedEmail: string = escapeODataValue(buyerEmail);
  const existingItems: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    CART_LIST_TITLE,
    ['CartId', 'EmployeeEmail'],
    "EmployeeEmail eq '" + escapedEmail + "'"
  );

  if (existingItems.length) {
    return getStringValue(existingItems[0], ['CartId']);
  }

  const cartId: string = createCartId(buyerEmail);
  await postListItem(siteUrl, spHttpClient, CART_LIST_TITLE, {
    CartId: cartId,
    EmployeeName: buyerName,
    EmployeeEmail: buyerEmail
  });

  return cartId;
}

async function getCartIdByBuyerEmail(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  buyerEmail: string
): Promise<string | undefined> {
  const escapedEmail: string = escapeODataValue(buyerEmail);
  const cartHeaders: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    CART_LIST_TITLE,
    ['CartId', 'EmployeeEmail'],
    "EmployeeEmail eq '" + escapedEmail + "'"
  );

  if (!cartHeaders.length) {
    return undefined;
  }

  return getStringValue(cartHeaders[0], ['CartId']);
}

export async function getCartItemsByUser(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  userEmail: string
): Promise<ICartLineRecord[]> {
  const escapedEmail: string = escapeODataValue(userEmail);
  const cartHeaders: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    CART_LIST_TITLE,
    ['CartId', 'EmployeeEmail'],
    "EmployeeEmail eq '" + escapedEmail + "'"
  );

  if (!cartHeaders.length) {
    return [];
  }

  const cartId: string = getStringValue(cartHeaders[0], ['CartId']);
  const detailItems: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    CART_DETAIL_LIST_TITLE,
    ['CartId', 'ProductCode', 'Quantity', 'UnitPrice', 'LineTotal'],
    "CartId eq '" + escapeODataValue(cartId) + "'"
  );

  return detailItems.map((item: TSharePointItem): ICartLineRecord => ({
    productCode: getStringValue(item, ['ProductCode']),
    quantity: getNumberValue(item, ['Quantity'], 0),
    unitPrice: getNumberValue(item, ['UnitPrice'], 0),
    lineTotal: getNumberValue(item, ['LineTotal'], 0)
  }));
}

export async function upsertCartItem(options: {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  buyerName: string;
  buyerEmail: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
}): Promise<void> {
  const cartId: string = await ensureCartHeader(options.siteUrl, options.spHttpClient, options.buyerName, options.buyerEmail);
  const filterQuery: string =
    "CartId eq '" +
    escapeODataValue(cartId) +
    "' and ProductCode eq '" +
    escapeODataValue(options.productCode) +
    "'";
  const existingItem = await getCartDetailItemByFilter(options.siteUrl, options.spHttpClient, filterQuery);
  const nextQuantity: number = existingItem ? existingItem.quantity + options.quantity : options.quantity;
  const payload = {
    CartId: cartId,
    ProductCode: options.productCode,
    Quantity: nextQuantity,
    UnitPrice: options.unitPrice,
    LineTotal: nextQuantity * options.unitPrice
  };

  if (existingItem) {
    await updateListItemById(options.siteUrl, options.spHttpClient, CART_DETAIL_LIST_TITLE, existingItem.Id, payload);
    return;
  }

  await postListItem(options.siteUrl, options.spHttpClient, CART_DETAIL_LIST_TITLE, payload);
}

export async function removeCartItem(options: {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  buyerEmail: string;
  productCode: string;
}): Promise<void> {
  const cartId: string | undefined = await getCartIdByBuyerEmail(options.siteUrl, options.spHttpClient, options.buyerEmail);

  if (!cartId) {
    return;
  }

  const existingItem = await getListItemByFilter(
    options.siteUrl,
    options.spHttpClient,
    CART_DETAIL_LIST_TITLE,
    "CartId eq '" + escapeODataValue(cartId) + "' and ProductCode eq '" + escapeODataValue(options.productCode) + "'"
  );

  if (!existingItem) {
    return;
  }

  await deleteListItemById(options.siteUrl, options.spHttpClient, CART_DETAIL_LIST_TITLE, existingItem.Id);
}

export async function clearCartItems(options: {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  buyerEmail: string;
  productCodes: string[];
}): Promise<void> {
  await Promise.all(
    options.productCodes.map((productCode: string) =>
      removeCartItem({
        siteUrl: options.siteUrl,
        spHttpClient: options.spHttpClient,
        buyerEmail: options.buyerEmail,
        productCode
      })
    )
  );
}
