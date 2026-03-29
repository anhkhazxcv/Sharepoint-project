import * as React from 'react';
import type { TProcessStep } from './types';
import styles from './ActionToolbar.module.scss';

export interface IActionToolbarProps {
  currentStep: TProcessStep;
  paymentStatus: string;
  handoverStatus: string;
  isAdmin: boolean;
  onConfirmPayment: () => void;
  onConfirmHandover: () => void;
}

export function ActionToolbar(props: IActionToolbarProps): React.ReactElement {
  const isPaymentStep: boolean = props.currentStep === 'Thanh toán';
  const canShowHandoverButton: boolean = props.isAdmin && props.paymentStatus === 'Đã thanh toán';
  const isHandoverDisabled: boolean = props.handoverStatus === 'Đã bàn giao';

  return (
    <div className={styles.toolbar}>
      {isPaymentStep && (
        <button type="button" className={styles.secondaryButton} onClick={props.onConfirmPayment}>
          Xác nhận thanh toán
        </button>
      )}
      {canShowHandoverButton && (
        <button
          type="button"
          className={styles.successButton}
          onClick={props.onConfirmHandover}
          disabled={isHandoverDisabled}
        >
          Xác nhận bàn giao
        </button>
      )}
    </div>
  );
}
