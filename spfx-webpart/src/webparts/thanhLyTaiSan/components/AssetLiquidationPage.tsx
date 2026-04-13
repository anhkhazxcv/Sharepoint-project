import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { AssetGrid } from './AssetGrid';
import { FilterBar } from './FilterBar';
import { FullscreenLoadingOverlay } from './FullscreenLoadingOverlay';
import { useToast } from './ToastProvider';
import type { IAssetFilters, IAssetItem, ICartItem } from './types';
import { getAssetByProductCodeFromSharePoint, getAssetsFromSharePoint } from './services/assetCatalogService';
import type { IOrderDetail } from './orderDetail/types';
import { getCartItemsByUser, upsertCartItem } from './services/cartService';
import styles from './AssetLiquidationPage.module.scss';

export interface IAssetLiquidationPageProps {
  userDisplayName?: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
  purchasedCount: number;
  onAssetsLoaded?: (items: IAssetItem[]) => void;
  onPurchaseSuccess?: (orderDetail: IOrderDetail) => void;
}

type TSortOption = 'latest' | 'priceAsc' | 'priceDesc' | 'stockDesc' | 'nameAsc';

const defaultFilters: IAssetFilters = {
  category: '',
  condition: '',
  site: ''
};

const PAGE_SIZE_OPTIONS: number[] = [12, 24, 48];
const SHAREPOINT_LIST_TITLE: string = 'lstSanPham';
const PURCHASE_LIMIT: number = 5;
const MAX_SHAREPOINT_RETRIES: number = 5;

function normalizeKeyword(value: string): string {
  return value
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
    .replace(/[Đ]/g, 'D')
    .trim()
    .toLowerCase();
}

function getUniqueValues(items: IAssetItem[], key: keyof IAssetItem): string[] {
  return items
    .map((item: IAssetItem) => String(item[key] || '').trim())
    .filter((value: string, index: number, values: string[]) => !!value && values.indexOf(value) === index)
    .sort((left: string, right: string) => left.localeCompare(right, 'vi'));
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

function getSortLabel(sortValue: TSortOption): string {
  switch (sortValue) {
    case 'priceAsc':
      return 'Giá thấp đến cao';
    case 'priceDesc':
      return 'Giá cao đến thấp';
    case 'stockDesc':
      return 'Còn nhiều hàng';
    case 'nameAsc':
      return 'Tên A-Z';
    case 'latest':
    default:
      return 'Mới nhất';
  }
}

function getActiveFilterChips(filters: IAssetFilters, searchValue: string, sortValue: TSortOption): string[] {
  const chips: string[] = [];

  if (filters.category) {
    chips.push('Loại: ' + filters.category);
  }

  if (filters.condition) {
    chips.push('Tình trạng: ' + filters.condition);
  }

  if (filters.site) {
    chips.push('Địa điểm: ' + filters.site);
  }

  if (searchValue.trim()) {
    chips.push('Từ khóa: ' + searchValue.trim());
  }

  if (sortValue !== 'latest') {
    chips.push('Sắp xếp: ' + getSortLabel(sortValue));
  }

  return chips;
}

export function AssetLiquidationPage(props: IAssetLiquidationPageProps): React.ReactElement {
  const displayName: string = props.userDisplayName || 'Người dùng nội bộ';
  const { showToast } = useToast();

  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('User email đang đăng nhập:', props.userEmail);
  }, [props.userEmail]);

  const [assets, setAssets] = React.useState<IAssetItem[]>([]);
  const [filters, setFilters] = React.useState<IAssetFilters>(defaultFilters);
  const [searchValue, setSearchValue] = React.useState<string>('');
  const [sortValue, setSortValue] = React.useState<TSortOption>('latest');
  const [quantityInputs, setQuantityInputs] = React.useState<Record<string, string>>({});
  const [quantityErrors, setQuantityErrors] = React.useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [isLoadingAssets, setIsLoadingAssets] = React.useState<boolean>(true);
  const [assetLoadError, setAssetLoadError] = React.useState<string>('');
  const [submittingAssetIds, setSubmittingAssetIds] = React.useState<Record<string, boolean>>({});
  const [cartItems, setCartItems] = React.useState<ICartItem[]>([]);

  const categories: string[] = React.useMemo(() => getUniqueValues(assets, 'category'), [assets]);
  const conditions: string[] = React.useMemo(() => getUniqueValues(assets, 'condition'), [assets]);
  const sites: string[] = React.useMemo(() => getUniqueValues(assets, 'site'), [assets]);

  const remainingLimit: number = Math.max(PURCHASE_LIMIT - props.purchasedCount, 0);
  const cartQuantity: number = React.useMemo(
    () => cartItems.reduce((sum: number, item: ICartItem) => sum + item.quantity, 0),
    [cartItems]
  );
  const availableAssetCount: number = React.useMemo(
    () => assets.filter((asset: IAssetItem) => asset.availableQuantity > 0).length,
    [assets]
  );
  const lowStockCount: number = React.useMemo(
    () => assets.filter((asset: IAssetItem) => asset.availableQuantity > 0 && asset.availableQuantity <= 3).length,
    [assets]
  );
  const isAnyAssetSubmitting: boolean = React.useMemo(
    () => Object.keys(submittingAssetIds).some((assetId: string) => !!submittingAssetIds[assetId]),
    [submittingAssetIds]
  );
  const loadingOverlayLabel: string = isLoadingAssets ? 'Đang tải dữ liệu từ SharePoint...' : 'Đang cập nhật giỏ hàng...';

  const loadCartItems = React.useCallback(
    (assetSource: IAssetItem[]) => {
      return getCartItemsByUser(props.siteUrl, props.spHttpClient, props.userEmail).then((records) => {
        const nextCartItems: ICartItem[] = formatCartItems(assetSource, records);
        setCartItems(nextCartItems);
      });
    },
    [props.siteUrl, props.spHttpClient, props.userEmail]
  );

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
          if (!isMounted) {
            return;
          }

          setAssets(items);

          if (props.onAssetsLoaded) {
            props.onAssetsLoaded(items);
          }

          return loadCartItems(items)
            .catch((cartError: Error) => {
              // eslint-disable-next-line no-console
              console.error('Không thể tải giỏ hàng từ SharePoint', cartError);
            })
            .then(() => {
              if (isMounted) {
                setIsLoadingAssets(false);
              }
            });
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
          setAssetLoadError('Không tải được dữ liệu SharePoint sau 5 lần thử. Vui lòng liên hệ đội IT Support.');

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
  }, [loadCartItems, props.onAssetsLoaded, props.siteUrl, props.spHttpClient]);

  const visibleAssets: IAssetItem[] = React.useMemo(() => {
    const keyword: string = normalizeKeyword(searchValue);

    return assets
      .filter((asset: IAssetItem) => {
        const matchesCategory: boolean = !filters.category || asset.category === filters.category;
        const matchesCondition: boolean = !filters.condition || asset.condition === filters.condition;
        const matchesSite: boolean = !filters.site || asset.site === filters.site;
        const matchesSearch: boolean =
          !keyword ||
          normalizeKeyword(asset.assetCode).indexOf(keyword) >= 0 ||
          normalizeKeyword(asset.assetName).indexOf(keyword) >= 0 ||
          normalizeKeyword(asset.barcode).indexOf(keyword) >= 0;

        return matchesCategory && matchesCondition && matchesSite && matchesSearch;
      })
      .slice()
      .sort((left: IAssetItem, right: IAssetItem) => {
        switch (sortValue) {
          case 'priceAsc':
            return left.price - right.price;
          case 'priceDesc':
            return right.price - left.price;
          case 'stockDesc':
            return right.availableQuantity - left.availableQuantity;
          case 'nameAsc':
            return left.assetName.localeCompare(right.assetName, 'vi');
          case 'latest':
          default:
            return right.id.localeCompare(left.id);
        }
      });
  }, [assets, filters, searchValue, sortValue]);

  const totalPages: number = Math.max(Math.ceil(visibleAssets.length / pageSize), 1);
  const paginatedAssets: IAssetItem[] = React.useMemo(() => {
    const startIndex: number = (currentPage - 1) * pageSize;
    return visibleAssets.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, visibleAssets]);

  const activeFilterChips: string[] = React.useMemo(
    () => getActiveFilterChips(filters, searchValue, sortValue),
    [filters, searchValue, sortValue]
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchValue, sortValue, pageSize]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const updateQuantityState = React.useCallback(
    (asset: IAssetItem, rawValue: string) => {
      let nextValue: string = rawValue.replace(/[^\d]/g, '');
      let errorMessage: string = '';
      const currentCartItem: ICartItem | undefined = cartItems.filter((item: ICartItem) => item.productCode === asset.assetCode)[0];
      const quantityOutsideCurrentItem: number = cartQuantity - (currentCartItem ? currentCartItem.quantity : 0);
      const maxAllowedForAsset: number = Math.max(remainingLimit - quantityOutsideCurrentItem, 0);

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
      }

      if (Number(nextValue) > maxAllowedForAsset) {
        nextValue = String(maxAllowedForAsset);
        errorMessage = 'Bạn đã đăng ký vượt quá giới hạn mua còn lại.';
      }

      if (Number(nextValue) <= 0) {
        errorMessage = 'Bạn đã đạt giới hạn mua tối đa.';
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
    [cartItems, cartQuantity, remainingLimit]
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

  const handleClearAllFilters = React.useCallback(() => {
    setFilters(defaultFilters);
    setSearchValue('');
    setSortValue('latest');
  }, []);

  const setAssetSubmittingState = React.useCallback((assetId: string, isSubmitting: boolean) => {
    setSubmittingAssetIds((prevState) => ({
      ...prevState,
      [assetId]: isSubmitting
    }));
  }, []);

  const ensureLatestAssetCanBeAddedToCart = React.useCallback(
    (asset: IAssetItem, quantity: number): Promise<IAssetItem> => {
      return getAssetByProductCodeFromSharePoint({
        siteUrl: props.siteUrl,
        listTitle: SHAREPOINT_LIST_TITLE,
        spHttpClient: props.spHttpClient,
        productCode: asset.assetCode
      }).then((latestAsset: IAssetItem | undefined) => {
        if (!latestAsset) {
          setAssets((prevAssets: IAssetItem[]) => prevAssets.filter((item: IAssetItem) => item.assetCode !== asset.assetCode));
          setQuantityErrors((prevState) => ({
            ...prevState,
            [asset.id]: 'Sản phẩm không còn tồn tại hoặc đã ngừng mở bán.'
          }));
            showToast('Sản phẩm không còn tồn tại hoặc đã ngừng mở bán.', 'error');
          throw new Error('Asset no longer exists.');
        }

        setAssets((prevAssets: IAssetItem[]) =>
          prevAssets.map((item: IAssetItem) => (item.assetCode === latestAsset.assetCode ? latestAsset : item))
        );

        if (latestAsset.availableQuantity <= 0) {
          setQuantityErrors((prevState) => ({
            ...prevState,
            [asset.id]: 'Sản phẩm đã hết hàng.'
          }));
            showToast('Sản phẩm đã hết hàng.', 'error');
          throw new Error('Asset is sold out.');
        }

        if (quantity > latestAsset.availableQuantity) {
          setQuantityInputs((prevState) => ({
            ...prevState,
            [asset.id]: String(latestAsset.availableQuantity)
          }));
          setQuantityErrors((prevState) => ({
            ...prevState,
            [asset.id]: 'Số lượng yêu cầu vượt quá tồn kho hiện tại.'
          }));
            showToast('Sản phẩm không còn đủ số lượng trong tồn kho. Vui lòng giảm số lượng.', 'error');
          throw new Error('Insufficient latest stock.');
        }

        return latestAsset;
      });
    },
    [props.siteUrl, props.spHttpClient]
  );

  const handleAddToCart = React.useCallback(
    (asset: IAssetItem) => {
      if (isAnyAssetSubmitting) {
        return;
      }

      const quantity: number = Number(quantityInputs[asset.id] || '0');
      const hasError: boolean = !!quantityErrors[asset.id];
      const currentCartItem: ICartItem | undefined = cartItems.filter((item: ICartItem) => item.productCode === asset.assetCode)[0];
      const quantityOutsideCurrentItem: number = cartQuantity - (currentCartItem ? currentCartItem.quantity : 0);
      const nextCartQuantity: number = quantityOutsideCurrentItem + quantity;

      if (!quantity || quantity <= 0 || quantity > asset.availableQuantity || hasError) {
        setQuantityErrors((prevState) => ({
          ...prevState,
          [asset.id]: 'Vui lòng nhập số lượng hợp lệ.'
        }));
        return;
      }

      if (nextCartQuantity > remainingLimit) {
        setQuantityErrors((prevState) => ({
          ...prevState,
          [asset.id]: 'Tổng số lượng đăng ký đã vượt quá giới hạn còn lại.'
        }));
        showToast('Bạn đã đăng ký vượt quá giới hạn mua. Vui lòng giảm số lượng.', 'error');
        return;
      }

      setAssetSubmittingState(asset.id, true);

      ensureLatestAssetCanBeAddedToCart(asset, quantity).then((latestAsset: IAssetItem) =>
        upsertCartItem({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          buyerName: displayName,
          buyerEmail: props.userEmail,
          productCode: asset.assetCode,
          quantity,
          unitPrice: latestAsset.price
        })
      )
        .then(() => loadCartItems(assets))
        .then(() => {
          setQuantityInputs((prevState) => ({
            ...prevState,
            [asset.id]: ''
          }));
          setQuantityErrors((prevState) => ({
            ...prevState,
            [asset.id]: ''
          }));
        })
        .catch((error: Error) => {
          if (
            error.message === 'Asset no longer exists.' ||
            error.message === 'Asset is sold out.' ||
            error.message === 'Insufficient latest stock.'
          ) {
            return;
          }

          // eslint-disable-next-line no-console
          console.error('Không thể thêm vào giỏ hàng', error);
          showToast('Không thể thêm sản phẩm vào giỏ hàng trên SharePoint.', 'error');
        })
        .then(
          () => {
            setAssetSubmittingState(asset.id, false);
          },
          () => {
            setAssetSubmittingState(asset.id, false);
          }
        );
    },
    [
      assets,
      cartItems,
      cartQuantity,
      displayName,
      ensureLatestAssetCanBeAddedToCart,
      loadCartItems,
      props.siteUrl,
      props.spHttpClient,
      props.userEmail,
      quantityErrors,
      quantityInputs,
      remainingLimit,
      isAnyAssetSubmitting,
      setAssetSubmittingState,
      showToast
    ]
  );

  return (
    <div className={styles.page}>
      {(isLoadingAssets || isAnyAssetSubmitting) && <FullscreenLoadingOverlay label={loadingOverlayLabel} />}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>Nền tảng thanh lý tài sản nội bộ</div>
          <h1 className={styles.pageTitle}>Đăng ký mua tài sản dành cho cán bộ nhân viên</h1>
          <p className={styles.heroDescription}>
            Tìm kiếm tài sản phù hợp, theo dõi trạng thái tồn kho theo thời gian thực và tạo yêu cầu mua nhanh trong cùng một giao diện.
          </p>

          <div className={styles.heroActions}>
            <span className={styles.primaryChip}>Đang mở bán: {availableAssetCount} tài sản</span>
            <span className={styles.secondaryChip}>Giỏ hàng hiện có: {cartQuantity} sản phẩm</span>
          </div>
        </div>

        <div className={styles.userPanel}>
          <div className={styles.userPanelLabel}>Tài khoản đang thao tác</div>
          <div className={styles.userIdentity}>
            <div className={styles.avatar} aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userEmail}>{props.userEmail}</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Tài sản đang hiển thị</span>
          <strong className={styles.statValue}>{visibleAssets.length}</strong>
          <span className={styles.statMeta}>Tổng nguồn dữ liệu hiện có {assets.length} tài sản</span>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statLabel}>Giới hạn còn lại</span>
          <strong className={styles.statValue}>{remainingLimit}</strong>
          <span className={styles.statMeta}>Đã mua {props.purchasedCount}/{PURCHASE_LIMIT} tài sản</span>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statLabel}>Sắp hết hàng</span>
          <strong className={styles.statValue}>{lowStockCount}</strong>
          <span className={styles.statMeta}>Những sản phẩm còn tối đa 3 đơn vị</span>
        </article>
      </section>

      <FilterBar
        filters={filters}
        categories={categories}
        conditions={conditions}
        sites={sites}
        searchValue={searchValue}
        purchasedCount={props.purchasedCount}
        maxLimit={PURCHASE_LIMIT}
        resultCount={visibleAssets.length}
        totalCount={assets.length}
        sortValue={sortValue}
        activeFilterChips={activeFilterChips}
        onFilterChange={handleFilterChange}
        onSearchChange={setSearchValue}
        onSortChange={(value: string) => setSortValue(value as TSortOption)}
        onClearFilters={handleClearAllFilters}
      />

      <section className={styles.contentArea}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Danh sách tài sản</h2>
            <p className={styles.sectionText}>Ưu tiên ảnh, giá bán, tình trạng và số lượng tồn để giúp người dùng ra quyết định nhanh.</p>
          </div>

          <div className={styles.sectionHeaderMeta}>
            <span className={styles.resultPill}>Sắp xếp: {getSortLabel(sortValue)}</span>
          </div>
        </div>

        {isLoadingAssets ? (
          <div className={styles.loadingState}>Đang tải dữ liệu từ SharePoint...</div>
        ) : assetLoadError ? (
          <div className={styles.loadingState}>{assetLoadError}</div>
        ) : (
          <AssetGrid
            assets={paginatedAssets}
            quantityInputs={quantityInputs}
            errors={quantityErrors}
            remainingLimit={remainingLimit}
            submittingAssetIds={submittingAssetIds}
            isSubmissionLocked={isAnyAssetSubmitting}
            onQuantityChange={handleQuantityChange}
            onAddToCart={handleAddToCart}
          />
        )}

        {!isLoadingAssets && !!visibleAssets.length && (
          <div className={styles.paginationBar}>
            <div className={styles.paginationSummary}>
              Hiển thị {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, visibleAssets.length)} / {visibleAssets.length} tài sản
            </div>

            <div className={styles.paginationControls}>
              <label className={styles.pageSizeControl}>
                <span>Mỗi trang</span>
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
                  Trước
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
      </section>
    </div>
  );
}
