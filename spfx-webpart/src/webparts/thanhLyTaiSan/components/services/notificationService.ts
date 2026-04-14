import type { IOrderDetail, IOrderItem } from '../orderDetail/types';

const PAYMENT_CONFIRMATION_EMAIL_API_URL: string =
  'https://426221773f60ec2ab33952ef50ccbb.93.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/512078babbc04cf7a4817b0325bec10c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=hjjqE63u2asrbHOdE62Q9igyIrow_h3EuX186BJMxeI';

interface INotificationOrderPayload {
  orderCode: string;
  orderDateTime: string;
  totalAmount: number;
}

interface INotificationProductPayload {
  productName: string;
  variant: string;
  quantity: number;
  price: number;
}

export type TNotificationEmailType = 'XacNhanThanhToan' | 'XacNhanBanGiao';

interface IPaymentConfirmationEmailPayload {
  recipient: string;
  type: TNotificationEmailType;
  order: INotificationOrderPayload;
  products: INotificationProductPayload[];
}

function padTwoDigits(value: number): string {
  return value < 10 ? '0' + String(value) : String(value);
}

function formatOrderDateTime(value: string): string {
  const date: Date = new Date(value);

  if (isNaN(date.getTime())) {
    return value;
  }

  const day: string = padTwoDigits(date.getDate());
  const month: string = padTwoDigits(date.getMonth() + 1);
  const year: number = date.getFullYear();
  const hours: string = padTwoDigits(date.getHours());
  const minutes: string = padTwoDigits(date.getMinutes());
  const seconds: string = padTwoDigits(date.getSeconds());

  return day + '/' + month + '/' + String(year) + ' ' + hours + ':' + minutes + ':' + seconds;
}

function buildNotificationEmailPayload(
  recipient: string,
  type: TNotificationEmailType,
  orderDetail: IOrderDetail
): IPaymentConfirmationEmailPayload {
  return {
    recipient,
    type,
    order: {
      orderCode: orderDetail.orderCode,
      orderDateTime: formatOrderDateTime(orderDetail.purchaseDate),
      totalAmount: orderDetail.totalAmount
    },
    products: orderDetail.items.map((item: IOrderItem): INotificationProductPayload => ({
      productName: item.assetName,
      variant: item.condition || '',
      quantity: item.quantity,
      price: item.unitPrice
    }))
  };
}

export async function sendOrderNotificationEmail(
  recipient: string,
  type: TNotificationEmailType,
  orderDetail: IOrderDetail
): Promise<void> {
  const normalizedRecipient: string = recipient.trim();

  if (!normalizedRecipient) {
    throw new Error('Thiếu email người nhận để gửi thông báo đơn hàng.');
  }

  const response: Response = await fetch(PAYMENT_CONFIRMATION_EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildNotificationEmailPayload(normalizedRecipient, type, orderDetail))
  });

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error('Không thể gửi email thông báo đơn hàng. Response: ' + errorText);
  }
}
