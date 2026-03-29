import type { IOrderDetail } from './types';
import type { IAssetItem, ICartItem } from '../types';
import techcombankLogo from '../../assets/techcombank-1.png';

function createAssetImage(label: string, accent: string, background: string): string {
  const svg: string =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" +
    "<rect width='120' height='120' rx='14' fill='" + background + "'/>" +
    "<rect x='12' y='12' width='96' height='96' rx='12' fill='white' opacity='0.84'/>" +
    "<rect x='24' y='28' width='34' height='34' rx='8' fill='" + accent + "' opacity='0.2'/>" +
    "<rect x='66' y='32' width='28' height='8' rx='4' fill='" + accent + "' opacity='0.85'/>" +
    "<rect x='66' y='48' width='20' height='6' rx='3' fill='#64748b' opacity='0.65'/>" +
    "<rect x='24' y='74' width='68' height='6' rx='3' fill='#94a3b8' opacity='0.6'/>" +
    "<text x='24' y='97' font-family='Segoe UI, Arial' font-size='11' font-weight='700' fill='#1e293b'>" +
    label +
    '</text>' +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function createQrPlaceholder(): string {
  const svg: string =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 220'>" +
    "<rect width='220' height='220' rx='18' fill='white'/>" +
    "<rect x='16' y='16' width='188' height='188' rx='8' fill='#f8fafc' stroke='#d6dee8'/>" +
    "<rect x='30' y='30' width='42' height='42' fill='#111827'/>" +
    "<rect x='38' y='38' width='26' height='26' fill='white'/>" +
    "<rect x='46' y='46' width='10' height='10' fill='#111827'/>" +
    "<rect x='148' y='30' width='42' height='42' fill='#111827'/>" +
    "<rect x='156' y='38' width='26' height='26' fill='white'/>" +
    "<rect x='164' y='46' width='10' height='10' fill='#111827'/>" +
    "<rect x='30' y='148' width='42' height='42' fill='#111827'/>" +
    "<rect x='38' y='156' width='26' height='26' fill='white'/>" +
    "<rect x='46' y='164' width='10' height='10' fill='#111827'/>" +
    "<rect x='96' y='32' width='10' height='10' fill='#111827'/>" +
    "<rect x='110' y='32' width='10' height='10' fill='#111827'/>" +
    "<rect x='96' y='48' width='24' height='10' fill='#111827'/>" +
    "<rect x='92' y='80' width='12' height='12' fill='#111827'/>" +
    "<rect x='112' y='80' width='28' height='12' fill='#111827'/>" +
    "<rect x='80' y='102' width='12' height='12' fill='#111827'/>" +
    "<rect x='102' y='102' width='12' height='12' fill='#111827'/>" +
    "<rect x='124' y='102' width='12' height='12' fill='#111827'/>" +
    "<rect x='146' y='102' width='12' height='12' fill='#111827'/>" +
    "<rect x='90' y='126' width='52' height='12' fill='#111827'/>" +
    "<rect x='92' y='150' width='12' height='12' fill='#111827'/>" +
    "<rect x='116' y='150' width='12' height='12' fill='#111827'/>" +
    "<rect x='140' y='150' width='12' height='12' fill='#111827'/>" +
    "<rect x='92' y='174' width='34' height='12' fill='#111827'/>" +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function sanitizeBuyerName(buyerName: string): string {
  return (buyerName || 'CBNV').replace(/\s+/g, '').slice(0, 24);
}

function padTwoDigits(value: number): string {
  return value < 10 ? '0' + String(value) : String(value);
}

export const mockOrderDetail: IOrderDetail = {
  orderId: '100000000001',
  orderCode: '100000000001',
  buyerName: 'Nguyen Van A',
  purchaseDate: '2024-11-12T08:30:00',
  totalAmount: 21000000,
  currentStep: 'Thanh toán',
  paymentStatus: 'Chờ xác nhận',
  handoverStatus: 'Chưa bàn giao',
  bankAccount: {
    bankName: 'Vietcombank',
    accountName: 'BÁN HÀNG',
    accountNumber: '891260009',
    logoUrl: techcombankLogo
  },
  paymentQr: {
    qrImageUrl: createQrPlaceholder(),
    transferContent: 'TT 100000000001 NguyenVanA',
    amount: 21000000
  },
  items: [
    {
      id: '10000000000101',
      assetId: '1',
      assetCode: 'TS001',
      assetName: 'Laptop Dell XPS 13',
      condition: 'Mới',
      site: 'Hà Nội',
      quantity: 1,
      unitPrice: 15000000,
      amount: 15000000,
      imageUrl: createAssetImage('Dell XPS', '#1d4ed8', '#e7f0ff'),
      barcode: '893850100001'
    },
    {
      id: '10000000000102',
      assetId: '2',
      assetCode: 'TS002',
      assetName: 'Màn hình Dell 24"',
      condition: 'Tốt',
      site: 'Hà Nội',
      quantity: 1,
      unitPrice: 6000000,
      amount: 6000000,
      imageUrl: createAssetImage('Dell 24', '#0f766e', '#e6fffa'),
      barcode: '893850100002'
    }
  ]
};

export function createOrderDetailFromCartItems(
  items: ICartItem[],
  buyerName: string,
  orderId: string
): IOrderDetail {
  const now: Date = new Date();
  const totalAmount: number = items.reduce((sum: number, item: ICartItem) => sum + item.lineTotal, 0);
  const compactBuyerName: string = sanitizeBuyerName(buyerName);

  return {
    orderId,
    orderCode: orderId,
    buyerName,
    purchaseDate: now.toISOString(),
    totalAmount,
    currentStep: 'Thanh toán',
    paymentStatus: 'Chờ xác nhận',
    handoverStatus: 'Chưa bàn giao',
    bankAccount: {
      bankName: 'Vietcombank',
      accountName: 'BÁN HÀNG',
      accountNumber: '891260009',
      logoUrl: techcombankLogo
    },
    paymentQr: {
      qrImageUrl: createQrPlaceholder(),
      transferContent: 'TT ' + orderId + ' ' + compactBuyerName,
      amount: totalAmount
    },
    items: items.map((item: ICartItem, index: number) => ({
      id: orderId + padTwoDigits(index + 1),
      assetId: item.assetId,
      assetCode: item.productCode,
      assetName: item.assetName,
      condition: item.condition,
      site: item.site,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.lineTotal,
      imageUrl: item.imageUrl,
      barcode: item.barcode
    }))
  };
}

export function createOrderDetailFromPurchase(
  asset: IAssetItem,
  quantity: number,
  buyerName: string,
  orderId: string
): IOrderDetail {
  return createOrderDetailFromCartItems(
    [
      {
        productCode: asset.assetCode,
        assetId: asset.id,
        assetName: asset.assetName,
        category: asset.category,
        condition: asset.condition,
        site: asset.site,
        quantity,
        unitPrice: asset.price,
        lineTotal: asset.price * quantity,
        imageUrl: asset.imageUrl,
        barcode: asset.barcode,
        availableQuantity: asset.availableQuantity
      }
    ],
    buyerName,
    orderId
  );
}
