import * as React from 'react';
import { PrimaryButton, Spinner, SpinnerSize } from '@fluentui/react';
import type { ICatalogAssetRow } from './catalogTypes';
import styles from './AssetCatalogBrowsePage.module.scss';

export interface IAssetCatalogBrowsePageProps {
  siteUrl: string;
  spHttpClient: unknown;
}

function formatVnd(value: number): string {
  return (
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value) || '0 d'
  );
}

function makeMockImageDataUri(label: string, fill: string): string {
  const text: string = label.length > 18 ? label.slice(0, 18) + '…' : label;
  const svg: string =
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='" +
    fill +
    "'/><stop offset='1' stop-color='#ffffff'/></linearGradient></defs>" +
    "<rect width='120' height='120' rx='14' fill='url(#g)'/>" +
    "<rect x='12' y='14' width='96' height='92' rx='12' fill='#ffffff' fill-opacity='0.65'/>" +
    "<text x='60' y='64' text-anchor='middle' font-family='Segoe UI, Arial' font-size='10' font-weight='700' fill='#334155'>" +
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
    '</text>' +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const MOCK_ROWS: ICatalogAssetRow[] = [
  {
    id: '1',
    assetCode: 'TS-001',
    barcode: '8938501000012',
    name: 'May tinh de ban - Dell 19"',
    stockQuantity: 10,
    imageUrl: makeMockImageDataUri('TS-001', '#60a5fa'),
    condition: 'Con tot',
    site: 'VP Ha Noi',
    salePrice: 3500000,
    canPurchase: true
  },
  {
    id: '2',
    assetCode: 'TS-002',
    barcode: '8938501000029',
    name: 'Laptop - Lenovo ThinkPad',
    stockQuantity: 0,
    imageUrl: makeMockImageDataUri('TS-002', '#fb7185'),
    condition: 'Can kiem tra',
    site: 'VP Da Nang',
    salePrice: 4500000,
    canPurchase: false
  },
  {
    id: '3',
    assetCode: 'TS-003',
    barcode: '8938501000036',
    name: 'May in - HP LaserJet',
    stockQuantity: 3,
    imageUrl: makeMockImageDataUri('TS-003', '#34d399'),
    condition: 'Hoat dong',
    site: 'VP Ho Chi Minh',
    salePrice: 2200000,
    canPurchase: true
  },
  {
    id: '4',
    assetCode: 'TS-004',
    barcode: '8938501000043',
    name: 'Loa hoi nghi - Logitech',
    stockQuantity: 25,
    imageUrl: makeMockImageDataUri('TS-004', '#fbbf24'),
    condition: 'Moi / IT su dung',
    site: 'Tru so chinh',
    salePrice: 1250000,
    canPurchase: true
  },
  {
    id: '5',
    assetCode: 'TS-005',
    barcode: '8938501000050',
    name: 'Man hinh - Samsung 24"',
    stockQuantity: 1,
    imageUrl: makeMockImageDataUri('TS-005', '#a78bfa'),
    condition: 'Con tot',
    site: 'VP Ha Noi',
    salePrice: 1800000,
    canPurchase: true
  }
];

export function AssetCatalogBrowsePage(props: IAssetCatalogBrowsePageProps): React.ReactElement {
  const [rows, setRows] = React.useState<ICatalogAssetRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    const timer: number = window.setTimeout(() => {
      setRows(MOCK_ROWS);
      setLoading(false);
      setError('');
    }, 250);

    return (): void => {
      window.clearTimeout(timer);
    };
  }, []);

  const purchasableRows: ICatalogAssetRow[] = React.useMemo(() => {
    return rows.filter((r: ICatalogAssetRow) => r.canPurchase);
  }, [rows]);

  function renderThumb(row: ICatalogAssetRow): React.ReactNode {
    if (row.imageUrl) {
      return <img className={styles.thumb} src={row.imageUrl} alt={row.name} loading="lazy" />;
    }

    return <div className={styles.thumbPlaceholder}>Khong co anh</div>;
  }

  function renderTable(): React.ReactNode {
    if (!rows.length) {
      return (
        <div className={styles.empty}>
          <p>Khong co du lieu tai san trong he thong.</p>
        </div>
      );
    }

    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Hinh anh</th>
              <th className={styles.th}>Ma tai san</th>
              <th className={styles.th}>Ma vach</th>
              <th className={styles.th}>Ten tai san</th>
              <th className={styles.th}>So luong ton</th>
              <th className={styles.th}>Tinh trang</th>
              <th className={styles.th}>Site</th>
              <th className={styles.th}>Gia ban</th>
              <th className={styles.th}>Mua duoc</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: ICatalogAssetRow) => (
              <tr key={row.id} className={styles.row}>
                <td className={styles.td}>{renderThumb(row)}</td>
                <td className={styles.td}>{row.assetCode}</td>
                <td className={styles.td}>{row.barcode || '—'}</td>
                <td className={styles.td}>{row.name}</td>
                <td className={styles.td}>
                  {row.stockQuantity > 0 ? (
                    row.stockQuantity
                  ) : (
                    <span className={styles.stockZero}>0</span>
                  )}
                </td>
                <td className={styles.td}>{row.condition}</td>
                <td className={styles.td}>{row.site}</td>
                <td className={styles.td}>
                  <span className={styles.price}>{formatVnd(row.salePrice)}</span>
                </td>
                <td className={styles.td}>
                  {row.canPurchase ? (
                    <span className={styles.purchaseOk}>Co the mua</span>
                  ) : (
                    <span className={styles.purchaseNo}>Het hang</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderCards(): React.ReactNode {
    if (!rows.length) {
      return null;
    }

    return (
      <div className={styles.cards}>
        {rows.map((row: ICatalogAssetRow) => (
          <article key={row.id} className={styles.card}>
            <div className={styles.cardImageRow}>
              {renderThumb(row)}
              <div className={styles.cardTitleCol}>
                <div className={styles.cardTitle}>{row.name}</div>
                <div className={styles.cardCode}>{row.assetCode}</div>
              </div>
            </div>
            <div className={styles.cardRow}>
              <span className={styles.cardLabel}>Ma vach</span>
              <span className={styles.cardValue}>{row.barcode || '—'}</span>
            </div>
            <div className={styles.cardRow}>
              <span className={styles.cardLabel}>So luong ton</span>
              <span className={styles.cardValue}>
                {row.stockQuantity > 0 ? row.stockQuantity : <span className={styles.stockZero}>0</span>}
              </span>
            </div>
            <div className={styles.cardRow}>
              <span className={styles.cardLabel}>Tinh trang</span>
              <span className={styles.cardValue}>{row.condition}</span>
            </div>
            <div className={styles.cardRow}>
              <span className={styles.cardLabel}>Site</span>
              <span className={styles.cardValue}>{row.site}</span>
            </div>
            <div className={styles.cardRow}>
              <span className={styles.cardLabel}>Gia ban</span>
              <span className={styles.cardValue}>{formatVnd(row.salePrice)}</span>
            </div>
            <div className={styles.cardRow}>
              <span className={styles.cardLabel}>Mua duoc</span>
              <span className={styles.cardValue}>
                {row.canPurchase ? (
                  <span className={styles.purchaseOk}>Co the mua</span>
                ) : (
                  <span className={styles.purchaseNo}>Het hang</span>
                )}
              </span>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Danh sach tai san co the mua</h1>
        <p className={styles.subtitle}>
          Xem ma tai san, ma vach, ton kho, hinh anh, tinh trang, site va gia ban. Chi tai san con ton moi duoc phep dang
          ky mua.
        </p>
      </header>

      <div className={styles.toolbar}>
        <span className={styles.countBadge}>Tong: {rows.length} tai san</span>
        <span className={styles.countBadge}>Co the mua (ton &gt; 0): {purchasableRows.length}</span>
        <PrimaryButton
          text="Tai lai danh sach"
          disabled={loading}
          onClick={(): void => {
            setLoading(true);
            setError('');
            window.setTimeout(() => {
              setRows(MOCK_ROWS);
              setLoading(false);
            }, 150);
          }}
        />
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      {loading ? (
        <div className={styles.loading}>
          <Spinner size={SpinnerSize.large} label="Dang tai danh sach tai san..." />
        </div>
      ) : (
        <>
          {renderTable()}
          {renderCards()}
        </>
      )}
    </div>
  );
}
