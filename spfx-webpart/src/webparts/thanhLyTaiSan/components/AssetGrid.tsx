import * as React from 'react';
import { AssetCard } from './AssetCard';
import type { IAssetItem } from './types';
import styles from './AssetGrid.module.scss';

export interface IAssetGridProps {
  assets: IAssetItem[];
  quantityInputs: Record<string, string>;
  errors: Record<string, string>;
  remainingLimit: number;
  submittingAssetIds?: Record<string, boolean>;
  onQuantityChange: (assetId: string, value: string) => void;
  onAddToCart: (asset: IAssetItem) => void;
}

export function AssetGrid(props: IAssetGridProps): React.ReactElement {
  const { assets, quantityInputs, errors, remainingLimit, submittingAssetIds, onQuantityChange, onAddToCart } = props;

  if (!assets.length) {
    return (
      <div className={styles.emptyState}>
        <strong>Khong tim thay tai san phu hop</strong>
        <span>Thu thay doi bo loc hoac tu khoa tim kiem de xem them ket qua.</span>
      </div>
    );
  }

  return (
    <section className={styles.grid}>
      {assets.map((asset: IAssetItem) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          quantityValue={quantityInputs[asset.id] || ''}
          errorMessage={errors[asset.id]}
          remainingLimit={remainingLimit}
          isSubmitting={!!(submittingAssetIds && submittingAssetIds[asset.id])}
          onQuantityChange={onQuantityChange}
          onAddToCart={onAddToCart}
        />
      ))}
    </section>
  );
}
