import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { AssetLiquidationPage } from './AssetLiquidationPage';
import { OrderDetailPage } from './orderDetail/OrderDetailPage';
import { OrderListPage } from './orderDetail/OrderListPage';
import type { IOrderDetail, IOrderItem } from './orderDetail/types';
import type { IAssetItem } from './types';
import {
  createPaymentHistoryItem,
  getTransactionsByUser,
  type IUserTransactionRecord,
  updateAssetStock,
  updateTransactionStatus
} from './services/orderTransactionService';
import styles from './OrderWorkspace.module.scss';

export interface IOrderWorkspaceProps {
  userDisplayName: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
}

type TWorkspaceTab = 'register' | 'orders';

function createAssetPlaceholder(label: string): string {
  const svg: string =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" +
    "<rect width='120' height='120' rx='14' fill='#eef2f7'/>" +
    "<rect x='16' y='16' width='88' height='88' rx='12' fill='white' opacity='0.9'/>" +
    "<rect x='28' y='30' width='28' height='28' rx='8' fill='#cbd5e1'/>" +
    "<rect x='64' y='34' width='24' height='8' rx='4' fill='#94a3b8'/>" +
    "<rect x='64' y='48' width='18' height='6' rx='3' fill='#cbd5e1'/>" +
    "<text x='24' y='94' font-family='Segoe UI, Arial' font-size='10' font-weight='700' fill='#334155'>" +
    label.slice(0, 16) +
    '</text>' +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function createBankLogo(): string {
  const svg: string =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 92 92'>" +
    "<rect width='92' height='92' rx='18' fill='#e7f0fb'/>" +
    "<rect x='14' y='18' width='64' height='52' rx='12' fill='#0f4c81'/>" +
    "<rect x='26' y='32' width='40' height='8' rx='4' fill='white' opacity='0.95'/>" +
    "<rect x='26' y='48' width='28' height='6' rx='3' fill='white' opacity='0.7'/>" +
    "<text x='24' y='82' font-family='Segoe UI, Arial' font-size='11' font-weight='700' fill='#0f2f57'>VCB</text>" +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function createQrPlaceholder(): string {
  const svg: string =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 220'>" +
    "<rect width='220' height='220' rx='18' fill='white'/>" +
    "<rect x='16' y='16' width='188' height='188' rx='8' fill='#f8fafc' stroke='#d6dee8'/>" +
    "<rect x='30' y='30' width='42' height='42' fill='#111827'/>" +
    "<rect x='148' y='30' width='42' height='42' fill='#111827'/>" +
    "<rect x='30' y='148' width='42' height='42' fill='#111827'/>" +
    "<rect x='96' y='48' width='24' height='10' fill='#111827'/>" +
    "<rect x='112' y='80' width='28' height='12' fill='#111827'/>" +
    "<rect x='90' y='126' width='52' height='12' fill='#111827'/>" +
    "<rect x='92' y='174' width='34' height='12' fill='#111827'/>" +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function sanitizeBuyerName(buyerName: string): string {
  return (buyerName || 'CBNV').replace(/\s+/g, '').slice(0, 24);
}

function getOrderStateFromStatus(status: string): Pick<IOrderDetail, 'currentStep' | 'paymentStatus' | 'handoverStatus'> {
  if (status === 'Da ban giao') {
    return {
      currentStep: 'Hoàn tất',
      paymentStatus: 'Da thanh toan',
      handoverStatus: 'Da ban giao'
    };
  }

  if (status === 'Da thanh toan') {
    return {
      currentStep: 'Bàn giao',
      paymentStatus: 'Da thanh toan',
      handoverStatus: 'Cho ban giao'
    };
  }

  return {
    currentStep: 'Thanh toán',
    paymentStatus: status || 'Cho xac nhan',
    handoverStatus: 'Chua ban giao'
  };
}

function mapTransactionRecordToOrderDetail(record: IUserTransactionRecord, assets: IAssetItem[]): IOrderDetail {
  const matchedAsset: IAssetItem | undefined = assets.filter((asset: IAssetItem) => asset.assetCode === record.assetCode)[0];
  const orderState = getOrderStateFromStatus(record.status);
  const compactBuyerName: string = sanitizeBuyerName(record.buyerName);
  const totalAmount: number = record.totalAmount || record.quantity * record.unitPrice;

  return {
    orderId: record.orderId,
    orderCode: record.orderCode,
    buyerName: record.buyerName,
    purchaseDate: record.purchaseDate,
    totalAmount,
    currentStep: orderState.currentStep,
    paymentStatus: orderState.paymentStatus,
    handoverStatus: orderState.handoverStatus,
    bankAccount: {
      bankName: 'Vietcombank',
      accountName: 'BAN HAN',
      accountNumber: '891260009',
      logoUrl: createBankLogo()
    },
    paymentQr: {
      qrImageUrl: createQrPlaceholder(),
      transferContent: 'TT ' + record.orderCode + ' ' + compactBuyerName,
      amount: totalAmount
    },
    items: [
      {
        id: record.orderId + '-01',
        assetId: matchedAsset ? matchedAsset.id : record.assetCode,
        assetCode: record.assetCode,
        assetName: matchedAsset ? matchedAsset.assetName : record.assetName,
        condition: matchedAsset ? matchedAsset.condition : 'Chua cap nhat',
        site: matchedAsset ? matchedAsset.site : 'Chua cap nhat',
        quantity: record.quantity,
        unitPrice: record.unitPrice,
        amount: totalAmount,
        imageUrl: matchedAsset ? matchedAsset.imageUrl : createAssetPlaceholder(record.assetName),
        barcode: matchedAsset ? matchedAsset.barcode : ''
      }
    ]
  };
}

function mapOrderDetailToTransactionRecord(orderDetail: IOrderDetail, userEmail: string): IUserTransactionRecord {
  const firstItem: IOrderItem | undefined = orderDetail.items[0];

  return {
    orderId: orderDetail.orderId,
    orderCode: orderDetail.orderCode,
    buyerName: orderDetail.buyerName,
    buyerEmail: userEmail,
    purchaseDate: orderDetail.purchaseDate,
    totalAmount: orderDetail.totalAmount,
    quantity: firstItem ? firstItem.quantity : 0,
    unitPrice: firstItem ? firstItem.unitPrice : 0,
    assetCode: firstItem ? firstItem.assetCode : '',
    assetName: firstItem ? firstItem.assetName : 'Chua co ten tai san',
    status: orderDetail.paymentStatus
  };
}

export function OrderWorkspace(props: IOrderWorkspaceProps): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<TWorkspaceTab>('register');
  const [transactionRecords, setTransactionRecords] = React.useState<IUserTransactionRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [assets, setAssets] = React.useState<IAssetItem[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(false);

  React.useEffect(() => {
    getTransactionsByUser(props.siteUrl, props.spHttpClient, props.userEmail)
      .then((records: IUserTransactionRecord[]): void => {
        setTransactionRecords(records);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Khong the tai lich su giao dich cua nguoi dung', error);
      });
  }, [props.siteUrl, props.spHttpClient, props.userEmail]);

  const orders: IOrderDetail[] = React.useMemo((): IOrderDetail[] => {
    return transactionRecords.map((record: IUserTransactionRecord): IOrderDetail => {
      return mapTransactionRecordToOrderDetail(record, assets);
    });
  }, [assets, transactionRecords]);

  const purchasedCount: number = React.useMemo((): number => {
    return transactionRecords.reduce((total: number, record: IUserTransactionRecord): number => {
      return total + record.quantity;
    }, 0);
  }, [transactionRecords]);

  const handleAssetsLoaded = React.useCallback((items: IAssetItem[]): void => {
    setAssets(items);
  }, []);

  function handlePurchaseSuccess(orderDetail: IOrderDetail): void {
    setTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
      return [mapOrderDetailToTransactionRecord(orderDetail, props.userEmail)].concat(prevRecords);
    });
    setSelectedOrderId(orderDetail.orderId);
    setActiveTab('orders');
  }

  function getOrderById(orderId: string): IOrderDetail | null {
    const matchedOrder: IOrderDetail[] = orders.filter((order: IOrderDetail) => order.orderId === orderId);
    return matchedOrder.length ? matchedOrder[0] : null;
  }

  function updateTransactionStatusInState(orderId: string, status: string): void {
    setTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
      return prevRecords.map((record: IUserTransactionRecord): IUserTransactionRecord => {
        if (record.orderId !== orderId) {
          return record;
        }

        return {
          ...record,
          status
        };
      });
    });
  }

  function handleConfirmPayment(orderId: string): void {
    const targetOrder: IOrderDetail | null = getOrderById(orderId);
    const firstItem: IOrderItem | null = targetOrder && targetOrder.items.length ? targetOrder.items[0] : null;

    if (!targetOrder || !firstItem) {
      return;
    }

    const confirmedOrder: IOrderDetail = targetOrder;
    const confirmedItem: IOrderItem = firstItem;
    const matchedAssets: IAssetItem[] = assets.filter((asset: IAssetItem) => {
      return asset.id === confirmedItem.assetId || asset.assetCode === confirmedItem.assetCode;
    });

    if (!matchedAssets.length) {
      window.alert('Khong tim thay tai san de tru ton.');
      return;
    }

    const confirmedAsset: IAssetItem = matchedAssets[0];
    const nextStock: number = confirmedAsset.availableQuantity - confirmedItem.quantity;

    if (nextStock < 0) {
      window.alert('So luong ton hien tai khong du de xac nhan thanh toan.');
      return;
    }

    createPaymentHistoryItem({
      siteUrl: props.siteUrl,
      spHttpClient: props.spHttpClient,
      transferContent: confirmedOrder.paymentQr.transferContent,
      paymentConfirmedAt: new Date().toISOString()
    })
      .then((): Promise<void> => {
        return updateTransactionStatus({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          orderId: confirmedOrder.orderCode,
          status: 'Da thanh toan'
        });
      })
      .then((): Promise<void> => {
        return updateAssetStock({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          assetItemId: confirmedAsset.id,
          nextStock
        });
      })
      .then((): void => {
        setAssets((prevAssets: IAssetItem[]): IAssetItem[] => {
          return prevAssets.map((asset: IAssetItem): IAssetItem => {
            if (asset.id !== confirmedAsset.id) {
              return asset;
            }

            return {
              ...asset,
              totalQuantity: nextStock,
              availableQuantity: nextStock,
              statusText: nextStock > 0 ? 'Con hang' : 'Het hang'
            };
          });
        });

        updateTransactionStatusInState(orderId, 'Da thanh toan');
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Khong the xac nhan thanh toan', error);
        window.alert('Khong the xac nhan thanh toan tren SharePoint.');
      });
  }

  function handleConfirmHandover(orderId: string): void {
    updateTransactionStatus({
      siteUrl: props.siteUrl,
      spHttpClient: props.spHttpClient,
      orderId,
      status: 'Da ban giao'
    })
      .then((): void => {
        updateTransactionStatusInState(orderId, 'Da ban giao');
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Khong the xac nhan ban giao', error);
        window.alert('Khong the xac nhan ban giao tren SharePoint.');
      });
  }

  function openOrderDetail(order: IOrderDetail): void {
    setSelectedOrderId(order.orderId);
    setActiveTab('orders');
  }

  function showOrderList(): void {
    setSelectedOrderId(null);
    setActiveTab('orders');
  }

  const selectedOrder: IOrderDetail | null = selectedOrderId ? getOrderById(selectedOrderId) : null;

  return (
    <div className={styles.workspace}>
      <div className={styles.layout}>
        <aside className={styles.sidebar + ' ' + (isSidebarCollapsed ? styles.sidebarCollapsed : '')}>
          <div className={styles.sidebarHeader}>
            {!isSidebarCollapsed && (
              <div className={styles.brandBlock}>
                <span className={styles.brandEyebrow}>Workspace</span>
                <strong className={styles.brandTitle}>Mua tai san noi bo</strong>
              </div>
            )}

            <button
              type="button"
              className={styles.collapseButton}
              onClick={(): void => {
                setIsSidebarCollapsed((prevState: boolean) => !prevState);
              }}
              aria-label={isSidebarCollapsed ? 'Mo rong menu' : 'Thu gon menu'}
              title={isSidebarCollapsed ? 'Mo rong menu' : 'Thu gon menu'}
            >
              {isSidebarCollapsed ? '>' : '<'}
            </button>
          </div>

          <nav className={styles.menuList} aria-label="Dieu huong chuc nang">
            <button
              type="button"
              className={
                styles.menuButton +
                ' ' +
                (activeTab === 'register' ? styles.menuButtonActive : '') +
                ' ' +
                (isSidebarCollapsed ? styles.menuButtonCollapsed : '')
              }
              onClick={(): void => {
                setActiveTab('register');
              }}
              aria-label="Dang ky mua tai san"
              title="Dang ky mua tai san"
            >
              <span className={styles.menuIcon} aria-hidden="true">
                R
              </span>
              {!isSidebarCollapsed && (
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Dang ky mua</span>
                  <span className={styles.menuHint}>Tim va dang ky tai san thanh ly</span>
                </span>
              )}
            </button>

            <button
              type="button"
              className={
                styles.menuButton +
                ' ' +
                (activeTab === 'orders' ? styles.menuButtonActive : '') +
                ' ' +
                (isSidebarCollapsed ? styles.menuButtonCollapsed : '')
              }
              onClick={showOrderList}
              aria-label={'Danh sach giao dich ' + String(orders.length)}
              title={'Danh sach giao dich (' + String(orders.length) + ')'}
            >
              <span className={styles.menuIcon} aria-hidden="true">
                O
              </span>
              {!isSidebarCollapsed && (
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Danh sach giao dich</span>
                  <span className={styles.menuHint}>Tat ca giao dich cua ban ({orders.length})</span>
                </span>
              )}
            </button>
          </nav>
        </aside>

        <div className={styles.content}>
          {activeTab === 'register' ? (
            <AssetLiquidationPage
              userDisplayName={props.userDisplayName}
              userEmail={props.userEmail}
              spHttpClient={props.spHttpClient}
              siteUrl={props.siteUrl}
              purchasedCount={purchasedCount}
              onAssetsLoaded={handleAssetsLoaded}
              onPurchaseSuccess={handlePurchaseSuccess}
            />
          ) : selectedOrder ? (
            <OrderDetailPage
              orderDetail={selectedOrder}
              onConfirmPayment={handleConfirmPayment}
              onConfirmHandover={handleConfirmHandover}
              onBack={(): void => {
                setSelectedOrderId(null);
              }}
            />
          ) : (
            <OrderListPage orders={orders} onOpenOrder={openOrderDetail} />
          )}
        </div>
      </div>
    </div>
  );
}
