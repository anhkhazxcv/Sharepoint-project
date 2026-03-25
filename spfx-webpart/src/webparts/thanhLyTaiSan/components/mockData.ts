import type { IAssetItem } from './types';

function createPlaceholderImage(label: string, accent: string, background: string): string {
  const svg: string =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 220'>" +
    "<rect width='320' height='220' rx='16' fill='" + background + "'/>" +
    "<rect x='18' y='18' width='284' height='184' rx='14' fill='white' opacity='0.75'/>" +
    "<rect x='36' y='40' width='92' height='68' rx='12' fill='" + accent + "' opacity='0.18'/>" +
    "<rect x='146' y='48' width='120' height='16' rx='8' fill='" + accent + "' opacity='0.88'/>" +
    "<rect x='146' y='78' width='88' height='10' rx='5' fill='#64748b' opacity='0.45'/>" +
    "<rect x='36' y='138' width='230' height='10' rx='5' fill='#94a3b8' opacity='0.55'/>" +
    "<rect x='36' y='158' width='180' height='10' rx='5' fill='#cbd5e1' opacity='0.8'/>" +
    "<text x='36' y='190' font-family='Segoe UI, Arial' font-size='18' font-weight='700' fill='#1e293b'>" +
    label +
    '</text>' +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export const PURCHASE_LIMIT: number = 5;
export const USER_DISPLAY_NAME: string = 'Nguyễn Văn A';

export const MOCK_ASSETS: IAssetItem[] = [
  {
    id: 'asset-1',
    assetCode: 'TS001',
    assetName: 'Laptop Dell XPS 13',
    category: 'Laptop',
    condition: 'Mới',
    site: 'Hà Nội',
    totalQuantity: 5,
    availableQuantity: 3,
    price: 15000000,
    imageUrl: createPlaceholderImage('Dell XPS 13', '#1d4ed8', '#e8f0ff'),
    barcode: '893850100001',
    statusText: 'Còn hàng'
  },
  {
    id: 'asset-2',
    assetCode: 'TS002',
    assetName: 'Man hinh Dell 24 inch',
    category: 'Màn hình',
    condition: 'Mới',
    site: 'Hà Nội',
    totalQuantity: 8,
    availableQuantity: 5,
    price: 3000000,
    imageUrl: createPlaceholderImage('Dell 24"', '#0369a1', '#e4f5fb'),
    barcode: '893850100002',
    statusText: 'Còn hàng'
  },
  {
    id: 'asset-3',
    assetCode: 'TS003',
    assetName: 'Ghế xoay văn phòng',
    category: 'Nội thất',
    condition: 'Đã qua sử dụng',
    site: 'Hà Nội',
    totalQuantity: 12,
    availableQuantity: 7,
    price: 500000,
    imageUrl: createPlaceholderImage('Office Chair', '#0f766e', '#e5f7f2'),
    barcode: '893850100003',
    statusText: 'Còn hàng'
  },
  {
    id: 'asset-4',
    assetCode: 'TS004',
    assetName: 'Máy in HP Laser',
    category: 'Máy in',
    condition: 'Mới',
    site: 'HCM',
    totalQuantity: 3,
    availableQuantity: 2,
    price: 2500000,
    imageUrl: createPlaceholderImage('HP Laser', '#b45309', '#fff2df'),
    barcode: '893850100004',
    statusText: 'Còn hàng'
  },
  {
    id: 'asset-5',
    assetCode: 'TS005',
    assetName: 'Bàn họp nhóm 6 chỗ',
    category: 'Nội thất',
    condition: 'Đã qua sử dụng',
    site: 'Đà Nẵng',
    totalQuantity: 2,
    availableQuantity: 1,
    price: 1800000,
    imageUrl: createPlaceholderImage('Meeting Table', '#7c3aed', '#f0eaff'),
    barcode: '893850100005',
    statusText: 'Còn hàng'
  },
  {
    id: 'asset-6',
    assetCode: 'TS006',
    assetName: 'iPhone 12 64GB',
    category: 'Điện thoại',
    condition: 'Đã qua sử dụng',
    site: 'HCM',
    totalQuantity: 4,
    availableQuantity: 0,
    price: 6200000,
    imageUrl: createPlaceholderImage('iPhone 12', '#be123c', '#fde7ef'),
    barcode: '893850100006',
    statusText: 'Hết hàng'
  },
  {
    id: 'asset-7',
    assetCode: 'TS007',
    assetName: 'Laptop Lenovo ThinkPad E14',
    category: 'Laptop',
    condition: 'Đã qua sử dụng',
    site: 'HCM',
    totalQuantity: 6,
    availableQuantity: 4,
    price: 9800000,
    imageUrl: createPlaceholderImage('ThinkPad E14', '#111827', '#f1f5f9'),
    barcode: '893850100007',
    statusText: 'Còn hàng'
  },
  {
    id: 'asset-8',
    assetCode: 'TS008',
    assetName: 'Máy quét mã vạch Zebra DS2208',
    category: 'Thiết bị',
    condition: 'Mới',
    site: 'Hà Nội',
    totalQuantity: 10,
    availableQuantity: 6,
    price: 1200000,
    imageUrl: createPlaceholderImage('Barcode Scanner', '#4338ca', '#e9ebff'),
    barcode: '893850100008',
    statusText: 'Còn hàng'
  },
  {
    id: 'asset-9',
    assetCode: 'TS009',
    assetName: 'Tủ hồ sơ sắt 4 ngăn',
    category: 'Nội thất',
    condition: 'Đã qua sử dụng',
    site: 'Hà Nội',
    totalQuantity: 3,
    availableQuantity: 0,
    price: 900000,
    imageUrl: createPlaceholderImage('Cabinet 4N', '#475569', '#eef2f7'),
    barcode: '893850100009',
    statusText: 'Hết hàng'
  },
  {
    id: 'asset-10',
    assetCode: 'TS010',
    assetName: 'Docking station Dell WD19',
    category: 'Phụ kiện',
    condition: 'Mới',
    site: 'Đà Nẵng',
    totalQuantity: 7,
    availableQuantity: 5,
    price: 2100000,
    imageUrl: createPlaceholderImage('Dell WD19', '#0f766e', '#e2faf4'),
    barcode: '893850100010',
    statusText: 'Còn hàng'
  }
];
