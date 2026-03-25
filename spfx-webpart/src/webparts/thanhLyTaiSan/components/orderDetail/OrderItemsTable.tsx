import * as React from 'react';
import type { IOrderItem } from './types';
import { formatCurrency } from './utils/format';
import styles from './OrderItemsTable.module.scss';

export interface IOrderItemsTableProps {
  items: IOrderItem[];
}

export function OrderItemsTable(props: IOrderItemsTableProps): React.ReactElement {
  var selectedRowId: string | null = props.items.length > 0 ? props.items[0].id : null;

  if (!props.items.length) {
    return (
      <div className={styles.emptyState}>
        <strong>Chưa có tài sản trong đơn hàng</strong>
        <span>Dữ liệu tài sản sẽ hiển thị tại đây khi đơn hàng được tạo.</span>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ảnh</th>
            <th>Thông tin tài sản</th>
            <th>Số lượng</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map(function (item: IOrderItem): React.ReactElement {
            var isSelected: boolean = item.id === selectedRowId;

            return (
              <tr key={item.id} className={isSelected ? styles.selectedRow : ''}>
                <td>
                  <div className={styles.thumbnailWrap}>
                    <img className={styles.thumbnail} src={item.imageUrl} alt={item.assetName} />
                  </div>
                </td>
                <td>
                  <div className={styles.primaryText}>{item.assetName}</div>
                  <div className={styles.secondaryText}>Mã TS: {item.assetCode}</div>
                  <div className={styles.secondaryText}>Tình trạng: {item.condition}</div>
                  <div className={styles.secondaryText}>Site: {item.site}</div>
                </td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td className={styles.amountCell}>{formatCurrency(item.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
