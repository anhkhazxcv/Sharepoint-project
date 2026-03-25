import * as React from 'react';
import type { TProcessStep } from './types';
import styles from './ActionToolbar.module.scss';

export interface IActionToolbarProps {
  currentStep: TProcessStep;
  onConfirmPayment: () => void;
  onPay: () => void;
  onConfirmHandover: () => void;
}

export function ActionToolbar(props: IActionToolbarProps): React.ReactElement {
  var isPaymentStep: boolean = props.currentStep === 'Thanh toán';
  var isHandoverStep: boolean = props.currentStep === 'Bàn giao';

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={!isPaymentStep}
        onClick={props.onConfirmPayment}
      >
        Xác nhận thanh toán
      </button>
      <button type="button" className={styles.primaryButton} disabled={!isPaymentStep} onClick={props.onPay}>
        Thanh toán
      </button>
      <button
        type="button"
        className={styles.successButton}
        disabled={!isHandoverStep}
        onClick={props.onConfirmHandover}
      >
        Xác nhận bàn giao
      </button>
      <button type="button" className={styles.moreButton} aria-label="Thêm thao tác">
        ...
      </button>
    </div>
  );
}
