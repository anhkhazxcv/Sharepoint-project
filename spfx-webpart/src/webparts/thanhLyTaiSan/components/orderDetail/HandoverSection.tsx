import * as React from 'react';
import styles from './HandoverSection.module.scss';

export interface IHandoverSectionProps {
  canConfirm: boolean;
  onConfirmHandover: () => void;
}

export function HandoverSection(props: IHandoverSectionProps): React.ReactElement {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Công tác bàn giao</h2>
        <p className={styles.description}>Xác nhận việc bàn giao tài sản cho người mua sau khi thanh toán hoàn tất.</p>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.confirmButton}
          disabled={!props.canConfirm}
          onClick={props.onConfirmHandover}
        >
          Xác nhận bàn giao
        </button>
      </div>
    </section>
  );
}
