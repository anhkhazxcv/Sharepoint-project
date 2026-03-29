import * as React from 'react';
import type { IOrderDetail } from './types';
import { formatCurrency, formatDate } from './utils/format';
import styles from './AdminTransactionPage.module.scss';

export interface IAdminTransactionPageProps {
  orders: IOrderDetail[];
  onOpenOrder: (order: IOrderDetail) => void;
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
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
        <strong>Chua co giao dich nao</strong>
        <span>Danh sach giao dich admin se hien thi tai day khi SharePoint co du lieu don hang.</span>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Quan ly giao dich admin</h2>
          <span className={styles.subtitle}>Theo doi toan bo don hang va loc theo ma don, thanh toan, ban giao.</span>
        </div>
        <div className={styles.summaryChip}>Tong giao dich: {filteredOrders.length}</div>
      </div>

      <div className={styles.filterBar}>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Tim theo ma don</span>
          <input
            type="text"
            className={styles.input}
            placeholder="Nhap ma don hang"
            value={searchValue}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchValue(event.target.value)}
          />
        </label>

        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Trang thai thanh toan</span>
          <select
            className={styles.select}
            value={paymentFilter}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setPaymentFilter(event.target.value)}
          >
            <option value="">Tat ca</option>
            {paymentStatuses.map((status: string) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Trang thai ban giao</span>
          <select
            className={styles.select}
            value={handoverFilter}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setHandoverFilter(event.target.value)}
          >
            <option value="">Tat ca</option>
            {handoverStatuses.map((status: string) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!filteredOrders.length ? (
        <div className={styles.noResult}>Khong tim thay giao dich phu hop voi dieu kien loc.</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ma don</th>
                  <th>Nguoi mua</th>
                  <th>Email</th>
                  <th>Ngay mua</th>
                  <th>Tong tien</th>
                  <th>Thanh toan</th>
                  <th>Ban giao</th>
                  <th>Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order: IOrderDetail): React.ReactElement => (
                  <tr key={order.orderId}>
                    <td className={styles.codeCell}>{order.orderCode}</td>
                    <td>{order.buyerName}</td>
                    <td>{order.buyerEmail || '-'}</td>
                    <td>{formatDate(order.purchaseDate)}</td>
                    <td>{formatCurrency(order.totalAmount)}</td>
                    <td>{order.paymentStatus}</td>
                    <td>{order.handoverStatus}</td>
                    <td>
                      <button type="button" className={styles.linkButton} onClick={(): void => props.onOpenOrder(order)}>
                        Xem chi tiet
                      </button>
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
                    Xem chi tiet
                  </button>
                </div>

                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Nguoi mua</span>
                  <strong>{order.buyerName}</strong>
                </div>
                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Ngay mua</span>
                  <strong>{formatDate(order.purchaseDate)}</strong>
                </div>
                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Tong tien</span>
                  <strong>{formatCurrency(order.totalAmount)}</strong>
                </div>
                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Thanh toan</span>
                  <strong>{order.paymentStatus}</strong>
                </div>
                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Ban giao</span>
                  <strong>{order.handoverStatus}</strong>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
