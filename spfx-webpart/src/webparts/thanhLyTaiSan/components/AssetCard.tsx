import * as React from 'react';
import type { IAssetItem } from './types';
import styles from './AssetCard.module.scss';

export interface IAssetCardProps {
  asset: IAssetItem;
  quantityValue: string;
  errorMessage?: string;
  remainingLimit: number;
  isSubmitting?: boolean;
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

function renderBarcodeBars(barcode: string): React.ReactNode {
  return barcode.split('').map((char: string, index: number) => {
    const isWide: boolean = Number(char) % 2 === 0;

    return (
      <span
        key={`${barcode}-${index}`}
        className={`${styles.bar} ${isWide ? styles.barWide : styles.barThin}`}
        aria-hidden="true"
      />
    );
  });
}

export function AssetCard(props: IAssetCardProps): React.ReactElement {
  const { asset, quantityValue, errorMessage, remainingLimit, isSubmitting, onQuantityChange, onAddToCart } = props;
  const [isImageBroken, setIsImageBroken] = React.useState<boolean>(false);
  const hasImage: boolean = !!asset.imageUrl;

  const isSoldOut: boolean = asset.availableQuantity === 0;
  const parsedQuantity: number = Number(quantityValue);
  const isWholeNumber: boolean = quantityValue !== '' && String(parsedQuantity) === quantityValue.trim();
  const hasValidQuantity: boolean =
    quantityValue.trim() !== '' &&
    isWholeNumber &&
    parsedQuantity > 0 &&
    parsedQuantity <= asset.availableQuantity &&
    parsedQuantity <= remainingLimit;
  const isActionDisabled: boolean = isSoldOut || !hasValidQuantity || !!errorMessage || remainingLimit === 0 || !!isSubmitting;

  return (
    <article className={`${styles.card} ${isSoldOut ? styles.soldOutCard : ''}`}>
      <div className={styles.topSection}>
        <div className={styles.imageWrap}>
          {!hasImage || isImageBroken ? (
            <div className={styles.imageFallback}>Khong co anh</div>
          ) : (
            <img
              className={styles.image}
              src={asset.imageUrl}
              alt={asset.assetName}
              onError={() => setIsImageBroken(true)}
            />
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.titleRow}>
            <span className={`${styles.statusBadge} ${isSoldOut ? styles.statusSoldOut : styles.statusAvailable}`}>
              {isSoldOut ? 'Het hang' : asset.statusText}
            </span>
            <span className={styles.category}>{asset.category}</span>
          </div>

          <div className={styles.summary}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Ten TS</span>
              <strong className={styles.valueTitle}>{asset.assetName}</strong>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Ma TS</span>
              <strong className={styles.value}>{asset.assetCode}</strong>
            </div>
          </div>

          <div className={styles.barcodeBlock}>
            <div className={styles.barcodeVisual}>{renderBarcodeBars(asset.barcode)}</div>
            <span className={styles.barcodeText}>{asset.barcode}</span>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.label}>So luong tong</span>
              <strong className={styles.value}>{asset.totalQuantity}</strong>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.label}>Tinh trang TS</span>
              <strong className={styles.value}>{asset.condition}</strong>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.label}>Site</span>
              <strong className={styles.value}>{asset.site}</strong>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.label}>So luong ton</span>
              <strong className={styles.value}>{asset.availableQuantity}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.priceBlock}>
          <span className={styles.label}>Gia ban</span>
          <strong className={styles.price}>{formatCurrency(asset.price)}</strong>
        </div>

        <div className={styles.purchaseRow}>
          <label className={styles.quantityField} htmlFor={`quantity-${asset.id}`}>
            <span className={styles.label}>So luong mua</span>
            <input
              id={`quantity-${asset.id}`}
              className={`${styles.quantityInput} ${errorMessage ? styles.quantityError : ''}`}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={isSoldOut ? '0' : quantityValue}
              disabled={isSoldOut || remainingLimit === 0 || !!isSubmitting}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => onQuantityChange(asset.id, event.target.value)}
            />
          </label>

          <button
            type="button"
            className={`${styles.actionButton} ${isSoldOut ? styles.actionDisabled : styles.actionActive}`}
            disabled={isActionDisabled}
            onClick={() => onAddToCart(asset)}
          >
            {isSoldOut ? 'Het hang' : isSubmitting ? 'Dang them...' : 'Them vao gio'}
          </button>
        </div>

        {remainingLimit === 0 && !isSoldOut ? (
          <span className={styles.helperText}>Da dat gioi han mua toi da.</span>
        ) : errorMessage ? (
          <span className={styles.errorText}>{errorMessage}</span>
        ) : (
          <span className={styles.helperText}>Nhap toi da {Math.min(asset.availableQuantity, remainingLimit)} tai san.</span>
        )}
      </div>
    </article>
  );
}
