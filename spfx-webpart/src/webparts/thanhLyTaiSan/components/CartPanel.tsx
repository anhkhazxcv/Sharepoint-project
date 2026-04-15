import * as React from 'react';
import type { ICartItem } from './types';
import styles from './CartPanel.module.scss';

export interface ICartPanelProps {
  items: ICartItem[];
  selectedProductCodes: string[];
  maxSelectableQuantity: number;
  isCheckingOut: boolean;
  onToggleAllSelection: (checked: boolean) => void;
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
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);
  const isAllSelected: boolean = !!props.items.length && props.selectedProductCodes.length === props.items.length;
  const isPartiallySelected: boolean = props.selectedProductCodes.length > 0 && !isAllSelected;

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <strong className={styles.title}>Giỏ hàng</strong>
          <span className={styles.subtitle}>Chọn sản phẩm, cập nhật số lượng hoặc xóa khỏi giỏ trước khi tạo đơn.</span>
        </div>
        {!!props.items.length && (
          <label className={styles.selectAll}>
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={isAllSelected}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => props.onToggleAllSelection(event.target.checked)}
            />
            <span>Chọn tất cả</span>
          </label>
        )}
        <div className={styles.summary}>
          <span>{props.items.length} sản phẩm</span>
          <span>{selectedQuantity}/{props.maxSelectableQuantity} số lượng đã chọn</span>
        </div>
      </div>

      {!props.items.length ? (
        <div className={styles.emptyState}>Chưa có sản phẩm nào trong giỏ hàng.</div>
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
                    {item.productCode} | {item.site} | {item.condition} | Tồn: {item.availableQuantity}
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
                  Xóa
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.checkoutInfo}>
          <span>{selectedItems.length} dòng được chọn</span>
          <strong>{formatCurrency(selectedAmount)}</strong>
        </div>
        <button
          type="button"
          className={styles.checkoutButton}
          disabled={!selectedItems.length || props.isCheckingOut}
          onClick={props.onCheckoutSelected}
        >
          {props.isCheckingOut ? 'Đang tạo đơn...' : 'Tạo đơn từ mục đã chọn'}
        </button>
      </div>
    </section>
  );
}
