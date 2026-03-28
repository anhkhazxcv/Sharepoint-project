import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { CartPanel } from './CartPanel';
import type { IAssetItem, ICartItem } from './types';
import type { IOrderDetail } from './orderDetail/types';
import { createOrderDetailFromCartItems } from './orderDetail/mockOrderDetail';
import { getAssetsFromSharePoint } from './services/assetCatalogService';
import { clearCartItems, getCartItemsByUser, upsertCartItem } from './services/cartService';
import { createTransactionItem, generateUniqueOrderId } from './services/orderTransactionService';
import styles from './CartPage.module.scss';

const SHAREPOINT_LIST_TITLE: string = 'lstSanPham';
const PURCHASE_LIMIT: number = 5;

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
        console.error('Khong the tai gio hang', error);
        setLoadError('Khong tai duoc gio hang tu SharePoint.');
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
        window.alert('Ban da dat gioi han mua toi da.');
        return;
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
          console.error('Khong the cap nhat gio hang', error);
          window.alert('Khong the cap nhat gio hang tren SharePoint.');
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
          console.error('Khong the xoa khoi gio hang', error);
          window.alert('Khong the xoa san pham khoi gio hang tren SharePoint.');
        });
    },
    [assets, loadCartItems, props.siteUrl, props.spHttpClient, props.userEmail]
  );

  const handleCheckoutSelected = React.useCallback(() => {
    const selectedItems: ICartItem[] = cartItems.filter((item: ICartItem) => selectedCartProductCodes.indexOf(item.productCode) >= 0);

    if (!selectedItems.length) {
      window.alert('Vui long chon it nhat mot san pham trong gio hang.');
      return;
    }

    setIsCheckingOut(true);

    generateUniqueOrderId(props.siteUrl, props.spHttpClient)
      .then((generatedOrderId: string) => {
        const nextOrder: IOrderDetail = createOrderDetailFromCartItems(selectedItems, displayName, generatedOrderId);

        return createTransactionItem({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          buyerName: displayName,
          buyerEmail: props.userEmail,
          orderDetail: nextOrder
        }).then(() => nextOrder);
      })
      .then((createdOrder: IOrderDetail) => {
        return clearCartItems({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          buyerEmail: props.userEmail,
          productCodes: selectedItems.map((item: ICartItem) => item.productCode)
        }).then(() => createdOrder);
      })
      .then((createdOrder: IOrderDetail) => {
        return loadCartItems(assets).then(() => createdOrder);
      })
      .then((createdOrder: IOrderDetail) => {
        setSelectedCartProductCodes([]);

        if (typeof window !== 'undefined' && window.alert) {
          window.alert('Tao don hang thanh cong. Ma don hang: ' + createdOrder.orderCode);
        }

        if (props.onPurchaseSuccess) {
          props.onPurchaseSuccess(createdOrder);
        }
      })
      .catch((error: Error) => {
        // eslint-disable-next-line no-console
        console.error('Khong the tao don mua tren SharePoint', error);
        window.alert('Khong the tao don mua tren SharePoint. Vui long thu lai hoac lien he IT Support.');
      })
      .then(
        () => {
          setIsCheckingOut(false);
        },
        () => {
          setIsCheckingOut(false);
        }
      );
  }, [assets, cartItems, displayName, loadCartItems, props, selectedCartProductCodes]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <strong className={styles.title}>Quan ly gio hang</strong>
          <span className={styles.subtitle}>Cap nhat so luong, xoa san pham va tao don mua tu cac muc da chon.</span>
        </div>
        <div className={styles.meta}>
          <span>Site: {props.siteUrl}</span>
          <span>Gioi han con lai: {remainingLimit}</span>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>Dang tai gio hang...</div>
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
