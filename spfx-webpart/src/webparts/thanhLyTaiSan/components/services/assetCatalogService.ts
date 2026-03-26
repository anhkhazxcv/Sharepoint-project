import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import type { IAssetItem } from '../types';

const IMAGE_LIBRARY_TITLE: string = 'TaiSanImage';

export interface IAssetCatalogServiceOptions {
  siteUrl: string;
  listTitle: string;
  spHttpClient: SPHttpClient;
}

type TSharePointItem = Record<string, unknown>;

function getStringValue(item: TSharePointItem, candidates: string[], fallback: string = ''): string {
  for (var index: number = 0; index < candidates.length; index += 1) {
    var candidate: string = candidates[index];
    var value: unknown = item[candidate];

    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return fallback;
}

function getNumberValue(item: TSharePointItem, candidates: string[], fallback: number = 0): number {
  for (var index: number = 0; index < candidates.length; index += 1) {
    var candidate: string = candidates[index];
    var value: unknown = item[candidate];

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      var parsedValue: number = Number(value);

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

function buildImageUrl(siteUrl: string, item: TSharePointItem): string {
  const rawImageValue: string = getStringValue(item, ['ImageName', 'Image', 'ImageUrl', 'Picture', 'FileRef']);
  const normalizedSiteUrl: string = siteUrl.replace(/\/$/, '');
  let fileUrl: string = '';

  if (!rawImageValue) {
    return '';
  }

  if (/^https?:\/\//i.test(rawImageValue)) {
    fileUrl = rawImageValue;
  } else if (rawImageValue.charAt(0) === '/') {
    fileUrl = normalizedSiteUrl + rawImageValue;
  } else if (rawImageValue.indexOf('/') >= 0) {
    fileUrl = normalizedSiteUrl + '/' + rawImageValue.replace(/^\//, '');
  } else {
    fileUrl =
      normalizedSiteUrl +
      '/' +
      IMAGE_LIBRARY_TITLE +
      '/' +
      encodeURIComponent(rawImageValue);
  }

  return normalizedSiteUrl + '/_layouts/15/getpreview.ashx?path=' + encodeURIComponent(fileUrl) + '&resolution=0';
}

function mapItemToAsset(item: TSharePointItem, siteUrl: string): IAssetItem {
  const stock: number = getNumberValue(item, ['Stock', 'SoLuong', 'AvailableQuantity'], 0);

  return {
    id: String(getItemId(item) || getStringValue(item, ['Code', 'Barcode', 'Title'], '0')),
    assetCode: getStringValue(item, ['Code', 'AssetCode', 'MaTS', 'Title'], 'N/A'),
    assetName: getStringValue(item, ['Name', 'Title', 'AssetName', 'TenTS'], 'Chua co ten tai san'),
    category: getStringValue(item, ['Category', 'DanhMuc'], 'Khac'),
    condition: getStringValue(item, ['Condition', 'TinhTrang'], 'Chua cap nhat'),
    site: getStringValue(item, ['Site', 'Location'], 'Chua cap nhat'),
    totalQuantity: stock,
    availableQuantity: stock,
    price: getNumberValue(item, ['Price', 'GiaBan'], 0),
    imageUrl: buildImageUrl(siteUrl, item),
    barcode: getStringValue(item, ['Barcode', 'BarCode', 'MaVach'], ''),
    statusText: stock > 0 ? 'Con hang' : 'Het hang'
  };
}

export async function getAssetsFromSharePoint(options: IAssetCatalogServiceOptions): Promise<IAssetItem[]> {
  var requestUrl: string =
    options.siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(options.listTitle) +
    "')/items?$top=5000";
  var response: SPHttpClientResponse = await options.spHttpClient.get(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=none'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Khong the tai du lieu danh muc tai san tu SharePoint.');
  }

  const json: { value?: TSharePointItem[] } = (await response.json()) as { value?: TSharePointItem[] };
  const items: TSharePointItem[] = Array.isArray(json.value) ? json.value : [];
  const mappedItems: IAssetItem[] = items.map(function (item: TSharePointItem): IAssetItem {
    return mapItemToAsset(item, options.siteUrl);
  });

  // eslint-disable-next-line no-console
  console.log('SharePoint lstDanhMucTaiSan raw items:', items);
  // eslint-disable-next-line no-console
  console.log('SharePoint lstDanhMucTaiSan mapped assets:', mappedItems);

  return mappedItems;
}
