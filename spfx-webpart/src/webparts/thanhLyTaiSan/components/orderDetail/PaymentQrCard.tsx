import * as React from 'react';
import type { IPaymentQrInfo } from './types';
import { formatCurrency } from './utils/format';
import styles from './PaymentQrCard.module.scss';

export interface IPaymentQrCardProps {
  paymentQr: IPaymentQrInfo;
}

export function PaymentQrCard(props: IPaymentQrCardProps): React.ReactElement {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Mã QR thanh toán</h2>
      <div className={styles.qrWrap}>
        <img className={styles.qrImage} src={props.paymentQr.qrImageUrl} alt="Mã QR thanh toán" />
      </div>
      <div className={styles.caption}>Mã QR thanh toán</div>

      <div className={styles.infoRow}>
        <span className={styles.label}>Số tiền</span>
        <strong className={styles.value}>{formatCurrency(props.paymentQr.amount)}</strong>
      </div>
      <div className={styles.infoRow}>
        <span className={styles.label}>Nội dung</span>
        <strong className={styles.value}>{props.paymentQr.transferContent}</strong>
      </div>
    </section>
  );
}
