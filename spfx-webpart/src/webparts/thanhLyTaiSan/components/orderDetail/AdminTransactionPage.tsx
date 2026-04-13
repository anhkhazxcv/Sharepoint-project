import * as React from 'react';
import type { IOrderDetail } from './types';
import { formatCurrency, formatDate } from './utils/format';
import styles from './AdminTransactionPage.module.scss';

export interface IAdminTransactionPageProps {
  orders: IOrderDetail[];
  onOpenOrder: (order: IOrderDetail) => void;
  onDeleteOrder: (order: IOrderDetail) => void;
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
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

export function AdminTransactionPage(props: IAdminTransactionPageProps): React.ReactElement {
  const [searchValue, setSearchValue] = React.useState<string>('');
  const [paymentFilter, setPaymentFilter] = React.useState<string>('');
  const [handoverFilter, setHandoverFilter] = React.useState<string>('');

  const paymentStatuses: string[] = React.useMemo(() => {
    return props.orders
      .map((order: IOrderDetail) => order.paymentStatus)
      .filter((value: string, index: number, values: string[]) => !!value && values.indexOf(value) === index);
  }, [props.orders]);

  const handoverStatuses: string[] = React.useMemo(() => {
    return props.orders
      .map((order: IOrderDetail) => order.handoverStatus)
      .filter((value: string, index: number, values: string[]) => !!value && values.indexOf(value) === index);
  }, [props.orders]);

  const filteredOrders: IOrderDetail[] = React.useMemo(() => {
    const normalizedSearch: string = normalizeValue(searchValue);

    return props.orders.filter((order: IOrderDetail) => {
      const matchesCode: boolean = !normalizedSearch || normalizeValue(order.orderCode).indexOf(normalizedSearch) >= 0;
      const matchesPayment: boolean = !paymentFilter || order.paymentStatus === paymentFilter;
      const matchesHandover: boolean = !handoverFilter || order.handoverStatus === handoverFilter;

      return matchesCode && matchesPayment && matchesHandover;
    });
  }, [handoverFilter, paymentFilter, props.orders, searchValue]);

  if (!props.orders.length) {
    return (
      <section className={styles.emptyState}>
        <strong>Chưa có giao dịch nào</strong>
        <span>Danh sách giao dịch admin sẽ hiển thị tại đây khi SharePoint có dữ liệu đơn hàng.</span>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Quản lý giao dịch admin</h2>
          <span className={styles.subtitle}>Theo dõi toàn bộ đơn hàng và lọc theo mã đơn, thanh toán, bàn giao.</span>
        </div>
        <div className={styles.summaryChip}>Tổng giao dịch: {filteredOrders.length}</div>
      </div>

      <div className={styles.filterPanel}>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Tìm theo mã đơn</span>
          <input
            type="text"
            className={styles.input}
            placeholder="Nhập mã đơn hàng"
            value={searchValue}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchValue(event.target.value)}
          />
        </label>

        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Trạng thái thanh toán</span>
          <select
            className={styles.select}
            value={paymentFilter}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setPaymentFilter(event.target.value)}
          >
            <option value="">Tất cả</option>
            {paymentStatuses.map((status: string) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Trạng thái bàn giao</span>
          <select
            className={styles.select}
            value={handoverFilter}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setHandoverFilter(event.target.value)}
          >
            <option value="">Tất cả</option>
            {handoverStatuses.map((status: string) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!filteredOrders.length ? (
        <div className={styles.noResult}>Không tìm thấy giao dịch phù hợp với điều kiện lọc.</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Người mua</th>
                  <th>Email</th>
                  <th>Ngày mua</th>
                  <th>Tổng tiền</th>
                  <th>Thanh toán</th>
                  <th>Bàn giao</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order: IOrderDetail): React.ReactElement => (
                  <tr key={order.orderId}>
                    <td className={styles.codeCell}>{order.orderCode}</td>
                    <td>{order.buyerName}</td>
                    <td className={styles.emailCell}>{order.buyerEmail || '-'}</td>
                    <td>{formatDate(order.purchaseDate)}</td>
                    <td>{formatCurrency(order.totalAmount)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getPaymentBadgeClass(order.paymentStatus)}`}>{order.paymentStatus}</span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getHandoverBadgeClass(order.handoverStatus)}`}>{order.handoverStatus}</span>
                    </td>
                    <td>
                      <button type="button" className={styles.linkButton} onClick={(): void => props.onOpenOrder(order)}>
                        Xem chi tiết
                      </button>
                      {order.paymentStatus !== 'Đã thanh toán' && order.handoverStatus !== 'Đã bàn giao' && (
                        <button type="button" className={styles.linkButton} onClick={(): void => props.onDeleteOrder(order)}>
                          Xóa đơn
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileList}>
            {filteredOrders.map((order: IOrderDetail): React.ReactElement => (
              <article key={order.orderId} className={styles.mobileCard}>
                <div className={styles.mobileHeader}>
                  <strong className={styles.codeCell}>{order.orderCode}</strong>
                  <button type="button" className={styles.linkButton} onClick={(): void => props.onOpenOrder(order)}>
                    Xem chi tiết
                  </button>
                  {order.paymentStatus !== 'Đã thanh toán' && order.handoverStatus !== 'Đã bàn giao' && (
                    <button type="button" className={styles.linkButton} onClick={(): void => props.onDeleteOrder(order)}>
                      Xóa đơn
                    </button>
                  )}
                </div>

                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Người mua</span>
                  <strong>{order.buyerName}</strong>
                </div>
                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Email</span>
                  <strong className={styles.emailCell}>{order.buyerEmail || '-'}</strong>
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
            ))}
          </div>
        </>
      )}
    </section>
  );
}
