import * as React from 'react';
import styles from './PurchaseLimitBadge.module.scss';

export interface IPurchaseLimitBadgeProps {
  purchasedCount: number;
  maxLimit: number;
}

export function PurchaseLimitBadge(props: IPurchaseLimitBadgeProps): React.ReactElement {
  const { purchasedCount, maxLimit } = props;

  return (
    <div className={styles.badge}>
      <span className={styles.label}>Giới hạn</span>
      <strong className={styles.value}>Đã mua {purchasedCount}/{maxLimit} tài sản</strong>
    </div>
  );
}
