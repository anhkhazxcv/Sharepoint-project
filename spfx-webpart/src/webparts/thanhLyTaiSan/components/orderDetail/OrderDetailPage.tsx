import * as React from 'react';
import { mockOrderDetail } from './mockOrderDetail';
import { ProcessStepper } from './ProcessStepper';
import { OrderSummaryCard } from './OrderSummaryCard';
import { OrderItemsSection } from './OrderItemsSection';
import { HandoverSection } from './HandoverSection';
import { BankAccountCard } from './BankAccountCard';
import { PaymentQrCard } from './PaymentQrCard';
import type { IOrderDetail } from './types';
import styles from './OrderDetailPage.module.scss';

export interface IOrderDetailPageProps {
  orderDetail?: IOrderDetail;
  onBack?: () => void;
}

export function OrderDetailPage(props: IOrderDetailPageProps): React.ReactElement {
  var orderDetail: IOrderDetail = props.orderDetail || mockOrderDetail;
  var loadingTimer = React.useRef<number | undefined>(undefined);
  var [isLoading, setIsLoading] = React.useState<boolean>(true);
  var canRunHandoverActions: boolean =
    orderDetail.currentStep === 'Bàn giao' || orderDetail.currentStep === 'Hoàn tất';

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
            Quay lại danh sách đơn
          </button>
        )}
        <h1 className={styles.title}>Chi tiết Đơn hàng: {orderDetail.orderCode}</h1>
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
              showMockAction('Đã xác nhận thanh toán');
            }}
            onPay={function (): void {
              showMockAction('Đã mở thao tác thanh toán');
            }}
            onConfirmHandover={function (): void {
              showMockAction('Đã xác nhận bàn giao');
            }}
          />

          <HandoverSection
            canPrint={canRunHandoverActions}
            canConfirm={orderDetail.currentStep === 'Bàn giao'}
            onPrintPdf={function (): void {
              showMockAction('Đã tạo biên bản bàn giao PDF');
            }}
            onConfirmHandover={function (): void {
              showMockAction('Đã xác nhận bàn giao');
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
