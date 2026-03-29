import * as React from 'react';
import { ProcessStepper } from './ProcessStepper';
import { OrderSummaryCard } from './OrderSummaryCard';
import { OrderItemsSection } from './OrderItemsSection';
import { BankAccountCard } from './BankAccountCard';
import { PaymentQrCard } from './PaymentQrCard';
import type { IOrderDetail } from './types';
import styles from './OrderDetailPage.module.scss';

export interface IOrderDetailPageProps {
  orderDetail?: IOrderDetail;
  onBack?: () => void;
  onConfirmPayment?: (orderId: string) => void;
  onConfirmHandover?: (orderId: string) => void;
}

export function OrderDetailPage(props: IOrderDetailPageProps): React.ReactElement {
  const loadingTimer = React.useRef<number | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(function () {
    loadingTimer.current = window.setTimeout(function () {
      setIsLoading(false);
    }, 300);

    return function () {
      if (loadingTimer.current) {
        window.clearTimeout(loadingTimer.current);
      }
    };
  }, []);

  if (!props.orderDetail) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonTitle}>Khong co du lieu don hang.</div>
      </div>
    );
  }

  const orderDetail: IOrderDetail = props.orderDetail;

  function showMockAction(message: string): void {
    // eslint-disable-next-line no-console
    console.log(message, orderDetail.orderCode);
    window.alert(message);
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonBlock} />
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonSummary} />
        <div className={styles.skeletonLayout}>
          <div className={styles.skeletonMain} />
          <div className={styles.skeletonSide} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ProcessStepper currentStep={orderDetail.currentStep} />

      <header className={styles.pageHeader}>
        {props.onBack && (
          <button type="button" className={styles.backButton} onClick={props.onBack}>
            Quay lai danh sach don
          </button>
        )}
        <h1 className={styles.title}>Chi tiet Don hang: {orderDetail.orderCode}</h1>
      </header>

      <OrderSummaryCard
        buyerName={orderDetail.buyerName}
        purchaseDate={orderDetail.purchaseDate}
        totalAmount={orderDetail.totalAmount}
      />

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <OrderItemsSection
            items={orderDetail.items}
            currentStep={orderDetail.currentStep}
            onConfirmPayment={function (): void {
              if (props.onConfirmPayment) {
                props.onConfirmPayment(orderDetail.orderId);
              }
              showMockAction('Da xac nhan thanh toan va chuyen sang ban giao');
            }}
            onConfirmHandover={function (): void {
              if (props.onConfirmHandover) {
                props.onConfirmHandover(orderDetail.orderId);
              }
              showMockAction('Da xac nhan ban giao tai san');
            }}
          />
        </div>

        <aside className={styles.sideColumn}>
          <BankAccountCard bankAccount={orderDetail.bankAccount} />
          <PaymentQrCard paymentQr={orderDetail.paymentQr} />
        </aside>
      </div>
    </div>
  );
}
