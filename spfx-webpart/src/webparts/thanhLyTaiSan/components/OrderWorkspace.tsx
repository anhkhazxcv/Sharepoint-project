import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { AssetLiquidationPage } from './AssetLiquidationPage';
import { CartPage } from './CartPage';
import { FullscreenLoadingOverlay } from './FullscreenLoadingOverlay';
import { useToast } from './ToastProvider';
import { AdminTransactionPage } from './orderDetail/AdminTransactionPage';
import { OrderDetailPage } from './orderDetail/OrderDetailPage';
import { OrderListPage } from './orderDetail/OrderListPage';
import logoMag from '../assets/logoMAG.png';
import techcombankLogo from '../assets/techcombank-1.png';
import type { IOrderDetail, IOrderItem } from './orderDetail/types';
import type { IAssetItem } from './types';
import { getAssetsFromSharePoint } from './services/assetCatalogService';
import {
  getAllTransactions,
  getTransactionsByUser,
  rollbackTransactionOrder,
  type IUserTransactionLineRecord,
  type IUserTransactionRecord,
  updateAssetStock,
  updateOrderPaymentStatus,
  updateTransactionStatus
} from './services/orderTransactionService';
import { buildVietQrImageUrl, getBankInfoFromSharePoint, type IBankInfoRecord } from './services/bankInfoService';
import { isUserAdmin } from './services/roleService';
import styles from './OrderWorkspace.module.scss';

export interface IOrderWorkspaceProps {
  userDisplayName: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
}

type TWorkspaceTab = 'register' | 'cart' | 'orders' | 'admin';
const SHAREPOINT_LIST_TITLE: string = 'lstSanPham';

interface IPreparedRestoreStockUpdate {
  assetCode: string;
  assetItemId: string;
  previousStock: number;
  nextStock: number;
}

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

function buildTransferContent(buyerName: string, orderId: string): string {
  const normalizedBuyerName: string = (buyerName || 'CBNV').trim();
  const normalizedOrderId: string = (orderId || '').trim();

  return (normalizedBuyerName + ' ' + normalizedOrderId).trim();
}

function padTwoDigits(value: number): string {
  return value < 10 ? '0' + String(value) : String(value);
}

function renderMenuIcon(icon: 'register' | 'cart' | 'orders' | 'admin'): React.ReactElement {
  if (icon === 'register') {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 4.75h7.5l3.75 3.75V19A1.25 1.25 0 0 1 17 20.25H7A1.25 1.25 0 0 1 5.75 19V6A1.25 1.25 0 0 1 7 4.75Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14.5 4.75V8.5h3.75" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.5 12h6.5M8.5 15.5h6.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === 'cart') {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.5 6.25h1.8l1.4 7.15a1 1 0 0 0 .98.8h7.88a1 1 0 0 0 .97-.76l1.18-5.19H7.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="17.75" r="1.25" fill="currentColor" />
        <circle cx="16" cy="17.75" r="1.25" fill="currentColor" />
      </svg>
    );
  }

  if (icon === 'orders') {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5.25" y="4.75" width="13.5" height="14.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8.5 9h7M8.5 12h7M8.5 15h4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={styles.menuIconSvg} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.75 6.5 6v5.1c0 3.58 2.29 6.84 5.5 7.9 3.21-1.06 5.5-4.32 5.5-7.9V6L12 3.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.5 11.75 11 13.25l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getOrderStateFromStatuses(
  paymentStatus: string,
  handoverStatus: string
): Pick<IOrderDetail, 'currentStep' | 'paymentStatus' | 'handoverStatus'> {
  if (handoverStatus === 'Đã bàn giao') {
    return {
      currentStep: 'Hoàn tất',
      paymentStatus: paymentStatus || 'Đã thanh toán',
      handoverStatus: 'Đã bàn giao'
    };
  }

  if (paymentStatus === 'Đã thanh toán') {
    return {
      currentStep: 'Bàn giao',
      paymentStatus: 'Đã thanh toán',
      handoverStatus: handoverStatus || 'Chờ bàn giao'
    };
  }

  return {
    currentStep: 'Thanh toán',
    paymentStatus: paymentStatus || 'Chờ xác nhận',
    handoverStatus: handoverStatus || 'Chưa bàn giao'
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
    condition: matchedAsset ? matchedAsset.condition : 'Chưa cập nhật',
    site: matchedAsset ? matchedAsset.site : 'Chưa cập nhật',
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
  const transferContent: string = buildTransferContent(record.buyerName, record.orderId);
  const orderItems: IOrderItem[] = record.items.map((line: IUserTransactionLineRecord, index: number) =>
    mapLineRecordToOrderItem(record.orderId, line, assets, index)
  );
  const bankName: string = bankInfo ? bankInfo.bankName : 'Techcombank';
  const accountName: string = bankInfo ? bankInfo.accountName : 'BÁN HÀNG';
  const accountNumber: string = bankInfo ? bankInfo.accountNumber : '';
  const qrImageUrl: string =
    bankInfo && bankInfo.accountNumber
      ? buildVietQrImageUrl(
          bankInfo.qrBankSlug,
          bankInfo.accountNumber,
          'compact2',
          record.totalAmount,
          transferContent,
          accountName
        )
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
      bankName,
      accountName,
      accountNumber,
      logoUrl: techcombankLogo
    },
    paymentQr: {
      qrImageUrl,
      transferContent,
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

async function applyRestoreStockUpdatesWithRollback(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  stockUpdates: IPreparedRestoreStockUpdate[]
): Promise<void> {
  const appliedUpdates: IPreparedRestoreStockUpdate[] = [];

  try {
    for (let index: number = 0; index < stockUpdates.length; index += 1) {
      const stockUpdate: IPreparedRestoreStockUpdate = stockUpdates[index];

      await updateAssetStock({
        siteUrl,
        spHttpClient,
        assetItemId: stockUpdate.assetItemId,
        nextStock: stockUpdate.nextStock
      });

      appliedUpdates.push(stockUpdate);
    }
  } catch (error) {
    await Promise.all(
      appliedUpdates.map((stockUpdate: IPreparedRestoreStockUpdate) =>
        updateAssetStock({
          siteUrl,
          spHttpClient,
          assetItemId: stockUpdate.assetItemId,
          nextStock: stockUpdate.previousStock
        }).catch((rollbackError: Error) => {
          // eslint-disable-next-line no-console
          console.error('Không thể hoàn tác tồn kho khi xóa giao dịch', stockUpdate.assetCode, rollbackError);
        })
      )
    );

    throw error;
  }
}

export function OrderWorkspace(props: IOrderWorkspaceProps): React.ReactElement {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = React.useState<TWorkspaceTab>('register');
  const [transactionRecords, setTransactionRecords] = React.useState<IUserTransactionRecord[]>([]);
  const [adminTransactionRecords, setAdminTransactionRecords] = React.useState<IUserTransactionRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [assets, setAssets] = React.useState<IAssetItem[]>([]);
  const [bankInfo, setBankInfo] = React.useState<IBankInfoRecord | undefined>(undefined);
  const [hasAdminRole, setHasAdminRole] = React.useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(false);
  const [pendingApiCount, setPendingApiCount] = React.useState<number>(0);
  const [loadingLabel, setLoadingLabel] = React.useState<string>('Đang tải dữ liệu...');

  const beginLoading = React.useCallback((label: string): void => {
    setLoadingLabel(label);
    setPendingApiCount((prevState: number) => prevState + 1);
  }, []);

  const endLoading = React.useCallback((): void => {
    setPendingApiCount((prevState: number) => Math.max(prevState - 1, 0));
  }, []);

  React.useEffect(() => {
    beginLoading('Đang tải lịch sử giao dịch...');
    getTransactionsByUser(props.siteUrl, props.spHttpClient, props.userEmail)
      .then((records: IUserTransactionRecord[]): void => {
        setTransactionRecords(records);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải lịch sử giao dịch của người dùng', error);
      })
      .then((): void => {
        endLoading();
      })
      .catch((): void => {
        return;
      });
  }, [beginLoading, endLoading, props.siteUrl, props.spHttpClient, props.userEmail]);

  React.useEffect(() => {
    beginLoading('Đang kiểm tra quyền truy cập...');
    isUserAdmin(props.siteUrl, props.spHttpClient, props.userEmail)
      .then((result: boolean): void => {
        setHasAdminRole(result);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể kiểm tra quyền admin', error);
        setHasAdminRole(false);
      })
      .then((): void => {
        endLoading();
      })
      .catch((): void => {
        return;
      });
  }, [beginLoading, endLoading, props.siteUrl, props.spHttpClient, props.userEmail]);

  React.useEffect(() => {
    if (!hasAdminRole) {
      setAdminTransactionRecords([]);
      return;
    }

    beginLoading('Đang tải danh sách giao dịch quản trị...');
    getAllTransactions(props.siteUrl, props.spHttpClient)
      .then((records: IUserTransactionRecord[]): void => {
        setAdminTransactionRecords(records);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải danh sách giao dịch admin', error);
      })
      .then((): void => {
        endLoading();
      })
      .catch((): void => {
        return;
      });
  }, [beginLoading, endLoading, hasAdminRole, props.siteUrl, props.spHttpClient]);

  React.useEffect(() => {
    beginLoading('Đang tải thông tin ngân hàng...');
    getBankInfoFromSharePoint(props.siteUrl, props.spHttpClient)
      .then((record: IBankInfoRecord | undefined): void => {
        setBankInfo(record);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải thông tin ngân hàng', error);
      })
      .then((): void => {
        endLoading();
      })
      .catch((): void => {
        return;
      });
  }, [beginLoading, endLoading, props.siteUrl, props.spHttpClient]);

  React.useEffect(() => {
    if (!hasAdminRole && activeTab === 'admin') {
      setActiveTab('orders');
    }
  }, [activeTab, hasAdminRole]);

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

  function removeOrderFromState(orderId: string): void {
    setTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] =>
      prevRecords.filter((record: IUserTransactionRecord) => record.orderId !== orderId)
    );
    setAdminTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] =>
      prevRecords.filter((record: IUserTransactionRecord) => record.orderId !== orderId)
    );

    if (selectedOrderId === orderId) {
      setSelectedOrderId(null);
      setActiveTab('admin');
    }
  }

  function handleDeleteOrderSafe(orderDetail: IOrderDetail): void {
    if (!hasAdminRole) {
      return;
    }

    if (orderDetail.paymentStatus === 'Đã thanh toán' || orderDetail.handoverStatus === 'Đã bàn giao') {
      showToast('Chỉ được xóa giao dịch chưa thanh toán và chưa bàn giao.', 'error');
      return;
    }

    const shouldDelete: boolean = window.confirm(
      'Xóa giao dịch ' + orderDetail.orderCode + '? Hệ thống sẽ hoàn lại tồn kho cho các sản phẩm trong đơn này.'
    );

    if (!shouldDelete) {
      return;
    }

    beginLoading('Đang xóa giao dịch...');

    getAssetsFromSharePoint({
      siteUrl: props.siteUrl,
      listTitle: SHAREPOINT_LIST_TITLE,
      spHttpClient: props.spHttpClient
    })
      .then((latestAssets: IAssetItem[]) => {
        const restoreQuantityByAssetCode: Record<string, number> = {};

        orderDetail.items.forEach((item: IOrderItem) => {
          restoreQuantityByAssetCode[item.assetCode] = (restoreQuantityByAssetCode[item.assetCode] || 0) + item.quantity;
        });

        const stockUpdates: IPreparedRestoreStockUpdate[] = Object.keys(restoreQuantityByAssetCode).map((assetCode: string) => {
          const latestAsset: IAssetItem | undefined = latestAssets.filter((asset: IAssetItem) => asset.assetCode === assetCode)[0];

          if (!latestAsset) {
            throw new Error('Không tìm thấy sản phẩm ' + assetCode + ' để hoàn tồn kho.');
          }

          return {
            assetCode,
            assetItemId: latestAsset.id,
            previousStock: latestAsset.availableQuantity,
            nextStock: latestAsset.availableQuantity + restoreQuantityByAssetCode[assetCode]
          };
        });

        return applyRestoreStockUpdatesWithRollback(props.siteUrl, props.spHttpClient, stockUpdates).then(() => ({
          latestAssets,
          stockUpdates
        }));
      })
      .then((payload: { latestAssets: IAssetItem[]; stockUpdates: IPreparedRestoreStockUpdate[] }) => {
        return rollbackTransactionOrder({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          orderId: orderDetail.orderCode
        })
          .then(() => payload)
          .catch((error: Error) => {
            const rollbackStockUpdates: IPreparedRestoreStockUpdate[] = payload.stockUpdates.map(
              (stockUpdate: IPreparedRestoreStockUpdate): IPreparedRestoreStockUpdate => ({
                ...stockUpdate,
                previousStock: stockUpdate.nextStock,
                nextStock: stockUpdate.previousStock
              })
            );

            return applyRestoreStockUpdatesWithRollback(props.siteUrl, props.spHttpClient, rollbackStockUpdates).then(() => {
              throw error;
            });
          });
      })
      .then((payload: { latestAssets: IAssetItem[]; stockUpdates: IPreparedRestoreStockUpdate[] }) => {
        const restoredAssets: IAssetItem[] = payload.latestAssets.map((asset: IAssetItem) => {
          const restoredQuantity: number = orderDetail.items
            .filter((item: IOrderItem) => item.assetCode === asset.assetCode)
            .reduce((sum: number, item: IOrderItem) => sum + item.quantity, 0);

          if (!restoredQuantity) {
            return asset;
          }

          const nextStock: number = asset.availableQuantity + restoredQuantity;

          return {
            ...asset,
            totalQuantity: nextStock,
            availableQuantity: nextStock,
            statusText: nextStock > 0 ? 'Còn hàng' : 'Hết hàng'
          };
        });

        setAssets(restoredAssets);
        removeOrderFromState(orderDetail.orderId);
        showToast('Đã xóa giao dịch và hoàn lại tồn kho thành công.', 'success');
      })
      .catch((error: Error) => {
        // eslint-disable-next-line no-console
        console.error('Không thể xóa giao dịch admin', error);
        showToast('Không thể xóa giao dịch trên SharePoint.', 'error');
      })
      .then(() => {
        endLoading();
      })
      .catch((): void => {
        return;
      });
  }

  function handleDeleteOrder(orderDetail: IOrderDetail): void {
    handleDeleteOrderSafe(orderDetail);
    return;

    if (!hasAdminRole) {
      return;
    }

    const shouldDelete: boolean = window.confirm(
      'Xóa giao dịch ' + orderDetail.orderCode + '? Hệ thống sẽ hoàn lại tồn kho cho các sản phẩm trong đơn này.'
    );

    if (!shouldDelete) {
      return;
    }

    beginLoading('Đang xóa giao dịch...');

    getAssetsFromSharePoint({
      siteUrl: props.siteUrl,
      listTitle: SHAREPOINT_LIST_TITLE,
      spHttpClient: props.spHttpClient
    })
      .then((latestAssets: IAssetItem[]) => {
        const nextStocksByAssetCode: Record<string, number> = {};

        orderDetail.items.forEach((item: IOrderItem) => {
          nextStocksByAssetCode[item.assetCode] = (nextStocksByAssetCode[item.assetCode] || 0) + item.quantity;
        });

        return Promise.all(
          Object.keys(nextStocksByAssetCode).map((assetCode: string) => {
            const latestAsset: IAssetItem | undefined = latestAssets.filter((asset: IAssetItem) => asset.assetCode === assetCode)[0];

            if (!latestAsset) {
              throw new Error('Không tìm thấy sản phẩm ' + assetCode + ' để hoàn tồn kho.');
            }

            return updateAssetStock({
              siteUrl: props.siteUrl,
              spHttpClient: props.spHttpClient,
              assetItemId: latestAsset.id,
              nextStock: latestAsset.availableQuantity + nextStocksByAssetCode[assetCode]
            });
          })
        ).then(() => latestAssets);
      })
      .then((latestAssets: IAssetItem[]) => {
        return rollbackTransactionOrder({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          orderId: orderDetail.orderCode
        }).then(() => latestAssets);
      })
      .then((latestAssets: IAssetItem[]) => {
        const restoredAssets: IAssetItem[] = latestAssets.map((asset: IAssetItem) => {
          const restoredQuantity: number = orderDetail.items
            .filter((item: IOrderItem) => item.assetCode === asset.assetCode)
            .reduce((sum: number, item: IOrderItem) => sum + item.quantity, 0);

          if (!restoredQuantity) {
            return asset;
          }

          const nextStock: number = asset.availableQuantity + restoredQuantity;

          return {
            ...asset,
            totalQuantity: nextStock,
            availableQuantity: nextStock,
            statusText: nextStock > 0 ? 'Còn hàng' : 'Hết hàng'
          };
        });

        setAssets(restoredAssets);
        removeOrderFromState(orderDetail.orderId);
        showToast('Đã xóa giao dịch và hoàn lại tồn kho thành công.', 'success');
      })
      .catch((error: Error) => {
        // eslint-disable-next-line no-console
        console.error('Không thể xóa giao dịch admin', error);
        showToast('Không thể xóa giao dịch trên SharePoint.', 'error');
      })
      .then(() => {
        endLoading();
      })
      .catch((): void => {
        return;
      });
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
    if (!hasAdminRole) {
      return;
    }

    const targetOrder: IOrderDetail | null = getOrderById(orderId);

    if (!targetOrder || !targetOrder.items.length) {
      return;
    }

    beginLoading('Đang xác nhận thanh toán...');

    updateOrderPaymentStatus({
      siteUrl: props.siteUrl,
      spHttpClient: props.spHttpClient,
      orderId: targetOrder.orderCode,
      paymentStatus: 'Đã thanh toán'
    })
      .then((): Promise<void> => {
        return updateTransactionStatus({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          orderId: targetOrder.orderCode,
          status: 'Chờ bàn giao'
        });
      })
      .then((): void => {
        updatePaymentStatusInState(orderId, 'Đã thanh toán');
        updateTransactionStatusInState(orderId, 'Chờ bàn giao');
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể xác nhận thanh toán', error);
        showToast('Không thể xác nhận thanh toán trên SharePoint.', 'error');
      })
      .then((): void => {
        endLoading();
      })
      .catch((): void => {
        return;
      });
  }

  function handleConfirmHandover(orderId: string): void {
    if (!hasAdminRole) {
      return;
    }

    const targetOrder: IOrderDetail | null = getOrderById(orderId);

    if (!targetOrder) {
      return;
    }

    beginLoading('Đang xác nhận bàn giao...');

    updateTransactionStatus({
      siteUrl: props.siteUrl,
      spHttpClient: props.spHttpClient,
      orderId: targetOrder.orderCode,
      status: 'Đã bàn giao'
    })
      .then((): void => {
        updateTransactionStatusInState(orderId, 'Đã bàn giao');
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể xác nhận bàn giao', error);
        showToast('Không thể xác nhận bàn giao trên SharePoint.', 'error');
      })
      .then((): void => {
        endLoading();
      })
      .catch((): void => {
        return;
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
    if (!hasAdminRole) {
      return;
    }

    setSelectedOrderId(null);
    setActiveTab('admin');
  }

  const selectedOrder: IOrderDetail | null = selectedOrderId ? getOrderById(selectedOrderId) : null;

  return (
    <div className={styles.workspace}>
      {pendingApiCount > 0 && <FullscreenLoadingOverlay label={loadingLabel} />}
      <div className={styles.layout}>
        <aside className={styles.sidebar + ' ' + (isSidebarCollapsed ? styles.sidebarCollapsed : '')}>
          <div className={styles.sidebarHeader}>
            {!isSidebarCollapsed && (
              <div className={styles.brandBlock}>
                <img className={styles.brandLogo} src={logoMag} alt="Logo MAG" />
                <strong className={styles.brandTitle}>Mua tài sản nội bộ</strong>
              </div>
            )}

            <button
              type="button"
              className={styles.collapseButton}
              onClick={(): void => {
                setIsSidebarCollapsed((prevState: boolean) => !prevState);
              }}
              aria-label={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              title={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              {isSidebarCollapsed ? '>' : '<'}
            </button>
          </div>

          <nav className={styles.menuList} aria-label="Điều hướng chức năng">
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
              aria-label="Đăng ký mua tài sản"
              title="Đăng ký mua tài sản"
            >
              <span className={styles.menuIcon} aria-hidden="true">
                {renderMenuIcon('register')}
              </span>
              {!isSidebarCollapsed && (
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Đăng ký mua</span>
                  <span className={styles.menuHint}>Tìm và đăng ký tài sản thanh lý</span>
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
              aria-label="Giỏ hàng"
              title="Giỏ hàng"
            >
              <span className={styles.menuIcon} aria-hidden="true">
                {renderMenuIcon('cart')}
              </span>
              {!isSidebarCollapsed && (
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Giỏ hàng</span>
                  <span className={styles.menuHint}>Quản lý các sản phẩm đã thêm vào giỏ</span>
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
              aria-label={'Danh sách giao dịch ' + String(orders.length)}
              title={'Danh sách giao dịch (' + String(orders.length) + ')'}
            >
              <span className={styles.menuIcon} aria-hidden="true">
                {renderMenuIcon('orders')}
              </span>
              {!isSidebarCollapsed && (
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Danh sách giao dịch</span>
                  <span className={styles.menuHint}>Tất cả giao dịch của bạn ({orders.length})</span>
                </span>
              )}
            </button>

            {hasAdminRole && (
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
                aria-label={'Quản lý giao dịch admin ' + String(adminOrders.length)}
                title={'Quản lý giao dịch admin (' + String(adminOrders.length) + ')'}
              >
                <span className={styles.menuIcon} aria-hidden="true">
                  {renderMenuIcon('admin')}
                </span>
                {!isSidebarCollapsed && (
                  <span className={styles.menuText}>
                    <span className={styles.menuLabel}>Quản lý giao dịch</span>
                    <span className={styles.menuHint}>Theo dõi tất cả đơn hàng ({adminOrders.length})</span>
                  </span>
                )}
              </button>
            )}
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
              isAdmin={hasAdminRole}
              onConfirmPayment={handleConfirmPayment}
              onConfirmHandover={handleConfirmHandover}
              onDeleteOrder={(orderId: string): void => {
                const targetOrder: IOrderDetail | null = getOrderById(orderId);

                if (targetOrder) {
                  handleDeleteOrder(targetOrder);
                }
              }}
              onBack={(): void => {
                setSelectedOrderId(null);
              }}
            />
          ) : hasAdminRole && activeTab === 'admin' ? (
            <AdminTransactionPage orders={adminOrders} onOpenOrder={openOrderDetail} onDeleteOrder={handleDeleteOrder} />
          ) : (
            <OrderListPage orders={orders} onOpenOrder={openOrderDetail} />
          )}
        </div>
      </div>
    </div>
  );
}
