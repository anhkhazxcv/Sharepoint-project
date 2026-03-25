import * as React from 'react';
import type { IBankAccountInfo } from './types';
import styles from './BankAccountCard.module.scss';

export interface IBankAccountCardProps {
  bankAccount: IBankAccountInfo;
}

export function BankAccountCard(props: IBankAccountCardProps): React.ReactElement {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Thông tin tài khoản pháp nhân</h2>
      <div className={styles.bankHeader}>
        <div className={styles.logoWrap}>
          <img className={styles.logo} src={props.bankAccount.logoUrl} alt={props.bankAccount.bankName} />
        </div>
        <div>
          <div className={styles.bankName}>{props.bankAccount.bankName}</div>
          <div className={styles.bankHint}>Tài khoản nhận thanh toán</div>
        </div>
      </div>

      <div className={styles.infoList}>
        <div className={styles.infoRow}>
          <span className={styles.label}>Tên tài khoản</span>
          <strong className={styles.value}>{props.bankAccount.accountName}</strong>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Số tài khoản</span>
          <strong className={styles.value}>{props.bankAccount.accountNumber}</strong>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Tên ngân hàng</span>
          <strong className={styles.value}>{props.bankAccount.bankName}</strong>
        </div>
      </div>
    </section>
  );
}
