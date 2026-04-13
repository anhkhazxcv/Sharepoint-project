import * as React from 'react';
import styles from './FullscreenLoadingOverlay.module.scss';

export interface IFullscreenLoadingOverlayProps {
  label?: string;
}

export function FullscreenLoadingOverlay(props: IFullscreenLoadingOverlayProps): React.ReactElement {
  return (
    <div className={styles.overlay} role="status" aria-live="polite" aria-label={props.label || 'Đang tải dữ liệu'}>
      <div className={styles.panel}>
        <div className={styles.spinner} aria-hidden="true" />
        <div className={styles.label}>{props.label || 'Đang xử lý dữ liệu...'}</div>
      </div>
    </div>
  );
}
