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
  siteUrl: string;
}

type TWorkspaceTab = 'register' | 'orders';

export function OrderWorkspace(props: IOrderWorkspaceProps): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<TWorkspaceTab>('register');
  const [orders, setOrders] = React.useState<IOrderDetail[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [assets, setAssets] = React.useState<IAssetItem[]>([]);

  const handleAssetsLoaded = React.useCallback((items: IAssetItem[]): void => {
    setAssets(items);
  }, []);

  function handlePurchaseSuccess(orderDetail: IOrderDetail): void {
    setOrders((prevOrders: IOrderDetail[]): IOrderDetail[] => {
      return [orderDetail].concat(prevOrders);
    });
    setSelectedOrderId(orderDetail.orderId);
    setActiveTab('orders');
  }

  function getOrderById(orderId: string): IOrderDetail | null {
    const matchedOrder: IOrderDetail[] = orders.filter((order: IOrderDetail) => order.orderId === orderId);
    return matchedOrder.length ? matchedOrder[0] : null;
  }

  function updateOrder(orderId: string, updater: (order: IOrderDetail) => IOrderDetail): void {
    setOrders((prevOrders: IOrderDetail[]): IOrderDetail[] => {
      return prevOrders.map((order: IOrderDetail): IOrderDetail => {
        return order.orderId === orderId ? updater(order) : order;
      });
    });
  }

  function handleConfirmPayment(orderId: string): void {
    const targetOrder: IOrderDetail | null = getOrderById(orderId);
    const firstItem: IOrderItem | null = targetOrder && targetOrder.items.length ? targetOrder.items[0] : null;

    if (!targetOrder || !firstItem) {
      return;
    }

    const confirmedOrder: IOrderDetail = targetOrder;
    const confirmedItem: IOrderItem = firstItem;
    const matchedAssets: IAssetItem[] = assets.filter((asset: IAssetItem) => asset.id === confirmedItem.assetId);

    if (!matchedAssets.length) {
      window.alert('Khong tim thay tai san de tru ton.');
      return;
    }

    const confirmedAsset: IAssetItem = matchedAssets[0];
    const nextStock: number = confirmedAsset.availableQuantity - confirmedItem.quantity;

    if (nextStock < 0) {
      window.alert('So luong ton hien tai khong du de xac nhan thanh toan.');
      return;
    }

    createPaymentHistoryItem({
      siteUrl: props.siteUrl,
      spHttpClient: props.spHttpClient,
      transferContent: confirmedOrder.paymentQr.transferContent,
      paymentConfirmedAt: new Date().toISOString()
    })
      .then((): Promise<void> => {
        return updateTransactionStatus({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          orderId: confirmedOrder.orderCode,
          status: 'Da thanh toan'
        });
      })
      .then((): Promise<void> => {
        return updateAssetStock({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          assetItemId: confirmedAsset.id,
          nextStock
        });
      })
      .then((): void => {
        setAssets((prevAssets: IAssetItem[]): IAssetItem[] => {
          return prevAssets.map((asset: IAssetItem): IAssetItem => {
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

        updateOrder(orderId, (order: IOrderDetail): IOrderDetail => {
          return {
            ...order,
            currentStep: 'Bàn giao',
            paymentStatus: 'Da thanh toan',
            handoverStatus: 'Cho ban giao'
          };
        });
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Khong the xac nhan thanh toan', error);
        window.alert('Khong the xac nhan thanh toan tren SharePoint.');
      });
  }

  function handleConfirmHandover(orderId: string): void {
    updateOrder(orderId, (order: IOrderDetail): IOrderDetail => {
      return {
        ...order,
        currentStep: 'Hoàn tất',
        paymentStatus: 'Da thanh toan',
        handoverStatus: 'Da ban giao'
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

  const selectedOrder: IOrderDetail | null = selectedOrderId ? getOrderById(selectedOrderId) : null;

  return (
    <div className={styles.workspace}>
      <div className={styles.topTabs}>
        <button
          type="button"
          className={styles.tabButton + ' ' + (activeTab === 'register' ? styles.tabButtonActive : '')}
          onClick={(): void => {
            setActiveTab('register');
          }}
        >
          Dang ky mua tai san
        </button>
        <button
          type="button"
          className={styles.tabButton + ' ' + (activeTab === 'orders' ? styles.tabButtonActive : '')}
          onClick={showOrderList}
        >
          Thanh toan don hang ({orders.length})
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'register' ? (
          <AssetLiquidationPage
            userDisplayName={props.userDisplayName}
            userEmail={props.userEmail}
            spHttpClient={props.spHttpClient}
            siteUrl={props.siteUrl}
            onAssetsLoaded={handleAssetsLoaded}
            onPurchaseSuccess={handlePurchaseSuccess}
          />
        ) : selectedOrder ? (
          <OrderDetailPage
            orderDetail={selectedOrder}
            onConfirmPayment={handleConfirmPayment}
            onConfirmHandover={handleConfirmHandover}
            onBack={(): void => {
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
