import * as React from 'react';
import type { ICartItem } from './types';
import styles from './CartPanel.module.scss';

export interface ICartPanelProps {
  items: ICartItem[];
  selectedProductCodes: string[];
  maxSelectableQuantity: number;
  isCheckingOut: boolean;
  onToggleSelection: (productCode: string, checked: boolean) => void;
  onQuantityChange: (productCode: string, quantity: number) => void;
  onRemove: (productCode: string) => void;
  onCheckoutSelected: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

export function CartPanel(props: ICartPanelProps): React.ReactElement {
  const selectedItems: ICartItem[] = props.items.filter((item: ICartItem) => props.selectedProductCodes.indexOf(item.productCode) >= 0);
  const selectedQuantity: number = selectedItems.reduce((sum: number, item: ICartItem) => sum + item.quantity, 0);
  const selectedAmount: number = selectedItems.reduce((sum: number, item: ICartItem) => sum + item.lineTotal, 0);

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <strong className={styles.title}>Gio hang</strong>
          <span className={styles.subtitle}>Chon san pham, cap nhat so luong hoac xoa khoi gio truoc khi tao don.</span>
        </div>
        <div className={styles.summary}>
          <span>{props.items.length} san pham</span>
          <span>{selectedQuantity}/{props.maxSelectableQuantity} so luong da chon</span>
        </div>
      </div>

      {!props.items.length ? (
        <div className={styles.emptyState}>Chua co san pham nao trong gio hang.</div>
      ) : (
        <div className={styles.list}>
          {props.items.map((item: ICartItem) => {
            const isSelected: boolean = props.selectedProductCodes.indexOf(item.productCode) >= 0;

            return (
              <div key={item.productCode} className={styles.row}>
                <label className={styles.checkboxWrap}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      props.onToggleSelection(item.productCode, event.target.checked)
                    }
                  />
                  <span />
                </label>

                <div className={styles.itemInfo}>
                  <strong>{item.assetName}</strong>
                  <span>
                    {item.productCode} | {item.site} | {item.condition}
                  </span>
                </div>

                <label className={styles.quantityBox}>
                  <span>SL</span>
                  <input
                    type="number"
                    min={1}
                    max={item.availableQuantity}
                    value={item.quantity}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      props.onQuantityChange(item.productCode, Number(event.target.value || '0'))
                    }
                  />
                </label>

                <div className={styles.priceCol}>
                  <span>{formatCurrency(item.unitPrice)}</span>
                  <strong>{formatCurrency(item.lineTotal)}</strong>
                </div>

                <button type="button" className={styles.removeButton} onClick={() => props.onRemove(item.productCode)}>
                  Xoa
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.checkoutInfo}>
          <span>{selectedItems.length} dong duoc chon</span>
          <strong>{formatCurrency(selectedAmount)}</strong>
        </div>
        <button
          type="button"
          className={styles.checkoutButton}
          disabled={!selectedItems.length || props.isCheckingOut}
          onClick={props.onCheckoutSelected}
        >
          {props.isCheckingOut ? 'Dang tao don...' : 'Tao don tu muc da chon'}
        </button>
      </div>
    </section>
  );
}
