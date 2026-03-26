import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { AssetLiquidationPage } from './AssetLiquidationPage';
import { OrderDetailPage } from './orderDetail/OrderDetailPage';
import { OrderListPage } from './orderDetail/OrderListPage';
import type { IOrderDetail, IOrderItem } from './orderDetail/types';
import type { IAssetItem } from './types';
import { createPaymentHistoryItem, updateAssetStock, updateTransactionStatus } from './services/orderTransactionService';
import styles from './OrderWorkspace.module.scss';

export interface IOrderWorkspaceProps {
  userDisplayName: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
}

type TWorkspaceTab = 'register' | 'orders';

export function OrderWorkspace(props: IOrderWorkspaceProps): React.ReactElement {
  var [activeTab, setActiveTab] = React.useState<TWorkspaceTab>('register');
  var [orders, setOrders] = React.useState<IOrderDetail[]>([]);
  var [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  var [assets, setAssets] = React.useState<IAssetItem[]>([]);

  var handleAssetsLoaded = React.useCallback(function (items: IAssetItem[]): void {
    setAssets(items);
  }, []);

  function handlePurchaseSuccess(orderDetail: IOrderDetail): void {
    setOrders(function (prevOrders: IOrderDetail[]): IOrderDetail[] {
      return [orderDetail].concat(prevOrders);
    });
    setSelectedOrderId(orderDetail.orderId);
    setActiveTab('orders');
  }

  function getOrderById(orderId: string): IOrderDetail | null {
    var matchedOrder: IOrderDetail | null = null;

    orders.forEach(function (order: IOrderDetail): void {
      if (order.orderId === orderId) {
        matchedOrder = order;
      }
    });

    return matchedOrder;
  }

  function updateOrder(orderId: string, updater: (order: IOrderDetail) => IOrderDetail): void {
    setOrders(function (prevOrders: IOrderDetail[]): IOrderDetail[] {
      return prevOrders.map(function (order: IOrderDetail): IOrderDetail {
        return order.orderId === orderId ? updater(order) : order;
      });
    });
  }

  function handleConfirmPayment(orderId: string): void {
    var targetOrder: IOrderDetail | null = getOrderById(orderId);
    var firstItem: IOrderItem | null = targetOrder && targetOrder.items.length ? targetOrder.items[0] : null;
    var foundAsset: IAssetItem | null = null;

    if (!targetOrder || !firstItem) {
      return;
    }

    var confirmedOrder: IOrderDetail = targetOrder;
    var confirmedItem: IOrderItem = firstItem;

    assets.forEach(function (asset: IAssetItem): void {
      if (asset.id === confirmedItem.assetId) {
        foundAsset = asset;
      }
    });

    if (!foundAsset) {
      window.alert('Khong tim thay tai san de tru ton.');
      return;
    }

    var confirmedAsset: IAssetItem = foundAsset;
    var nextStock: number = confirmedAsset.availableQuantity - confirmedItem.quantity;

    if (nextStock < 0) {
      window.alert('So luong ton hien tai khong du de xac nhan thanh toan.');
      return;
    }

    createPaymentHistoryItem({
      spHttpClient: props.spHttpClient,
      transferContent: confirmedOrder.paymentQr.transferContent,
      paymentConfirmedAt: new Date().toISOString()
    })
      .then(function (): Promise<void> {
        return updateTransactionStatus({
          spHttpClient: props.spHttpClient,
          orderId: confirmedOrder.orderCode,
          status: 'Đã thanh toán'
        });
      })
      .then(function (): Promise<void> {
        return updateAssetStock({
          spHttpClient: props.spHttpClient,
          assetItemId: confirmedAsset.id,
          nextStock: nextStock
        });
      })
      .then(function (): void {
        setAssets(function (prevAssets: IAssetItem[]): IAssetItem[] {
          return prevAssets.map(function (asset: IAssetItem): IAssetItem {
            if (asset.id !== confirmedAsset.id) {
              return asset;
            }

            return {
              ...asset,
              totalQuantity: nextStock,
              availableQuantity: nextStock,
              statusText: nextStock > 0 ? 'Con hang' : 'Het hang'
            };
          });
        });

        updateOrder(orderId, function (order: IOrderDetail): IOrderDetail {
          return {
            ...order,
            currentStep: 'Bàn giao',
            paymentStatus: 'Đã thanh toán',
            handoverStatus: 'Chờ bàn giao'
          };
        });
      })
      .catch(function (error: Error): void {
        // eslint-disable-next-line no-console
        console.error('Khong the xac nhan thanh toan', error);
        window.alert('Khong the xac nhan thanh toan tren SharePoint.');
      });
  }

  function handleConfirmHandover(orderId: string): void {
    updateOrder(orderId, function (order: IOrderDetail): IOrderDetail {
      return {
        ...order,
        currentStep: 'Hoàn tất',
        paymentStatus: 'Đã thanh toán',
        handoverStatus: 'Đã bàn giao'
      };
    });
  }

  function openOrderDetail(order: IOrderDetail): void {
    setSelectedOrderId(order.orderId);
    setActiveTab('orders');
  }

  function showOrderList(): void {
    setSelectedOrderId(null);
    setActiveTab('orders');
  }

  var selectedOrder: IOrderDetail | null = selectedOrderId ? getOrderById(selectedOrderId) : null;

  return (
    <div className={styles.workspace}>
      <div className={styles.topTabs}>
        <button
          type="button"
          className={styles.tabButton + ' ' + (activeTab === 'register' ? styles.tabButtonActive : '')}
          onClick={function (): void {
            setActiveTab('register');
          }}
        >
          Đăng ký mua tài sản
        </button>
        <button
          type="button"
          className={styles.tabButton + ' ' + (activeTab === 'orders' ? styles.tabButtonActive : '')}
          onClick={showOrderList}
        >
          Thanh toán đơn hàng ({orders.length})
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'register' ? (
          <AssetLiquidationPage
            userDisplayName={props.userDisplayName}
            userEmail={props.userEmail}
            spHttpClient={props.spHttpClient}
            onAssetsLoaded={handleAssetsLoaded}
            onPurchaseSuccess={handlePurchaseSuccess}
          />
        ) : selectedOrder ? (
          <OrderDetailPage
            orderDetail={selectedOrder}
            onConfirmPayment={handleConfirmPayment}
            onConfirmHandover={handleConfirmHandover}
            onBack={function (): void {
              setSelectedOrderId(null);
            }}
          />
        ) : (
          <OrderListPage orders={orders} onOpenOrder={openOrderDetail} />
        )}
      </div>
    </div>
  );
}
