export interface ICatalogAssetRow {
  id: string;
  assetCode: string;
  barcode: string;
  name: string;
  stockQuantity: number;
  imageUrl: string;
  condition: string;
  site: string;
  salePrice: number;
  canPurchase: boolean;
}
