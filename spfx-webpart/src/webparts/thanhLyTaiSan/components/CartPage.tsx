import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { CartPanel } from './CartPanel';
import type { IAssetItem, ICartItem } from './types';
import type { IOrderDetail } from './orderDetail/types';
import { createOrderDetailFromCartItems } from './orderDetail/mockOrderDetail';
import { getAssetsFromSharePoint } from './services/assetCatalogService';
import { clearCartItems, getCartItemsByUser, upsertCartItem } from './services/cartService';
import {
  createTransactionItem,
  generateUniqueOrderId,
  rollbackTransactionOrder,
  updateAssetStock
} from './services/orderTransactionService';
import styles from './CartPage.module.scss';

const SHAREPOINT_LIST_TITLE: string = 'lstSanPham';
const PURCHASE_LIMIT: number = 5;

interface IPreparedStockUpdate {
  assetItemId: string;
  previousStock: number;
  nextStock: number;
}

export interface ICartPageProps {
  userDisplayName?: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
  purchasedCount: number;
  onPurchaseSuccess?: (orderDetail: IOrderDetail) => void;
}

function formatCartItems(
  assets: IAssetItem[],
  cartRecords: Array<{ productCode: string; quantity: number; unitPrice: number; lineTotal: number }>
): ICartItem[] {
  return cartRecords
    .map((record) => {
      const matchedAsset: IAssetItem | undefined = assets.filter((asset: IAssetItem) => asset.assetCode === record.productCode)[0];

      if (!matchedAsset) {
        return undefined;
      }

      return {
        productCode: record.productCode,
        assetId: matchedAsset.id,
        assetName: matchedAsset.assetName,
        category: matchedAsset.category,
        condition: matchedAsset.condition,
        site: matchedAsset.site,
        quantity: record.quantity,
        unitPrice: record.unitPrice,
        lineTotal: record.lineTotal,
        imageUrl: matchedAsset.imageUrl,
        barcode: matchedAsset.barcode,
        availableQuantity: matchedAsset.availableQuantity
      };
    })
    .filter((item): item is ICartItem => !!item);
}

async function applyStockUpdatesWithRollback(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  orderId: string,
  stockUpdates: IPreparedStockUpdate[]
): Promise<void> {
  const appliedUpdates: IPreparedStockUpdate[] = [];

  try {
    for (let index: number = 0; index < stockUpdates.length; index += 1) {
      const stockUpdate: IPreparedStockUpdate = stockUpdates[index];

      await updateAssetStock({
        siteUrl,
        spHttpClient,
        assetItemId: stockUpdate.assetItemId,
        nextStock: stockUpdate.nextStock
      });

      appliedUpdates.push(stockUpdate);
    }
  } catch (stockError) {
    await Promise.all(
      appliedUpdates.map((stockUpdate: IPreparedStockUpdate) =>
        updateAssetStock({
          siteUrl,
          spHttpClient,
          assetItemId: stockUpdate.assetItemId,
          nextStock: stockUpdate.previousStock
        }).catch((rollbackError) => {
          // eslint-disable-next-line no-console
          console.error('Không thể hoàn tác tồn kho cho sản phẩm', stockUpdate.assetItemId, rollbackError);
        })
      )
    );

    await rollbackTransactionOrder({
      siteUrl,
      spHttpClient,
      orderId
    }).catch((rollbackOrderError: Error) => {
      // eslint-disable-next-line no-console
      console.error('Không thể hoàn tác đơn hàng sau khi lỗi trừ tồn', rollbackOrderError);
    });

    throw stockError;
  }
}

export function CartPage(props: ICartPageProps): React.ReactElement {
  const displayName: string = props.userDisplayName || '';
  const [assets, setAssets] = React.useState<IAssetItem[]>([]);
  const [cartItems, setCartItems] = React.useState<ICartItem[]>([]);
  const [selectedCartProductCodes, setSelectedCartProductCodes] = React.useState<string[]>([]);
  const [isCheckingOut, setIsCheckingOut] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>('');
  const remainingLimit: number = Math.max(PURCHASE_LIMIT - props.purchasedCount, 0);
  const cartQuantity: number = cartItems.reduce((sum: number, item: ICartItem) => sum + item.quantity, 0);

  const loadCartItems = React.useCallback(
    (assetSource: IAssetItem[]) => {
      return getCartItemsByUser(props.siteUrl, props.spHttpClient, props.userEmail).then((records) => {
        const nextCartItems: ICartItem[] = formatCartItems(assetSource, records);
        setCartItems(nextCartItems);
        setSelectedCartProductCodes((prevSelected: string[]) => {
          const nextCodes: string[] = nextCartItems.map((item: ICartItem) => item.productCode);
          return prevSelected.filter((code: string) => nextCodes.indexOf(code) >= 0);
        });
      });
    },
    [props.siteUrl, props.spHttpClient, props.userEmail]
  );

  React.useEffect(() => {
    let isMounted: boolean = true;

    setIsLoading(true);
    setLoadError('');

    getAssetsFromSharePoint({
      siteUrl: props.siteUrl,
      listTitle: SHAREPOINT_LIST_TITLE,
      spHttpClient: props.spHttpClient
    })
      .then((items: IAssetItem[]) => {
        if (!isMounted) {
          return;
        }

        setAssets(items);
        return loadCartItems(items);
      })
      .then(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      })
      .catch((error: Error) => {
        if (!isMounted) {
          return;
        }

        // eslint-disable-next-line no-console
        console.error('Không thể tải giỏ hàng', error);
        setLoadError('Không tải được giỏ hàng từ SharePoint.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [loadCartItems, props.siteUrl, props.spHttpClient]);

  const handleToggleCartSelection = React.useCallback((productCode: string, checked: boolean) => {
    setSelectedCartProductCodes((prevState: string[]) => {
      if (checked) {
        return prevState.indexOf(productCode) >= 0 ? prevState : prevState.concat(productCode);
      }

      return prevState.filter((code: string) => code !== productCode);
    });
  }, []);

  const handleCartQuantityChange = React.useCallback(
    (productCode: string, quantity: number) => {
      const cartItem: ICartItem | undefined = cartItems.filter((item: ICartItem) => item.productCode === productCode)[0];

      if (!cartItem) {
        return;
      }

      const sanitizedQuantity: number = Math.max(1, Math.min(quantity || 1, cartItem.availableQuantity));
      const otherQuantity: number = cartQuantity - cartItem.quantity;
      const maxAvailableForItem: number = Math.max(remainingLimit - otherQuantity, 0);

      if (maxAvailableForItem < 1) {
        window.alert('Bạn đã đạt giới hạn mua tối đa.');
        return;
      }

      if (sanitizedQuantity > maxAvailableForItem) {
        window.alert('Bạn đã đăng ký vượt quá giới hạn mua. Vui lòng giảm số lượng.');
      }

      const allowedQuantity: number = Math.min(sanitizedQuantity, maxAvailableForItem);

      upsertCartItem({
        siteUrl: props.siteUrl,
        spHttpClient: props.spHttpClient,
        buyerName: displayName,
        buyerEmail: props.userEmail,
        productCode,
        quantity: allowedQuantity,
        unitPrice: cartItem.unitPrice
      })
        .then(() => loadCartItems(assets))
        .catch((error: Error) => {
          // eslint-disable-next-line no-console
          console.error('Không thể cập nhật giỏ hàng', error);
          window.alert('Không thể cập nhật giỏ hàng trên SharePoint.');
        });
    },
    [assets, cartItems, cartQuantity, displayName, loadCartItems, props.siteUrl, props.spHttpClient, props.userEmail, remainingLimit]
  );

  const handleRemoveCartItem = React.useCallback(
    (productCode: string) => {
      clearCartItems({
        siteUrl: props.siteUrl,
        spHttpClient: props.spHttpClient,
        buyerEmail: props.userEmail,
        productCodes: [productCode]
      })
        .then(() => loadCartItems(assets))
        .catch((error: Error) => {
          // eslint-disable-next-line no-console
          console.error('Không thể xóa khỏi giỏ hàng', error);
          window.alert('Không thể xóa sản phẩm khỏi giỏ hàng trên SharePoint.');
        });
    },
    [assets, loadCartItems, props.siteUrl, props.spHttpClient, props.userEmail]
  );

  const handleCheckoutSelected = React.useCallback(() => {
    const selectedItems: ICartItem[] = cartItems.filter((item: ICartItem) => selectedCartProductCodes.indexOf(item.productCode) >= 0);

    if (!selectedItems.length) {
      window.alert('Vui lòng chọn ít nhất một sản phẩm trong giỏ hàng.');
      return;
    }

    setIsCheckingOut(true);

    getAssetsFromSharePoint({
      siteUrl: props.siteUrl,
      listTitle: SHAREPOINT_LIST_TITLE,
      spHttpClient: props.spHttpClient
    })
      .then((latestAssets: IAssetItem[]) => {
        const stockUpdates: IPreparedStockUpdate[] = [];
        const unavailableItems: ICartItem[] = selectedItems.filter((selectedItem: ICartItem) => {
          const latestAsset: IAssetItem | undefined = latestAssets.filter((asset: IAssetItem) => asset.assetCode === selectedItem.productCode)[0];

          if (latestAsset && latestAsset.availableQuantity >= selectedItem.quantity) {
            stockUpdates.push({
              assetItemId: latestAsset.id,
              previousStock: latestAsset.availableQuantity,
              nextStock: latestAsset.availableQuantity - selectedItem.quantity
            });
          }

          return !latestAsset || latestAsset.availableQuantity < selectedItem.quantity;
        });

        if (unavailableItems.length) {
          const unavailableNames: string = unavailableItems.map((item: ICartItem) => item.assetName).join(', ');
          setAssets(latestAssets);
          window.alert('Sản phẩm không còn đủ số lượng để tạo đơn: ' + unavailableNames + '. Vui lòng chọn sản phẩm khác.');
          throw new Error('Insufficient stock for selected items.');
        }

        setAssets(latestAssets);
        return generateUniqueOrderId(props.siteUrl, props.spHttpClient).then((generatedOrderId: string) => ({
          generatedOrderId,
          latestAssets,
          stockUpdates
        }));
      })
      .then((payload: { generatedOrderId: string; latestAssets: IAssetItem[]; stockUpdates: IPreparedStockUpdate[] }) => {
        const nextOrder: IOrderDetail = createOrderDetailFromCartItems(selectedItems, displayName, payload.generatedOrderId);

        return createTransactionItem({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          buyerName: displayName,
          buyerEmail: props.userEmail,
          orderDetail: nextOrder
        }).then(() =>
          applyStockUpdatesWithRollback(props.siteUrl, props.spHttpClient, nextOrder.orderCode, payload.stockUpdates).then(() => ({
            createdOrder: nextOrder,
            latestAssets: payload.latestAssets
          }))
        );
      })
      .then((payload: { createdOrder: IOrderDetail; latestAssets: IAssetItem[] }) => {
        return clearCartItems({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          buyerEmail: props.userEmail,
          productCodes: selectedItems.map((item: ICartItem) => item.productCode)
        }).then(() => payload);
      })
      .then((payload: { createdOrder: IOrderDetail; latestAssets: IAssetItem[] }) => {
        const nextAssets: IAssetItem[] = payload.latestAssets.map((asset: IAssetItem): IAssetItem => {
          const selectedItem: ICartItem | undefined = selectedItems.filter((item: ICartItem) => item.assetId === asset.id)[0];

          if (!selectedItem) {
            return asset;
          }

          const nextStock: number = Math.max(asset.availableQuantity - selectedItem.quantity, 0);

          return {
            ...asset,
            totalQuantity: nextStock,
            availableQuantity: nextStock,
            statusText: nextStock > 0 ? 'Còn hàng' : 'Hết hàng'
          };
        });

        setAssets(nextAssets);
        return loadCartItems(nextAssets).then(() => payload.createdOrder);
      })
      .then((createdOrder: IOrderDetail) => {
        setSelectedCartProductCodes([]);

        if (typeof window !== 'undefined' && window.alert) {
          window.alert('Tạo đơn hàng thành công. Mã đơn hàng: ' + createdOrder.orderCode);
        }

        if (props.onPurchaseSuccess) {
          props.onPurchaseSuccess(createdOrder);
        }
      })
      .catch((error: Error) => {
        // eslint-disable-next-line no-console
        console.error('Không thể tạo đơn mua trên SharePoint', error);

        if (error.message === 'Insufficient stock for selected items.') {
          return;
        }

        window.alert('Không thể tạo đơn mua trên SharePoint. Nếu hệ thống đã tạo đơn nhưng trừ tồn thất bại, đơn đã được hoàn tác tự động.');
      })
      .then(
        () => {
          setIsCheckingOut(false);
        },
        () => {
          setIsCheckingOut(false);
        }
      );
  }, [cartItems, displayName, loadCartItems, props, selectedCartProductCodes]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <strong className={styles.title}>Quản lý giỏ hàng</strong>
          <span className={styles.subtitle}>Cập nhật số lượng, xóa sản phẩm và tạo đơn mua từ các mục đã chọn.</span>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>Đang tải giỏ hàng...</div>
      ) : loadError ? (
        <div className={styles.errorState}>{loadError}</div>
      ) : (
        <CartPanel
          items={cartItems}
          selectedProductCodes={selectedCartProductCodes}
          maxSelectableQuantity={remainingLimit}
          isCheckingOut={isCheckingOut}
          onToggleSelection={handleToggleCartSelection}
          onQuantityChange={handleCartQuantityChange}
          onRemove={handleRemoveCartItem}
          onCheckoutSelected={handleCheckoutSelected}
        />
      )}
    </div>
  );
}
