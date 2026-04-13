import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import type { IAssetItem } from '../types';

const IMAGE_LIBRARY_TITLE: string = 'TaiSanImage';

export interface IAssetCatalogServiceOptions {
  siteUrl: string;
  listTitle: string;
  spHttpClient: SPHttpClient;
}

export interface IAssetByProductCodeOptions extends IAssetCatalogServiceOptions {
  productCode: string;
}

type TSharePointItem = Record<string, unknown>;

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
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

function getItemId(item: TSharePointItem): number {
  return getNumberValue(item, ['Id', 'ID'], 0);
}

function getImageSourceValue(item: TSharePointItem): string {
  const directPathValue: string = getStringValue(item, ['FileRef', 'ImageUrl', 'Picture', 'Image']);

  if (directPathValue) {
    return directPathValue;
  }

  return getStringValue(item, ['ImageName']);
}

function joinUrlSegments(segments: string[]): string {
  return segments
    .filter(function (segment: string): boolean {
      return segment.trim() !== '';
    })
    .map(function (segment: string, index: number): string {
      if (index === 0) {
        return segment.replace(/\/$/, '');
      }

      return segment.replace(/^\/+|\/+$/g, '');
    })
    .join('/');
}

function buildImageUrl(siteUrl: string, item: TSharePointItem): string {
  const rawImageValue: string = getImageSourceValue(item);
  const normalizedSiteUrl: string = siteUrl.replace(/\/$/, '');
  let fileUrl: string = '';

  if (!rawImageValue) {
    return '';
  }

  let parsedSiteUrl: URL;

  try {
    parsedSiteUrl = new URL(normalizedSiteUrl);
  } catch {
    return '';
  }

  const siteOrigin: string = parsedSiteUrl.origin;
  const sitePath: string = parsedSiteUrl.pathname.replace(/\/$/, '');
  const previewBaseUrl: string = joinUrlSegments([siteOrigin, sitePath, '_layouts/15/getpreview.ashx']);

  if (/^https?:\/\//i.test(rawImageValue)) {
    fileUrl = rawImageValue;
  } else if (rawImageValue.charAt(0) === '/') {
    fileUrl = siteOrigin + rawImageValue;
  } else if (rawImageValue.indexOf('/') >= 0) {
    fileUrl = joinUrlSegments([siteOrigin, sitePath, rawImageValue]);
  } else {
    fileUrl = joinUrlSegments([siteOrigin, sitePath, IMAGE_LIBRARY_TITLE, rawImageValue]);
  }

  return previewBaseUrl + '?path=' + encodeURIComponent(fileUrl) + '&resolution=0';
}

function mapItemToAsset(item: TSharePointItem, siteUrl: string): IAssetItem {
  const stock: number = getNumberValue(item, ['Stock'], 0);
  const productCode: string = getStringValue(item, ['ProductCode'], 'N/A');
  const productName: string = getStringValue(item, ['ProductName'], 'Chưa có tên sản phẩm');

  return {
    id: String(getItemId(item) || productCode || '0'),
    assetCode: productCode,
    assetName: productName,
    category: getStringValue(item, ['Category'], 'Khác'),
    condition: getStringValue(item, ['Condition'], 'Chưa cập nhật'),
    site: getStringValue(item, ['Site'], 'Chưa cập nhật'),
    totalQuantity: stock,
    availableQuantity: stock,
    price: getNumberValue(item, ['Price'], 0),
    imageUrl: buildImageUrl(siteUrl, item),
    barcode: getStringValue(item, ['Barcode'], ''),
    statusText: stock > 0 ? 'Còn hàng' : 'Hết hàng'
  };
}

export async function getAssetsFromSharePoint(options: IAssetCatalogServiceOptions): Promise<IAssetItem[]> {
  const requestUrl: string =
    options.siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(options.listTitle) +
    "')/items?$top=5000";
  const response: SPHttpClientResponse = await options.spHttpClient.get(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=none'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Không thể tải dữ liệu danh mục tài sản từ SharePoint.');
  }

  const json: { value?: TSharePointItem[] } = (await response.json()) as { value?: TSharePointItem[] };
  const items: TSharePointItem[] = Array.isArray(json.value) ? json.value : [];
  const mappedItems: IAssetItem[] = items.map(function (item: TSharePointItem): IAssetItem {
    return mapItemToAsset(item, options.siteUrl);
  });

  // eslint-disable-next-line no-console
  console.log('SharePoint lstSanPham raw items:', items);
  // eslint-disable-next-line no-console
  console.log('SharePoint lstSanPham mapped assets:', mappedItems);

  return mappedItems;
}

export async function getAssetByProductCodeFromSharePoint(options: IAssetByProductCodeOptions): Promise<IAssetItem | undefined> {
  const requestUrl: string =
    options.siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(options.listTitle) +
    "')/items?$top=1&$filter=" +
    encodeURIComponent("ProductCode eq '" + escapeODataValue(options.productCode) + "'");
  const response: SPHttpClientResponse = await options.spHttpClient.get(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=none'
      }
    }
  );

  if (!response.ok) {
    throw new Error('KhÃ´ng thá»ƒ táº£i tá»“n kho má»›i nháº¥t cá»§a sáº£n pháº©m tá»« SharePoint.');
  }

  const json: { value?: TSharePointItem[] } = (await response.json()) as { value?: TSharePointItem[] };
  const items: TSharePointItem[] = Array.isArray(json.value) ? json.value : [];

  if (!items.length) {
    return undefined;
  }

  return mapItemToAsset(items[0], options.siteUrl);
}
