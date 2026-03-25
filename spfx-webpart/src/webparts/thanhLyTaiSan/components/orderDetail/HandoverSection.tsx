import * as React from 'react';
import styles from './HandoverSection.module.scss';

export interface IHandoverSectionProps {
  canPrint: boolean;
  canConfirm: boolean;
  onPrintPdf: () => void;
  onConfirmHandover: () => void;
}

export function HandoverSection(props: IHandoverSectionProps): React.ReactElement {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Công tác bàn giao</h2>
        <p className={styles.description}>Thực hiện in biên bản và xác nhận bàn giao tài sản cho người mua.</p>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.printButton} disabled={!props.canPrint} onClick={props.onPrintPdf}>
          In biên bản bàn giao (PDF)
        </button>
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
