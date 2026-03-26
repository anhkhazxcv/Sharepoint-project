import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { AssetGrid } from './AssetGrid';
import { FilterBar } from './FilterBar';
import type { IAssetFilters, IAssetItem, IPurchasePayload } from './types';
import { createOrderDetailFromPurchase } from './orderDetail/mockOrderDetail';
import type { IOrderDetail } from './orderDetail/types';
import { getAssetsFromSharePoint } from './services/assetCatalogService';
import { createTransactionItem, generateUniqueOrderId } from './services/orderTransactionService';
import styles from './AssetLiquidationPage.module.scss';

export interface IAssetLiquidationPageProps {
  userDisplayName?: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
  onAssetsLoaded?: (items: IAssetItem[]) => void;
  onPurchaseSuccess?: (orderDetail: IOrderDetail) => void;
}

const defaultFilters: IAssetFilters = {
  category: '',
  condition: '',
  site: ''
};

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 50];
const SHAREPOINT_LIST_TITLE: string = 'lstDanhMucTaiSan';
const PURCHASE_LIMIT: number = 5;
const MAX_SHAREPOINT_RETRIES: number = 5;

function stripVietnamese(input: string): string {
  return input
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[ÌÍỊỈĨ]/g, 'I')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/[ỲÝỴỶỸ]/g, 'Y')
    .replace(/[đ]/g, 'd')
    .replace(/[Đ]/g, 'D');
}

function normalizeKeyword(value: string): string {
  return stripVietnamese(value.trim().toLowerCase());
}

function getUniqueValues(items: IAssetItem[], key: keyof IAssetItem): string[] {
  const results: string[] = [];

  items.forEach((item: IAssetItem) => {
    const value: string = String(item[key]);

    if (value && results.indexOf(value) === -1) {
      results.push(value);
    }
  });

  return results;
}

export function AssetLiquidationPage(props: IAssetLiquidationPageProps): React.ReactElement {
  const displayName: string = props.userDisplayName || '';
  const [assets, setAssets] = React.useState<IAssetItem[]>([]);
  const [filters, setFilters] = React.useState<IAssetFilters>(defaultFilters);
  const [searchValue, setSearchValue] = React.useState<string>('');
  const [quantityInputs, setQuantityInputs] = React.useState<Record<string, string>>({});
  const [quantityErrors, setQuantityErrors] = React.useState<Record<string, string>>({});
  const [purchasedCount, setPurchasedCount] = React.useState<number>(0);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [isLoadingAssets, setIsLoadingAssets] = React.useState<boolean>(true);
  const [assetLoadError, setAssetLoadError] = React.useState<string>('');
  const [submittingAssetIds, setSubmittingAssetIds] = React.useState<Record<string, boolean>>({});
  const submittingAssetIdsRef = React.useRef<Record<string, boolean>>({});

  const categories: string[] = React.useMemo(() => getUniqueValues(assets, 'category'), [assets]);
  const conditions: string[] = React.useMemo(() => getUniqueValues(assets, 'condition'), [assets]);
  const sites: string[] = React.useMemo(() => getUniqueValues(assets, 'site'), [assets]);

  const remainingLimit: number = Math.max(PURCHASE_LIMIT - purchasedCount, 0);

  React.useEffect(() => {
    let isMounted: boolean = true;
    let attemptCount: number = 0;

    setIsLoadingAssets(true);
    setAssetLoadError('');

    function loadAssets(): void {
      attemptCount += 1;

      getAssetsFromSharePoint({
        siteUrl: props.siteUrl,
        listTitle: SHAREPOINT_LIST_TITLE,
        spHttpClient: props.spHttpClient
      })
        .then((items: IAssetItem[]) => {
          if (isMounted) {
            // eslint-disable-next-line no-console
            console.log('AssetLiquidationPage fetched assets:', items);
            setAssets(items);
            if (props.onAssetsLoaded) {
              props.onAssetsLoaded(items);
            }
            setIsLoadingAssets(false);
          }
        })
        .catch((error: Error) => {
          if (!isMounted) {
            return;
          }

          // eslint-disable-next-line no-console
          console.error('AssetLiquidationPage fetch assets error, attempt ' + String(attemptCount) + ':', error);

          if (attemptCount < MAX_SHAREPOINT_RETRIES) {
            loadAssets();
            return;
          }

          setAssets([]);
          setAssetLoadError('Khong tai duoc du lieu SharePoint sau 5 lan. Vui long lien he doi IT Support.');
          if (props.onAssetsLoaded) {
            props.onAssetsLoaded([]);
          }
          setIsLoadingAssets(false);
        });
    }

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, [props.siteUrl, props.spHttpClient]);

  const visibleAssets: IAssetItem[] = React.useMemo(() => {
    const keyword: string = normalizeKeyword(searchValue);

    return assets.filter((asset: IAssetItem) => {
      const matchesCategory: boolean = !filters.category || asset.category === filters.category;
      const matchesCondition: boolean = !filters.condition || asset.condition === filters.condition;
      const matchesSite: boolean = !filters.site || asset.site === filters.site;
      const matchesSearch: boolean =
        !keyword ||
        normalizeKeyword(asset.assetCode).indexOf(keyword) >= 0 ||
        normalizeKeyword(asset.assetName).indexOf(keyword) >= 0 ||
        normalizeKeyword(asset.barcode).indexOf(keyword) >= 0;

      return matchesCategory && matchesCondition && matchesSite && matchesSearch;
    });
  }, [assets, filters, searchValue]);

  const totalPages: number = Math.max(Math.ceil(visibleAssets.length / pageSize), 1);
  const paginatedAssets: IAssetItem[] = React.useMemo(() => {
    const startIndex: number = (currentPage - 1) * pageSize;
    return visibleAssets.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, visibleAssets]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchValue, pageSize]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
        errorMessage = 'So luong mua phai lon hon 0.';
      }

      if (parsedValue > asset.availableQuantity) {
        nextValue = String(asset.availableQuantity);
        errorMessage = 'So luong toi da la ' + String(asset.availableQuantity) + '.';
      }

      if (Number(nextValue) > remainingLimit) {
        nextValue = String(remainingLimit);
        errorMessage = 'Ban chi con duoc mua ' + String(remainingLimit) + ' tai san.';
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

  const setAssetSubmittingState = React.useCallback((assetId: string, isSubmitting: boolean) => {
    submittingAssetIdsRef.current = {
      ...submittingAssetIdsRef.current,
      [assetId]: isSubmitting
    };

    setSubmittingAssetIds((prevState) => ({
      ...prevState,
      [assetId]: isSubmitting
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
              ? 'Ban chi con duoc mua ' + String(remainingLimit) + ' tai san.'
              : 'Vui long nhap so luong hop le.'
        }));
        return;
      }

      if (submittingAssetIdsRef.current[asset.id]) {
        return;
      }

      const payload: IPurchasePayload = {
        asset,
        quantity
      };

      setAssetSubmittingState(asset.id, true);

      // eslint-disable-next-line no-console
      console.log('Dang ky mua tai san', payload);

      generateUniqueOrderId(props.siteUrl, props.spHttpClient)
        .then((generatedOrderId: string) => {
          const nextOrder: IOrderDetail = createOrderDetailFromPurchase(asset, quantity, displayName, generatedOrderId);

          return createTransactionItem({
            siteUrl: props.siteUrl,
            spHttpClient: props.spHttpClient,
            buyerName: displayName,
            buyerEmail: props.userEmail,
            orderDetail: nextOrder
          }).then(() => nextOrder);
        })
        .then((createdOrder: IOrderDetail) => {
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
            window.alert('Dang ky mua thanh cong. Ma don hang: ' + createdOrder.orderCode);
          }

          if (props.onPurchaseSuccess) {
            props.onPurchaseSuccess(createdOrder);
          }
        })
        .catch((error: Error) => {
          // eslint-disable-next-line no-console
          console.error('Khong the tao don mua tren SharePoint', error);
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('Khong the tao don mua tren SharePoint. Vui long thu lai hoac lien he IT Support.');
          }
        })
        .then(() => {
          setAssetSubmittingState(asset.id, false);
        });
    },
    [displayName, props, quantityErrors, quantityInputs, remainingLimit, setAssetSubmittingState]
  );

  return (
    <div className={styles.page}>
      <header className={styles.mainHeader}>
        <div className={styles.headerCenter}>
          <div className={styles.headerSubTitle}>He thong quan ly tai san noi bo</div>
          <h1 className={styles.pageTitle}>Giao dien Dang ky Mua Tai san (CBNV)</h1>
        </div>

        <div className={styles.userPanel}>
          <div className={styles.userText}>Can bo nhan vien: {displayName}</div>
          <div className={styles.avatar} aria-hidden="true">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className={styles.subHeader}>
        <div>
          <strong className={styles.subHeaderTitle}>Danh sach tai san thanh ly</strong>
          <span className={styles.subHeaderText}>CBNV co the tim kiem, loc va dang ky mua tai san tren cung mot man hinh.</span>
          <span className={styles.subHeaderText}>
            Nguon du lieu: {props.siteUrl} / {SHAREPOINT_LIST_TITLE}
          </span>
          {!!assetLoadError && <span className={styles.loadError}>{assetLoadError}</span>}
        </div>
        <div className={styles.summaryChip}>Tong tai san hien thi: {visibleAssets.length}</div>
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
        {isLoadingAssets ? (
          <div className={styles.loadingState}>Dang tai du lieu tu SharePoint...</div>
        ) : (
          <AssetGrid
            assets={paginatedAssets}
            quantityInputs={quantityInputs}
            errors={quantityErrors}
            remainingLimit={remainingLimit}
            submittingAssetIds={submittingAssetIds}
            onQuantityChange={handleQuantityChange}
            onRegister={handleRegister}
          />
        )}

        {!isLoadingAssets && !!visibleAssets.length && (
          <div className={styles.paginationBar}>
            <div className={styles.paginationSummary}>
              Hien thi {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, visibleAssets.length)} /{' '}
              {visibleAssets.length} tai san
            </div>

            <div className={styles.paginationControls}>
              <label className={styles.pageSizeControl}>
                <span>So dong</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className={styles.pageSizeSelect}
                >
                  {PAGE_SIZE_OPTIONS.map((option: number) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.pageNavigation}>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setCurrentPage((prevState) => Math.max(prevState - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Truoc
                </button>
                <span className={styles.pageIndicator}>
                  Trang {currentPage}/{totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setCurrentPage((prevState) => Math.min(prevState + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
