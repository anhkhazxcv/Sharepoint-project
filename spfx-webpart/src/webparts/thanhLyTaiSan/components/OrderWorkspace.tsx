import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { AssetLiquidationPage } from './AssetLiquidationPage';
import { CartPage } from './CartPage';
import { AdminTransactionPage } from './orderDetail/AdminTransactionPage';
import { OrderDetailPage } from './orderDetail/OrderDetailPage';
import { OrderListPage } from './orderDetail/OrderListPage';
import techcombankLogo from '../assets/techcombank-1.png';
import type { IOrderDetail, IOrderItem } from './orderDetail/types';
import type { IAssetItem } from './types';
import {
  createPaymentHistoryItem,
  getAllTransactions,
  getTransactionsByUser,
  type IUserTransactionLineRecord,
  type IUserTransactionRecord,
  updateAssetStock,
  updateOrderPaymentStatus,
  updateTransactionStatus
} from './services/orderTransactionService';
import { buildVietQrImageUrl, getBankInfoFromSharePoint, type IBankInfoRecord } from './services/bankInfoService';
import styles from './OrderWorkspace.module.scss';

export interface IOrderWorkspaceProps {
  userDisplayName: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
}

type TWorkspaceTab = 'register' | 'cart' | 'orders' | 'admin';

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

function padTwoDigits(value: number): string {
  return value < 10 ? '0' + String(value) : String(value);
}

function getOrderStateFromStatuses(
  paymentStatus: string,
  handoverStatus: string
): Pick<IOrderDetail, 'currentStep' | 'paymentStatus' | 'handoverStatus'> {
  if (handoverStatus === 'Da ban giao') {
    return {
      currentStep: 'Hoàn tất',
      paymentStatus: paymentStatus || 'Da thanh toan',
      handoverStatus: 'Da ban giao'
    };
  }

  if (paymentStatus === 'Da thanh toan') {
    return {
      currentStep: 'Bàn giao',
      paymentStatus: 'Da thanh toan',
      handoverStatus: handoverStatus || 'Cho ban giao'
    };
  }

  return {
    currentStep: 'Thanh toán',
    paymentStatus: paymentStatus || 'Cho xac nhan',
    handoverStatus: handoverStatus || 'Chua ban giao'
  };
}

function mapLineRecordToOrderItem(
  orderId: string,
  line: IUserTransactionLineRecord,
  assets: IAssetItem[],
  index: number
): IOrderItem {
  const matchedAsset: IAssetItem | undefined = assets.filter((asset: IAssetItem) => asset.assetCode === line.productCode)[0];

  return {
    id: orderId + '-' + padTwoDigits(index + 1),
    assetId: matchedAsset ? matchedAsset.id : line.productCode,
    assetCode: line.productCode,
    assetName: matchedAsset ? matchedAsset.assetName : line.productCode,
    condition: matchedAsset ? matchedAsset.condition : 'Chua cap nhat',
    site: matchedAsset ? matchedAsset.site : 'Chua cap nhat',
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    amount: line.lineTotal,
    imageUrl: matchedAsset ? matchedAsset.imageUrl : createAssetPlaceholder(line.productCode),
    barcode: matchedAsset ? matchedAsset.barcode : ''
  };
}

function mapTransactionRecordToOrderDetail(
  record: IUserTransactionRecord,
  assets: IAssetItem[],
  bankInfo: IBankInfoRecord | undefined
): IOrderDetail {
  const orderState = getOrderStateFromStatuses(record.paymentStatus, record.status);
  const compactBuyerName: string = sanitizeBuyerName(record.buyerName);
  const orderItems: IOrderItem[] = record.items.map((line: IUserTransactionLineRecord, index: number) =>
    mapLineRecordToOrderItem(record.orderId, line, assets, index)
  );
  const bankName: string = bankInfo ? bankInfo.bankName : 'Techcombank';
  const accountName: string = bankInfo ? bankInfo.accountName : 'BAN HAN';
  const accountNumber: string = bankInfo ? bankInfo.accountNumber : '';
  const qrImageUrl: string =
    bankInfo && bankInfo.accountNumber
      ? buildVietQrImageUrl(bankInfo.qrBankSlug, bankInfo.accountNumber)
      : createQrPlaceholder();

  return {
    orderId: record.orderId,
    orderCode: record.orderCode,
    buyerName: record.buyerName,
    buyerEmail: record.buyerEmail,
    purchaseDate: record.purchaseDate,
    totalAmount: record.totalAmount,
    currentStep: orderState.currentStep,
    paymentStatus: orderState.paymentStatus,
    handoverStatus: orderState.handoverStatus,
    bankAccount: {
      bankName: bankName,
      accountName: accountName,
      accountNumber: accountNumber,
      logoUrl: techcombankLogo
    },
    paymentQr: {
      qrImageUrl: qrImageUrl,
      transferContent: 'TT ' + record.orderCode + ' ' + compactBuyerName,
      amount: record.totalAmount
    },
    items: orderItems
  };
}

function mapOrderDetailToTransactionRecord(orderDetail: IOrderDetail, userEmail: string): IUserTransactionRecord {
  return {
    orderId: orderDetail.orderId,
    orderCode: orderDetail.orderCode,
    buyerName: orderDetail.buyerName,
    buyerEmail: userEmail,
    purchaseDate: orderDetail.purchaseDate,
    totalAmount: orderDetail.totalAmount,
    totalQuantity: orderDetail.items.reduce((sum: number, item: IOrderItem) => sum + item.quantity, 0),
    status: orderDetail.handoverStatus,
    paymentStatus: orderDetail.paymentStatus,
    items: orderDetail.items.map((item: IOrderItem): IUserTransactionLineRecord => ({
      productCode: item.assetCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.amount
    }))
  };
}

export function OrderWorkspace(props: IOrderWorkspaceProps): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<TWorkspaceTab>('register');
  const [transactionRecords, setTransactionRecords] = React.useState<IUserTransactionRecord[]>([]);
  const [adminTransactionRecords, setAdminTransactionRecords] = React.useState<IUserTransactionRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [assets, setAssets] = React.useState<IAssetItem[]>([]);
  const [bankInfo, setBankInfo] = React.useState<IBankInfoRecord | undefined>(undefined);
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

  React.useEffect(() => {
    getAllTransactions(props.siteUrl, props.spHttpClient)
      .then((records: IUserTransactionRecord[]): void => {
        setAdminTransactionRecords(records);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Khong the tai danh sach giao dich admin', error);
      });
  }, [props.siteUrl, props.spHttpClient]);

  React.useEffect(() => {
    getBankInfoFromSharePoint(props.siteUrl, props.spHttpClient)
      .then((record: IBankInfoRecord | undefined): void => {
        setBankInfo(record);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Khong the tai thong tin ngan hang', error);
      });
  }, [props.siteUrl, props.spHttpClient]);

  const orders: IOrderDetail[] = React.useMemo((): IOrderDetail[] => {
    return transactionRecords.map((record: IUserTransactionRecord): IOrderDetail => {
      return mapTransactionRecordToOrderDetail(record, assets, bankInfo);
    });
  }, [assets, bankInfo, transactionRecords]);

  const adminOrders: IOrderDetail[] = React.useMemo((): IOrderDetail[] => {
    return adminTransactionRecords.map((record: IUserTransactionRecord): IOrderDetail => {
      return mapTransactionRecordToOrderDetail(record, assets, bankInfo);
    });
  }, [adminTransactionRecords, assets, bankInfo]);

  const purchasedCount: number = React.useMemo((): number => {
    return transactionRecords.reduce((total: number, record: IUserTransactionRecord): number => {
      return total + record.totalQuantity;
    }, 0);
  }, [transactionRecords]);

  const handleAssetsLoaded = React.useCallback((items: IAssetItem[]): void => {
    setAssets(items);
  }, []);

  function handlePurchaseSuccess(orderDetail: IOrderDetail): void {
    const nextRecord: IUserTransactionRecord = mapOrderDetailToTransactionRecord(orderDetail, props.userEmail);

    setTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
      return [nextRecord].concat(prevRecords);
    });
    setAdminTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
      return [nextRecord].concat(prevRecords);
    });
    setSelectedOrderId(orderDetail.orderId);
    setActiveTab('orders');
  }

  function getOrderById(orderId: string): IOrderDetail | null {
    const sourceOrders: IOrderDetail[] = activeTab === 'admin' ? adminOrders : orders;
    const matchedOrder: IOrderDetail[] = sourceOrders.filter((order: IOrderDetail) => order.orderId === orderId);
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
    setAdminTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
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

  function updatePaymentStatusInState(orderId: string, paymentStatus: string): void {
    setTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
      return prevRecords.map((record: IUserTransactionRecord): IUserTransactionRecord => {
        if (record.orderId !== orderId) {
          return record;
        }

        return {
          ...record,
          paymentStatus
        };
      });
    });
    setAdminTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
      return prevRecords.map((record: IUserTransactionRecord): IUserTransactionRecord => {
        if (record.orderId !== orderId) {
          return record;
        }

        return {
          ...record,
          paymentStatus
        };
      });
    });
  }

  function handleConfirmPayment(orderId: string): void {
    const targetOrder: IOrderDetail | null = getOrderById(orderId);

    if (!targetOrder || !targetOrder.items.length) {
      return;
    }

    const stockUpdates: Array<{ assetId: string; nextStock: number }> = [];

    for (let index: number = 0; index < targetOrder.items.length; index += 1) {
      const orderItem: IOrderItem = targetOrder.items[index];
      const matchedAsset: IAssetItem | undefined = assets.filter((asset: IAssetItem) => {
        return asset.id === orderItem.assetId || asset.assetCode === orderItem.assetCode;
      })[0];

      if (!matchedAsset) {
        window.alert('Khong tim thay tai san de tru ton: ' + orderItem.assetCode);
        return;
      }

      const nextStock: number = matchedAsset.availableQuantity - orderItem.quantity;

      if (nextStock < 0) {
        window.alert('So luong ton hien tai khong du de xac nhan thanh toan.');
        return;
      }

      stockUpdates.push({
        assetId: matchedAsset.id,
        nextStock
      });
    }

    createPaymentHistoryItem({
      siteUrl: props.siteUrl,
      spHttpClient: props.spHttpClient,
      transferContent: targetOrder.paymentQr.transferContent,
      paymentConfirmedAt: new Date().toISOString()
    })
      .then((): Promise<void> => {
        return updateOrderPaymentStatus({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          orderId: targetOrder.orderCode,
          paymentStatus: 'Da thanh toan'
        });
      })
      .then((): Promise<void> => {
        return updateTransactionStatus({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          orderId: targetOrder.orderCode,
          status: 'Cho ban giao'
        });
      })
      .then((): Promise<void[]> => {
        return Promise.all(
          stockUpdates.map((stockUpdate) =>
            updateAssetStock({
              siteUrl: props.siteUrl,
              spHttpClient: props.spHttpClient,
              assetItemId: stockUpdate.assetId,
              nextStock: stockUpdate.nextStock
            })
          )
        );
      })
      .then((): void => {
        setAssets((prevAssets: IAssetItem[]): IAssetItem[] => {
          return prevAssets.map((asset: IAssetItem): IAssetItem => {
            const matchedUpdate = stockUpdates.filter((stockUpdate) => stockUpdate.assetId === asset.id)[0];

            if (!matchedUpdate) {
              return asset;
            }

            return {
              ...asset,
              totalQuantity: matchedUpdate.nextStock,
              availableQuantity: matchedUpdate.nextStock,
              statusText: matchedUpdate.nextStock > 0 ? 'Con hang' : 'Het hang'
            };
          });
        });

        updatePaymentStatusInState(orderId, 'Da thanh toan');
        updateTransactionStatusInState(orderId, 'Cho ban giao');
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
  }

  function showOrderList(): void {
    setSelectedOrderId(null);
    setActiveTab('orders');
  }

  function showAdminList(): void {
    setSelectedOrderId(null);
    setActiveTab('admin');
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
                (activeTab === 'cart' ? styles.menuButtonActive : '') +
                ' ' +
                (isSidebarCollapsed ? styles.menuButtonCollapsed : '')
              }
              onClick={(): void => {
                setActiveTab('cart');
              }}
              aria-label="Gio hang"
              title="Gio hang"
            >
              <span className={styles.menuIcon} aria-hidden="true">
                C
              </span>
              {!isSidebarCollapsed && (
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Gio hang</span>
                  <span className={styles.menuHint}>Quan ly cac san pham da them vao gio</span>
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

            <button
              type="button"
              className={
                styles.menuButton +
                ' ' +
                (activeTab === 'admin' ? styles.menuButtonActive : '') +
                ' ' +
                (isSidebarCollapsed ? styles.menuButtonCollapsed : '')
              }
              onClick={showAdminList}
              aria-label={'Quan ly giao dich admin ' + String(adminOrders.length)}
              title={'Quan ly giao dich admin (' + String(adminOrders.length) + ')'}
            >
              <span className={styles.menuIcon} aria-hidden="true">
                A
              </span>
              {!isSidebarCollapsed && (
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Quan ly giao dich</span>
                  <span className={styles.menuHint}>Theo doi tat ca don hang ({adminOrders.length})</span>
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
          ) : activeTab === 'cart' ? (
            <CartPage
              userDisplayName={props.userDisplayName}
              userEmail={props.userEmail}
              spHttpClient={props.spHttpClient}
              siteUrl={props.siteUrl}
              purchasedCount={purchasedCount}
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
          ) : activeTab === 'admin' ? (
            <AdminTransactionPage orders={adminOrders} onOpenOrder={openOrderDetail} />
          ) : (
            <OrderListPage orders={orders} onOpenOrder={openOrderDetail} />
          )}
        </div>
      </div>
    </div>
  );
}
