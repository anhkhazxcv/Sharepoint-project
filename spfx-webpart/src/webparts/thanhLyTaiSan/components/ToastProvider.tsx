import * as React from 'react';
import styles from './ToastProvider.module.scss';

type TToastVariant = 'success' | 'error' | 'info';

interface IToastItem {
  id: number;
  message: string;
  variant: TToastVariant;
}

export interface IToastContextValue {
  showToast: (message: string, variant?: TToastVariant) => void;
}

const ToastContext = React.createContext<IToastContextValue>({
  showToast: () => undefined
});

export interface IToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider(props: IToastProviderProps): React.ReactElement {
  const [toasts, setToasts] = React.useState<IToastItem[]>([]);
  const idRef = React.useRef<number>(0);
  const timeoutIdsRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId: number) => {
        window.clearTimeout(timeoutId);
      });
      timeoutIdsRef.current = [];
    };
  }, []);

  const showToast = React.useCallback((message: string, variant: TToastVariant = 'info'): void => {
    idRef.current += 1;
    const nextId: number = idRef.current;

    setToasts((prevState: IToastItem[]) => {
      const nextToasts: IToastItem[] = prevState.concat([{ id: nextId, message, variant }]);
      return nextToasts.slice(-3);
    });

    const timeoutId: number = window.setTimeout(() => {
      setToasts((prevState: IToastItem[]) => prevState.filter((toast: IToastItem) => toast.id !== nextId));
    }, 5000);

    timeoutIdsRef.current.push(timeoutId);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {props.children}
      <div className={styles.host} aria-live="polite" aria-atomic="true">
        {toasts.map((toast: IToastItem) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.variant]}`} role="status">
            <span className={styles.icon} aria-hidden="true" />
            <span className={styles.message}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): IToastContextValue {
  return React.useContext(ToastContext);
}
