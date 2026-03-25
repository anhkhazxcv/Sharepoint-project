export type TProcessStep = 'Đăng ký' | 'Thanh toán' | 'Bàn giao' | 'Hoàn tất';

export interface IOrderItem {
  id: string;
  assetCode: string;
  assetName: string;
  condition: string;
  site: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  imageUrl: string;
  barcode: string;
}

export interface IBankAccountInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  logoUrl: string;
}

export interface IPaymentQrInfo {
  qrImageUrl: string;
  transferContent: string;
  amount: number;
}

export interface IOrderDetail {
  orderId: string;
  orderCode: string;
  buyerName: string;
  purchaseDate: string;
  totalAmount: number;
  currentStep: TProcessStep;
  paymentStatus: string;
  handoverStatus: string;
  bankAccount: IBankAccountInfo;
  paymentQr: IPaymentQrInfo;
  items: IOrderItem[];
}
