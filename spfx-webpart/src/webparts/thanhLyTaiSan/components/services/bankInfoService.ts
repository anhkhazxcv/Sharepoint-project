import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

const BANK_INFO_LIST_TITLE: string = 'lstThongTinNganHang';
const DEFAULT_QR_BANK_SLUG: string = 'techcombank';

export interface IBankInfoRecord {
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrBankSlug: string;
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

export function buildVietQrImageUrl(bankSlug: string, accountNumber: string): string {
  if (!accountNumber) {
    return '';
  }

  return 'https://img.vietqr.io/image/' + bankSlug + '-' + accountNumber + '-compact2.png';
}

export async function getBankInfoFromSharePoint(
  siteUrl: string,
  spHttpClient: SPHttpClient
): Promise<IBankInfoRecord | null> {
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(BANK_INFO_LIST_TITLE) +
    "')/items?$top=1&$select=NameBank,NamePeople,STK";
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
    throw new Error('Khong the doc du lieu tu SharePoint list ' + BANK_INFO_LIST_TITLE + '. Response: ' + errorText);
  }

  const json: { value?: TSharePointItem[] } = (await response.json()) as { value?: TSharePointItem[] };
  const items: TSharePointItem[] = Array.isArray(json.value) ? json.value : [];

  if (!items.length) {
    return null;
  }

  return {
    bankName: getStringValue(items[0], ['NameBank'], 'Techcombank'),
    accountName: getStringValue(items[0], ['NamePeople'], 'Chua cap nhat'),
    accountNumber: getStringValue(items[0], ['STK'], ''),
    qrBankSlug: DEFAULT_QR_BANK_SLUG
  };
}
