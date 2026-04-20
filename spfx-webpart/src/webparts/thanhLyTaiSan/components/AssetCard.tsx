import * as React from 'react';
import type { IAssetItem } from './types';
import styles from './AssetCard.module.scss';

export interface IAssetCardProps {
  asset: IAssetItem;
  quantityValue: string;
  errorMessage?: string;
  remainingLimit: number;
  isSubmitting?: boolean;
  isSubmissionLocked?: boolean;
  onQuantityChange: (assetId: string, value: string) => void;
  onAddToCart: (asset: IAssetItem) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

function getStatusVariant(asset: IAssetItem): 'soldOut' | 'lowStock' | 'available' {
  if (asset.availableQuantity <= 0) {
    return 'soldOut';
  }

  if (asset.availableQuantity <= 3) {
    return 'lowStock';
  }

  return 'available';
}

function getStatusLabel(asset: IAssetItem): string {
  if (asset.availableQuantity <= 0) {
    return 'Hết hàng';
  }

  if (asset.availableQuantity <= 3) {
    return 'Sắp hết';
  }

  return asset.statusText || 'Còn hàng';
}

export function AssetCard(props: IAssetCardProps): React.ReactElement {
  const { asset, quantityValue, errorMessage, remainingLimit, isSubmitting, isSubmissionLocked, onQuantityChange, onAddToCart } = props;
  const [isImageBroken, setIsImageBroken] = React.useState<boolean>(false);
  const hasImage: boolean = !!asset.imageUrl;
  const statusVariant: 'soldOut' | 'lowStock' | 'available' = getStatusVariant(asset);
  const isSoldOut: boolean = statusVariant === 'soldOut';
  const parsedQuantity: number = Number(quantityValue);
  const isWholeNumber: boolean = quantityValue !== '' && String(parsedQuantity) === quantityValue.trim();
  const hasValidQuantity: boolean =
    quantityValue.trim() !== '' &&
    isWholeNumber &&
    parsedQuantity > 0 &&
    parsedQuantity <= asset.availableQuantity &&
    parsedQuantity <= remainingLimit;
  const isActionDisabled: boolean = isSoldOut || !hasValidQuantity || !!errorMessage || remainingLimit === 0 || !!isSubmissionLocked;

  return (
    <article className={`${styles.card} ${isSoldOut ? styles.soldOutCard : ''}`}>
      <div className={styles.mediaArea}>
        {!hasImage || isImageBroken ? (
          <div className={styles.imageFallback}>Không có ảnh</div>
        ) : (
          <img
            className={styles.image}
            src={asset.imageUrl}
            alt={asset.assetName}
            onError={() => setIsImageBroken(true)}
          />
        )}

        <div
          className={`${styles.statusBadge} ${
            statusVariant === 'soldOut' ? styles.statusSoldOut : statusVariant === 'lowStock' ? styles.statusLowStock : styles.statusAvailable
          }`}
        >
          {getStatusLabel(asset)}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.metaRow}>
          <span className={styles.categoryTag}>{asset.category}</span>
          <span className={styles.locationText}>{asset.site}</span>
        </div>

        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{asset.assetName}</h3>
          <div className={styles.assetCode}>Mã tài sản: {asset.assetCode}</div>
        </div>

        <div className={styles.priceBlock}>
          <span className={styles.priceLabel}>Giá thanh lý</span>
          <strong className={styles.price}>{formatCurrency(asset.price)}</strong>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Tình trạng</span>
            <strong className={styles.infoValue}>{asset.condition}</strong>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Tồn kho</span>
            <strong className={styles.infoValue}>{asset.availableQuantity}</strong>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Tổng số lượng</span>
            <strong className={styles.infoValue}>{asset.totalQuantity}</strong>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Barcode</span>
            <strong className={styles.infoValue}>{asset.barcode || 'Chưa có'}</strong>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.purchasePanel}>
          <label className={styles.quantityField} htmlFor={`quantity-${asset.id}`}>
            <span className={styles.infoLabel}>Số lượng đăng ký</span>
            <input
              id={`quantity-${asset.id}`}
              className={`${styles.quantityInput} ${errorMessage ? styles.quantityError : ''}`}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={isSoldOut ? '0' : quantityValue}
              disabled={isSoldOut || remainingLimit === 0 || !!isSubmissionLocked}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => onQuantityChange(asset.id, event.target.value)}
            />
          </label>

          <button
            type="button"
            className={`${styles.actionButton} ${isActionDisabled ? styles.actionDisabled : styles.actionActive}`}
            disabled={isActionDisabled}
            onClick={() => onAddToCart(asset)}
          >
            {isSoldOut ? (
              'Hết hàng'
            ) : isSubmitting ? (
              <span className={styles.loadingContent}>
                <span className={styles.loadingSpinner} aria-hidden="true" />
                Đang thêm...
              </span>
            ) : (
              'Đăng ký mua'
            )}
          </button>
        </div>

        {remainingLimit === 0 && !isSoldOut ? (
          <span className={styles.helperText}>Bạn đã đạt giới hạn mua tối đa.</span>
        ) : errorMessage ? (
          <span className={styles.errorText}>{errorMessage}</span>
        ) : (
          <span className={styles.helperText}>Có thể nhập tối đa {Math.min(asset.availableQuantity, remainingLimit)} sản phẩm cho mặt hàng này.</span>
        )}
      </div>
    </article>
  );
}
