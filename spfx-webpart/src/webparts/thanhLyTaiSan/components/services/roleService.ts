import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

const ROLE_LIST_TITLE: string = 'Role';

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

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

export async function isUserAdmin(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  userEmail: string
): Promise<boolean> {
  if (!userEmail) {
    return false;
  }

  const normalizedEmail: string = userEmail.trim().toLowerCase();
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(ROLE_LIST_TITLE) +
    "')/items?$top=1&$select=Role,EmailUser&$filter=" +
    encodeURIComponent("EmailUser eq '" + escapeODataValue(normalizedEmail) + "'");

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
    throw new Error('Không thể đọc dữ liệu từ SharePoint list ' + ROLE_LIST_TITLE + '. Response: ' + errorText);
  }

  const json: { value?: TSharePointItem[] } = (await response.json()) as { value?: TSharePointItem[] };
  const items: TSharePointItem[] = Array.isArray(json.value) ? json.value : [];

  if (!items.length) {
    return false;
  }

  return getStringValue(items[0], ['Role']).toLowerCase() === 'admin';
}
