import * as React from 'react';
import { AssetGrid } from './AssetGrid';
import { FilterBar } from './FilterBar';
import { MOCK_ASSETS, PURCHASE_LIMIT, USER_DISPLAY_NAME } from './mockData';
import type { IPurchasePayload, IAssetFilters, IAssetItem } from './types';
import { createOrderDetailFromPurchase } from './orderDetail/mockOrderDetail';
import type { IOrderDetail } from './orderDetail/types';
import styles from './AssetLiquidationPage.module.scss';

export interface IAssetLiquidationPageProps {
  userDisplayName?: string;
  onPurchaseSuccess?: (orderDetail: IOrderDetail) => void;
}

const defaultFilters: IAssetFilters = {
  category: '',
  condition: '',
  site: ''
};

function stripVietnamese(input: string): string {
  return input
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[ÌÍỊỈĨ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/[ỲÝỴỶỸ]/g, 'y')
    .replace(/[đ]/g, 'd')
    .replace(/[Đ]/g, 'd');
}

function normalizeKeyword(value: string): string {
  return stripVietnamese(value.trim().toLowerCase());
}

function getUniqueValues(items: IAssetItem[], key: keyof IAssetItem): string[] {
  const results: string[] = [];

  items.forEach((item: IAssetItem) => {
    const value: string = String(item[key]);

    if (results.indexOf(value) === -1) {
      results.push(value);
    }
  });

  return results;
}

function getAssetStatusText(availableQuantity: number): string {
  return availableQuantity > 0 ? 'Còn hàng' : 'Hết hàng';
}

export function AssetLiquidationPage(props: IAssetLiquidationPageProps): React.ReactElement {
  const displayName: string = props.userDisplayName || USER_DISPLAY_NAME;
  const [assets, setAssets] = React.useState<IAssetItem[]>(MOCK_ASSETS);
  const [filters, setFilters] = React.useState<IAssetFilters>(defaultFilters);
  const [searchValue, setSearchValue] = React.useState<string>('');
  const [quantityInputs, setQuantityInputs] = React.useState<Record<string, string>>({});
  const [quantityErrors, setQuantityErrors] = React.useState<Record<string, string>>({});
  const [purchasedCount, setPurchasedCount] = React.useState<number>(2);

  const categories: string[] = React.useMemo(() => getUniqueValues(MOCK_ASSETS, 'category'), []);
  const conditions: string[] = React.useMemo(() => getUniqueValues(MOCK_ASSETS, 'condition'), []);
  const sites: string[] = React.useMemo(() => getUniqueValues(MOCK_ASSETS, 'site'), []);

  const remainingLimit: number = Math.max(PURCHASE_LIMIT - purchasedCount, 0);

  const visibleAssets: IAssetItem[] = React.useMemo(() => {
    const keyword: string = normalizeKeyword(searchValue);

    return assets.filter((asset: IAssetItem) => {
      const matchesCategory: boolean = !filters.category || asset.category === filters.category;
      const matchesCondition: boolean = !filters.condition || asset.condition === filters.condition;
      const matchesSite: boolean = !filters.site || asset.site === filters.site;
      const matchesSearch: boolean =
        !keyword ||
        normalizeKeyword(asset.assetCode).indexOf(keyword) >= 0 ||
        normalizeKeyword(asset.assetName).indexOf(keyword) >= 0;

      return matchesCategory && matchesCondition && matchesSite && matchesSearch;
    });
  }, [assets, filters, searchValue]);

  const updateQuantityState = React.useCallback(
    (asset: IAssetItem, rawValue: string) => {
      let nextValue: string = rawValue.replace(/[^\d]/g, '');
      let errorMessage: string = '';

      if (nextValue === '') {
        setQuantityInputs((prevState) => ({
          ...prevState,
          [asset.id]: ''
        }));
        setQuantityErrors((prevState) => ({
          ...prevState,
          [asset.id]: ''
        }));
        return;
      }

      const parsedValue: number = Number(nextValue);

      if (parsedValue === 0) {
        errorMessage = 'Số lượng mua phải lớn hơn 0.';
      }

      if (parsedValue > asset.availableQuantity) {
        nextValue = String(asset.availableQuantity);
        errorMessage = `Số lượng tối đa là ${asset.availableQuantity}.`;
      }

      if (Number(nextValue) > remainingLimit) {
        nextValue = String(remainingLimit);
        errorMessage = `Bạn chỉ còn được mua ${remainingLimit} tài sản.`;
      }

      setQuantityInputs((prevState) => ({
        ...prevState,
        [asset.id]: nextValue
      }));
      setQuantityErrors((prevState) => ({
        ...prevState,
        [asset.id]: errorMessage
      }));
    },
    [remainingLimit]
  );

  const handleQuantityChange = React.useCallback(
    (assetId: string, rawValue: string) => {
      const targetAsset: IAssetItem | undefined = assets.filter((asset: IAssetItem) => asset.id === assetId)[0];

      if (!targetAsset) {
        return;
      }

      updateQuantityState(targetAsset, rawValue);
    },
    [assets, updateQuantityState]
  );

  const handleFilterChange = React.useCallback((key: keyof IAssetFilters, value: string) => {
    setFilters((prevState) => ({
      ...prevState,
      [key]: value
    }));
  }, []);

  const handleRegister = React.useCallback(
    (asset: IAssetItem) => {
      const quantity: number = Number(quantityInputs[asset.id] || '0');
      const hasError: boolean = !!quantityErrors[asset.id];

      if (!quantity || quantity <= 0 || quantity > asset.availableQuantity || quantity > remainingLimit || hasError) {
        setQuantityErrors((prevState) => ({
          ...prevState,
          [asset.id]:
            quantity > remainingLimit
              ? `Bạn chỉ còn được mua ${remainingLimit} tài sản.`
              : 'Vui lòng nhập số lượng hợp lệ.'
        }));
        return;
      }

      const payload: IPurchasePayload = {
        asset,
        quantity
      };
      const nextOrder: IOrderDetail = createOrderDetailFromPurchase(
        asset,
        quantity,
        displayName,
        purchasedCount + 1
      );

      // eslint-disable-next-line no-console
      console.log('Đăng ký mua tài sản', payload);

      setAssets((prevState) =>
        prevState.map((item: IAssetItem) =>
          item.id === asset.id
            ? {
                ...item,
                availableQuantity: item.availableQuantity - quantity,
                statusText: getAssetStatusText(item.availableQuantity - quantity)
              }
            : item
        )
      );
      setPurchasedCount((prevState) => Math.min(prevState + quantity, PURCHASE_LIMIT));
      setQuantityInputs((prevState) => ({
        ...prevState,
        [asset.id]: ''
      }));
      setQuantityErrors((prevState) => ({
        ...prevState,
        [asset.id]: ''
      }));

      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Đăng ký mua thành công');
      }

      if (props.onPurchaseSuccess) {
        props.onPurchaseSuccess(nextOrder);
      }
    },
    [displayName, props, purchasedCount, quantityErrors, quantityInputs, remainingLimit]
  );

  return (
    <div className={styles.page}>
      <header className={styles.mainHeader}>
        <div className={styles.headerCenter}>
          <div className={styles.headerSubTitle}>Hệ thống quản lý tài sản nội bộ</div>
          <h1 className={styles.pageTitle}>Giao diện Đăng ký Mua Tài sản (CBNV)</h1>
        </div>

        <div className={styles.userPanel}>
          <div className={styles.userText}>Cán bộ nhân viên: {displayName}</div>
          <div className={styles.avatar} aria-hidden="true">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className={styles.subHeader}>
        <div>
          <strong className={styles.subHeaderTitle}>Danh sách tài sản thanh lý</strong>
          <span className={styles.subHeaderText}>
            CBNV có thể tìm kiếm, lọc và đăng ký mua tài sản trên cùng một màn hình.
          </span>
        </div>
        <div className={styles.summaryChip}>Tổng tài sản hiển thị: {visibleAssets.length}</div>
      </div>

      <FilterBar
        filters={filters}
        categories={categories}
        conditions={conditions}
        sites={sites}
        searchValue={searchValue}
        purchasedCount={purchasedCount}
        maxLimit={PURCHASE_LIMIT}
        onFilterChange={handleFilterChange}
        onSearchChange={setSearchValue}
      />

      <div className={styles.contentArea}>
        <AssetGrid
          assets={visibleAssets}
          quantityInputs={quantityInputs}
          errors={quantityErrors}
          remainingLimit={remainingLimit}
          onQuantityChange={handleQuantityChange}
          onRegister={handleRegister}
        />
      </div>
    </div>
  );
}
