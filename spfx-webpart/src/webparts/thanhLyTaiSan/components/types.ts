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

export interface ICartItem {
  productCode: string;
  assetId: string;
  assetName: string;
  category: string;
  condition: string;
  site: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string;
  barcode: string;
  availableQuantity: number;
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
