import * as React from 'react';
import { AssetLiquidationPage } from './AssetLiquidationPage';
import { OrderDetailPage } from './orderDetail/OrderDetailPage';
import { OrderListPage } from './orderDetail/OrderListPage';
import { mockOrderDetail } from './orderDetail/mockOrderDetail';
import type { IOrderDetail } from './orderDetail/types';
import styles from './OrderWorkspace.module.scss';

export interface IOrderWorkspaceProps {
  userDisplayName: string;
}

type TWorkspaceTab = 'register' | 'orders';

export function OrderWorkspace(props: IOrderWorkspaceProps): React.ReactElement {
  var [activeTab, setActiveTab] = React.useState<TWorkspaceTab>('register');
  var [orders, setOrders] = React.useState<IOrderDetail[]>([mockOrderDetail]);
  var [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);

  function handlePurchaseSuccess(orderDetail: IOrderDetail): void {
    setOrders(function (prevOrders: IOrderDetail[]): IOrderDetail[] {
      return [orderDetail].concat(prevOrders);
    });
    setSelectedOrderId(null);
    setActiveTab('orders');
  }

  function openOrderDetail(order: IOrderDetail): void {
    setSelectedOrderId(order.orderId);
    setActiveTab('orders');
  }

  function showOrderList(): void {
    setSelectedOrderId(null);
    setActiveTab('orders');
  }

  function getSelectedOrder(): IOrderDetail | null {
    var matchedOrder: IOrderDetail | null = null;

    orders.forEach(function (order: IOrderDetail): void {
      if (order.orderId === selectedOrderId) {
        matchedOrder = order;
      }
    });

    return matchedOrder;
  }

  var selectedOrder: IOrderDetail | null = getSelectedOrder();

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
          <AssetLiquidationPage userDisplayName={props.userDisplayName} onPurchaseSuccess={handlePurchaseSuccess} />
        ) : selectedOrder ? (
          <OrderDetailPage
            orderDetail={selectedOrder}
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
