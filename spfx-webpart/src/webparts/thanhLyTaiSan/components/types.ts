export interface IAssetItem {
  id: string;
  assetCode: string;
  assetName: string;
  category: string;
  condition: string;
  site: string;
  totalQuantity: number;
  availableQuantity: number;
  price: number;
  imageUrl: string;
  barcode: string;
  statusText: string;
}

export interface IAssetFilters {
  category: string;
  condition: string;
  site: string;
}

export interface IPurchasePayload {
  asset: IAssetItem;
  quantity: number;
}
