import * as React from 'react';
import type { IAssetItem } from './types';
import styles from './AssetCard.module.scss';

export interface IAssetCardProps {
  asset: IAssetItem;
  quantityValue: string;
  errorMessage?: string;
  remainingLimit: number;
  onQuantityChange: (assetId: string, value: string) => void;
  onRegister: (asset: IAssetItem) => void;
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
  const { asset, quantityValue, errorMessage, remainingLimit, onQuantityChange, onRegister } = props;
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
  const isRegisterDisabled: boolean = isSoldOut || !hasValidQuantity || !!errorMessage || remainingLimit === 0;

  return (
    <article className={`${styles.card} ${isSoldOut ? styles.soldOutCard : ''}`}>
      <div className={styles.header}>
        <div className={styles.imageWrap}>
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
        </div>

        <div className={styles.info}>
          <div className={styles.titleRow}>
            <span className={`${styles.statusBadge} ${isSoldOut ? styles.statusSoldOut : styles.statusAvailable}`}>
              {isSoldOut ? 'Hết hàng' : asset.statusText}
            </span>
            <span className={styles.category}>{asset.category}</span>
          </div>

          <div className={styles.infoLine}>
            <span className={styles.label}>Tên TS</span>
            <strong className={styles.valueTitle}>{asset.assetName}</strong>
          </div>
          <div className={styles.infoLine}>
            <span className={styles.label}>Mã TS</span>
            <strong className={styles.value}>{asset.assetCode}</strong>
          </div>

          <div className={styles.barcodeBlock}>
            <div className={styles.barcodeVisual}>{renderBarcodeBars(asset.barcode)}</div>
            <span className={styles.barcodeText}>{asset.barcode}</span>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.infoLine}>
              <span className={styles.label}>So luong tong</span>
              <strong className={styles.value}>{asset.totalQuantity}</strong>
            </div>
            <div className={styles.infoLine}>
              <span className={styles.label}>Tình trạng TS</span>
              <strong className={styles.value}>{asset.condition}</strong>
            </div>
            <div className={styles.infoLine}>
              <span className={styles.label}>Site</span>
              <strong className={styles.value}>{asset.site}</strong>
            </div>
            <div className={styles.infoLine}>
              <span className={styles.label}>So luong ton</span>
              <strong className={styles.value}>{asset.availableQuantity}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.priceBlock}>
          <span className={styles.label}>Giá bán</span>
          <strong className={styles.price}>{formatCurrency(asset.price)}</strong>
        </div>

        <label className={styles.quantityField} htmlFor={`quantity-${asset.id}`}>
          <span className={styles.label}>Số lượng mua</span>
          <input
            id={`quantity-${asset.id}`}
            className={`${styles.quantityInput} ${errorMessage ? styles.quantityError : ''}`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={isSoldOut ? '0' : quantityValue}
            disabled={isSoldOut || remainingLimit === 0}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => onQuantityChange(asset.id, event.target.value)}
          />
        </label>

        <button
          type="button"
          className={`${styles.actionButton} ${isSoldOut ? styles.actionDisabled : styles.actionActive}`}
          disabled={isRegisterDisabled}
          onClick={() => onRegister(asset)}
        >
          {isSoldOut ? 'Hết hàng' : 'Đăng ký mua'}
        </button>

        {remainingLimit === 0 && !isSoldOut ? (
          <span className={styles.helperText}>Đã đạt giới hạn mua tối đa.</span>
        ) : errorMessage ? (
          <span className={styles.errorText}>{errorMessage}</span>
        ) : (
          <span className={styles.helperText}>Nhập tối đa {Math.min(asset.availableQuantity, remainingLimit)} tài sản.</span>
        )}
      </div>
    </article>
  );
}
