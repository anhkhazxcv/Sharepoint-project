import type { IOrderDetail } from '../orderDetail/types';
import { sendOrderNotificationEmail } from './notificationService';

describe('notificationService.sendOrderNotificationEmail', () => {
  it('sends XacNhanThanhToan payload with order datetime and products', async () => {
    const fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit | undefined]> = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('')
    } as unknown as Response);
    const originalFetch: typeof fetch | undefined = globalThis.fetch;
    const orderDetail: IOrderDetail = {
      orderId: 'ORD-001',
      orderCode: 'ORD-001',
      buyerName: 'Nguyen Van A',
      buyerEmail: 'user@example.com',
      purchaseDate: '2026-04-15T07:08:09',
      totalAmount: 3000000,
      currentStep: 'Thanh toán',
      paymentStatus: 'Chờ xác nhận',
      handoverStatus: 'Chưa bàn giao',
      bankAccount: {
        bankName: 'Techcombank',
        accountName: 'MAG',
        accountNumber: '123456789',
        logoUrl: ''
      },
      paymentQr: {
        qrImageUrl: '',
        transferContent: 'ORD-001',
        amount: 3000000
      },
      items: [
        {
          id: '1',
          assetId: 'A1',
          assetCode: 'TS001',
          assetName: 'Laptop Dell',
          condition: 'Tốt',
          site: 'Hà Nội',
          quantity: 2,
          unitPrice: 1500000,
          amount: 3000000,
          imageUrl: '',
          barcode: '123'
        }
      ]
    };

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await sendOrderNotificationEmail('user@example.com', 'XacNhanThanhToan', orderDetail);
    } finally {
      globalThis.fetch = originalFetch as typeof fetch;
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST'
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      recipient: 'user@example.com',
      type: 'XacNhanThanhToan',
      order: {
        orderCode: 'ORD-001',
        orderDateTime: '15/04/2026 07:08:09',
        totalAmount: 3000000
      },
      products: [
        {
          productName: 'Laptop Dell',
          variant: 'Tốt',
          quantity: 2,
          price: 1500000
        }
      ]
    });
  });

  it('sends XacNhanBanGiao payload with the same API schema', async () => {
    const fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit | undefined]> = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('')
    } as unknown as Response);
    const originalFetch: typeof fetch | undefined = globalThis.fetch;
    const orderDetail: IOrderDetail = {
      orderId: 'ORD-002',
      orderCode: 'ORD-002',
      buyerName: 'Tran Thi B',
      buyerEmail: 'user2@example.com',
      purchaseDate: '2026-04-15T09:10:11',
      totalAmount: 5000000,
      currentStep: 'Bàn giao',
      paymentStatus: 'Đã thanh toán',
      handoverStatus: 'Chờ bàn giao',
      bankAccount: {
        bankName: 'Techcombank',
        accountName: 'MAG',
        accountNumber: '123456789',
        logoUrl: ''
      },
      paymentQr: {
        qrImageUrl: '',
        transferContent: 'ORD-002',
        amount: 5000000
      },
      items: [
        {
          id: '2',
          assetId: 'A2',
          assetCode: 'TS002',
          assetName: 'Màn hình Dell',
          condition: 'Tốt',
          site: 'Hà Nội',
          quantity: 1,
          unitPrice: 5000000,
          amount: 5000000,
          imageUrl: '',
          barcode: '456'
        }
      ]
    };

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await sendOrderNotificationEmail('user2@example.com', 'XacNhanBanGiao', orderDetail);
    } finally {
      globalThis.fetch = originalFetch as typeof fetch;
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      recipient: 'user2@example.com',
      type: 'XacNhanBanGiao',
      order: {
        orderCode: 'ORD-002',
        orderDateTime: '15/04/2026 09:10:11',
        totalAmount: 5000000
      },
      products: [
        {
          productName: 'Màn hình Dell',
          variant: 'Tốt',
          quantity: 1,
          price: 5000000
        }
      ]
    });
  });
});
