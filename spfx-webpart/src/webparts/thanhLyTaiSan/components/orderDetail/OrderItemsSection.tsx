import * as React from 'react';
import { ActionToolbar } from './ActionToolbar';
import { OrderItemsTable } from './OrderItemsTable';
import type { IOrderItem, TProcessStep } from './types';
import styles from './OrderItemsSection.module.scss';

export interface IOrderItemsSectionProps {
  items: IOrderItem[];
  currentStep: TProcessStep;
  paymentStatus: string;
  handoverStatus: string;
  isAdmin: boolean;
  onConfirmPayment: () => void;
  onConfirmHandover: () => void;
}

export function OrderItemsSection(props: IOrderItemsSectionProps): React.ReactElement {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Danh sách tài sản</h2>
      </div>

      <ActionToolbar
        currentStep={props.currentStep}
        paymentStatus={props.paymentStatus}
        handoverStatus={props.handoverStatus}
        isAdmin={props.isAdmin}
        onConfirmPayment={props.onConfirmPayment}
        onConfirmHandover={props.onConfirmHandover}
      />

      <OrderItemsTable items={props.items} />
    </section>
  );
}
