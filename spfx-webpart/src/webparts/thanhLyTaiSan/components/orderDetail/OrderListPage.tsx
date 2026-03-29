import * as React from 'react';
import type { IOrderDetail } from './types';
import { formatCurrency, formatDate } from './utils/format';
import styles from './OrderListPage.module.scss';

export interface IOrderListPageProps {
  orders: IOrderDetail[];
  onOpenOrder: (order: IOrderDetail) => void;
}

function getPaymentBadgeClass(status: string): string {
  if (status === 'Đã thanh toán') {
    return styles.badgeSuccess;
  }

  return styles.badgeWarning;
}

function getHandoverBadgeClass(status: string): string {
  if (status === 'Đã bàn giao') {
    return styles.badgeSuccess;
  }

  return styles.badgeNeutral;
}

export function OrderListPage(props: IOrderListPageProps): React.ReactElement {
  if (!props.orders.length) {
    return (
      <section className={styles.emptyState}>
        <strong>Chưa có đơn hàng nào</strong>
        <span>Đơn được tạo từ màn đăng ký sẽ xuất hiện trong tab này.</span>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Danh sách đơn hàng chờ thanh toán / bàn giao</h2>
          <span className={styles.subtitle}>Tổng số đơn đang theo dõi: {props.orders.length}</span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Người mua</th>
              <th>Ngày mua</th>
              <th>Tổng tiền</th>
              <th>Thanh toán</th>
              <th>Bàn giao</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {props.orders.map((order: IOrderDetail): React.ReactElement => {
              return (
                <tr key={order.orderId}>
                  <td className={styles.codeCell}>{order.orderCode}</td>
                  <td>{order.buyerName}</td>
                  <td>{formatDate(order.purchaseDate)}</td>
                  <td>{formatCurrency(order.totalAmount)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getPaymentBadgeClass(order.paymentStatus)}`}>{order.paymentStatus}</span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${getHandoverBadgeClass(order.handoverStatus)}`}>{order.handoverStatus}</span>
                  </td>
                  <td>
                    <button type="button" className={styles.linkButton} onClick={function (): void { props.onOpenOrder(order); }}>
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {props.orders.map((order: IOrderDetail): React.ReactElement => {
          return (
            <article key={order.orderId} className={styles.mobileCard}>
              <div className={styles.mobileHeader}>
                <strong className={styles.codeCell}>{order.orderCode}</strong>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={function (): void {
                    props.onOpenOrder(order);
                  }}
                >
                  Xem chi tiết
                </button>
              </div>

              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Người mua</span>
                <strong>{order.buyerName}</strong>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Ngày mua</span>
                <strong>{formatDate(order.purchaseDate)}</strong>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Tổng tiền</span>
                <strong>{formatCurrency(order.totalAmount)}</strong>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Thanh toán</span>
                <span className={`${styles.statusBadge} ${getPaymentBadgeClass(order.paymentStatus)}`}>{order.paymentStatus}</span>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Bàn giao</span>
                <span className={`${styles.statusBadge} ${getHandoverBadgeClass(order.handoverStatus)}`}>{order.handoverStatus}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
