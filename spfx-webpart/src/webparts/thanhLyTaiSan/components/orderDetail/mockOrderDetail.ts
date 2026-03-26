import type { IOrderDetail } from './types';
import type { IAssetItem } from '../types';

function createAssetImage(label: string, accent: string, background: string): string {
  var svg: string =
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

function createBankLogo(bankName: string): string {
  var svg: string =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 92 92'>" +
    "<rect width='92' height='92' rx='18' fill='#e7f0fb'/>" +
    "<rect x='14' y='18' width='64' height='52' rx='12' fill='#0f4c81'/>" +
    "<rect x='26' y='32' width='40' height='8' rx='4' fill='white' opacity='0.95'/>" +
    "<rect x='26' y='48' width='28' height='6' rx='3' fill='white' opacity='0.7'/>" +
    "<text x='16' y='82' font-family='Segoe UI, Arial' font-size='11' font-weight='700' fill='#0f2f57'>" +
    bankName +
    '</text>' +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function createQrPlaceholder(): string {
  var svg: string =
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

export var mockOrderDetail: IOrderDetail = {
  orderId: 'order-1',
  orderCode: 'DH-2024-0001',
  buyerName: 'Nguyen Van A',
  purchaseDate: '2024-11-12T08:30:00',
  totalAmount: 21000000,
  currentStep: 'Thanh toán',
  paymentStatus: 'Cho xac nhan',
  handoverStatus: 'Chua ban giao',
  bankAccount: {
    bankName: 'Vietcombank',
    accountName: 'BANH HAN',
    accountNumber: '891260009',
    logoUrl: createBankLogo('VCB')
  },
  paymentQr: {
    qrImageUrl: createQrPlaceholder(),
    transferContent: 'TT DH-2024-0001 NguyenVanA',
    amount: 21000000
  },
  items: [
    {
      id: 'item-1',
      assetId: '1',
      assetCode: 'TS001',
      assetName: 'Laptop Dell XPS 13',
      condition: 'Moi',
      site: 'Ha Noi',
      quantity: 1,
      unitPrice: 15000000,
      amount: 15000000,
      imageUrl: createAssetImage('Dell XPS', '#1d4ed8', '#e7f0ff'),
      barcode: '893850100001'
    }
  ]
};

export function createOrderDetailFromPurchase(asset: IAssetItem, quantity: number, buyerName: string, orderIndex: number): IOrderDetail {
  var now: Date = new Date();
  var orderCode: string = 'DH-2024-' + ('000' + String(orderIndex)).slice(-4);
  var amount: number = asset.price * quantity;

  return {
    orderId: 'order-' + String(orderIndex),
    orderCode: orderCode,
    buyerName: buyerName,
    purchaseDate: now.toISOString(),
    totalAmount: amount,
    currentStep: 'Thanh toán',
    paymentStatus: 'Cho xac nhan',
    handoverStatus: 'Chua ban giao',
    bankAccount: {
      bankName: 'Vietcombank',
      accountName: 'BANH HAN',
      accountNumber: '891260009',
      logoUrl: createBankLogo('VCB')
    },
    paymentQr: {
      qrImageUrl: createQrPlaceholder(),
      transferContent: 'TT ' + orderCode + ' ' + buyerName.replace(/\s+/g, ''),
      amount: amount
    },
    items: [
      {
        id: 'item-' + String(orderIndex) + '-1',
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        condition: asset.condition,
        site: asset.site,
        quantity: quantity,
        unitPrice: asset.price,
        amount: amount,
        imageUrl: asset.imageUrl,
        barcode: asset.barcode
      }
    ]
  };
}
