import * as React from 'react';
import styles from './ThanhLyTaiSan.module.scss';
import type { IThanhLyTaiSanProps } from './IThanhLyTaiSanProps';

type AssetStatus = 'available' | 'soldout';
type RequestStatus = 'registered' | 'paid' | 'handedover';
type ActiveView = 'employee' | 'management';

interface IAssetItem {
  id: string;
  name: string;
  category: string;
  assetCode: string;
  barcode: string;
  salePrice: number;
  location: string;
  condition: string;
  note: string;
  imageUrl: string;
  fallbackImageUrl: string;
  status: AssetStatus;
}

interface IRequestItem {
  id: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  barcode: string;
  salePrice: number;
  registeredAt: string;
  paymentMethod: string;
  status: RequestStatus;
}

interface IThanhLyTaiSanState {
  activeView: ActiveView;
  assets: IAssetItem[];
  requests: IRequestItem[];
  selectedAssetIds: string[];
}

const PURCHASE_LIMIT: number = 5;
const DEFAULT_EMPLOYEE_NAME: string = 'Can bo nhan vien';
const SHAREPOINT_SAMPLE_URL: string =
  'https://masterisegroup.sharepoint.com/:i:/s/test/IQBQyQwHNxHmTI1hagsyywnYAVHbWbDDrVWjKsJC_sjcxBA?e=SGC6Cp';

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);

const statusLabelMap: Record<AssetStatus, string> = {
  available: 'Con hang',
  soldout: 'Het hang'
};

const requestStatusLabelMap: Record<RequestStatus, string> = {
  registered: 'Cho thanh toan',
  paid: 'Da thanh toan',
  handedover: 'Da ban giao'
};

const requestStatusClassMap: Record<RequestStatus, string> = {
  registered: styles.statusRegistered,
  paid: styles.statusPaid,
  handedover: styles.statusHandedOver
};

function createAssetSvg(label: string, accent: string, background: string): string {
  const svg: string =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 220'>" +
    "<rect width='320' height='220' rx='24' fill='" + background + "'/>" +
    "<rect x='24' y='24' width='272' height='110' rx='18' fill='" + accent + "' opacity='0.18'/>" +
    "<circle cx='72' cy='79' r='26' fill='white' opacity='0.92'/>" +
    "<rect x='112' y='56' width='124' height='16' rx='8' fill='white' opacity='0.96'/>" +
    "<rect x='112' y='84' width='92' height='12' rx='6' fill='white' opacity='0.72'/>" +
    "<rect x='24' y='152' width='272' height='44' rx='16' fill='white' opacity='0.88'/>" +
    "<text x='36' y='180' font-family='Segoe UI, Arial' font-size='22' font-weight='700' fill='#1f2937'>" +
    label +
    '</text>' +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function getCurrentEmployeeName(props: IThanhLyTaiSanProps): string {
  return props.userDisplayName || DEFAULT_EMPLOYEE_NAME;
}

function getEmployeeRequestCount(employeeName: string, requests: IRequestItem[]): number {
  return requests.filter((request: IRequestItem) => request.employeeName === employeeName).length;
}

function getEmployeeRemainingQuota(employeeName: string, requests: IRequestItem[]): number {
  const usedQuota: number = getEmployeeRequestCount(employeeName, requests);
  const remainingQuota: number = PURCHASE_LIMIT - usedQuota;

  return remainingQuota > 0 ? remainingQuota : 0;
}

function createInitialAssets(): IAssetItem[] {
  return [
    {
      id: 'asset-1',
      name: 'Laptop Dell Latitude 5420',
      category: 'Laptop',
      assetCode: 'TS-IT-001',
      barcode: '893850100001',
      salePrice: 7200000,
      location: 'Kho CNTT - Tang 5',
      condition: 'Hoat dong tot, pin 80%',
      note: 'Anh dang doc truc tiep tu SharePoint URL. Co fallback neu link khong render duoc trong img.',
      imageUrl: SHAREPOINT_SAMPLE_URL,
      fallbackImageUrl: createAssetSvg('Dell Latitude 5420', '#0f766e', '#dff7f2'),
      status: 'available'
    },
    {
      id: 'asset-2',
      name: 'Man hinh Samsung 24"',
      category: 'Monitor',
      assetCode: 'TS-IT-014',
      barcode: '893850100014',
      salePrice: 1800000,
      location: 'Kho CNTT - Tang 5',
      condition: 'Moi 85%, khong loi diem chet',
      note: 'Co the thay bang URL SharePoint rieng cho tung tai san.',
      imageUrl: SHAREPOINT_SAMPLE_URL,
      fallbackImageUrl: createAssetSvg('Samsung Monitor 24"', '#2563eb', '#e6f0ff'),
      status: 'available'
    },
    {
      id: 'asset-3',
      name: 'iPhone 11 64GB',
      category: 'Dien thoai',
      assetCode: 'TS-MB-021',
      barcode: '893850100021',
      salePrice: 5500000,
      location: 'Kho Hanh chinh',
      condition: 'May tray nhe, pin 82%',
      note: 'Tai san nay dang het hang.',
      imageUrl: SHAREPOINT_SAMPLE_URL,
      fallbackImageUrl: createAssetSvg('iPhone 11 64GB', '#be185d', '#fde7f3'),
      status: 'soldout'
    },
    {
      id: 'asset-4',
      name: 'Ghe cong thai hoc Merryfair',
      category: 'Noi that',
      assetCode: 'TS-HC-008',
      barcode: '893850100008',
      salePrice: 950000,
      location: 'Kho Hanh chinh',
      condition: 'Moi 80%, piston on dinh',
      note: 'Nhan vien tu bo tri van chuyen sau khi ban giao.',
      imageUrl: SHAREPOINT_SAMPLE_URL,
      fallbackImageUrl: createAssetSvg('Merryfair Chair', '#b45309', '#fff3db'),
      status: 'available'
    },
    {
      id: 'asset-5',
      name: 'May in HP LaserJet Pro',
      category: 'Thiet bi van phong',
      assetCode: 'TS-VP-032',
      barcode: '893850100032',
      salePrice: 2300000,
      location: 'Kho Van phong pham',
      condition: 'In tot, can thay muc sau 1.000 trang',
      note: 'Data local co the doi sang SharePoint List sau.',
      imageUrl: SHAREPOINT_SAMPLE_URL,
      fallbackImageUrl: createAssetSvg('HP LaserJet Pro', '#7c3aed', '#f1eafe'),
      status: 'available'
    },
    {
      id: 'asset-6',
      name: 'May cham cong Ronald Jack',
      category: 'Thiet bi van phong',
      assetCode: 'TS-HC-011',
      barcode: '893850100011',
      salePrice: 1200000,
      location: 'Kho Hanh chinh',
      condition: 'Thiet bi con tot, du adapter',
      note: 'Phu hop cho chi nhanh nho.',
      imageUrl: SHAREPOINT_SAMPLE_URL,
      fallbackImageUrl: createAssetSvg('Ronald Jack', '#1d4ed8', '#e0edff'),
      status: 'soldout'
    }
  ];
}

function createInitialRequests(assets: IAssetItem[]): IRequestItem[] {
  return [
    {
      id: 'req-1001',
      employeeName: 'Nguyen Thu Ha',
      employeeCode: 'NV0248',
      department: 'Khoi Tai chinh',
      assetId: assets[2].id,
      assetName: assets[2].name,
      assetCode: assets[2].assetCode,
      barcode: assets[2].barcode,
      salePrice: assets[2].salePrice,
      registeredAt: '25/03/2026 08:15',
      paymentMethod: 'Chuyen khoan noi bo',
      status: 'paid'
    },
    {
      id: 'req-1002',
      employeeName: 'Tran Minh Quan',
      employeeCode: 'NV0112',
      department: 'Khoi Van hanh',
      assetId: assets[5].id,
      assetName: assets[5].name,
      assetCode: assets[5].assetCode,
      barcode: assets[5].barcode,
      salePrice: assets[5].salePrice,
      registeredAt: '25/03/2026 08:42',
      paymentMethod: 'Tien mat',
      status: 'handedover'
    }
  ];
}

export default class ThanhLyTaiSan extends React.Component<IThanhLyTaiSanProps, IThanhLyTaiSanState> {
  public constructor(props: IThanhLyTaiSanProps) {
    super(props);

    const assets: IAssetItem[] = createInitialAssets();

    this.state = {
      activeView: 'employee',
      assets,
      requests: createInitialRequests(assets),
      selectedAssetIds: []
    };
  }

  private handleImageError = (event: React.SyntheticEvent<HTMLImageElement>, fallbackImageUrl: string): void => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = fallbackImageUrl;
  };

  private handleSelectAsset = (assetId: string): void => {
    this.setState((prevState) => {
      const currentEmployeeName: string = getCurrentEmployeeName(this.props);
      const remainingQuota: number = getEmployeeRemainingQuota(currentEmployeeName, prevState.requests);
      const asset: IAssetItem | undefined = prevState.assets.filter((item: IAssetItem) => item.id === assetId)[0];

      if (!asset || asset.status === 'soldout') {
        return null;
      }

      const alreadySelected: boolean = prevState.selectedAssetIds.indexOf(assetId) >= 0;

      if (alreadySelected) {
        return {
          selectedAssetIds: prevState.selectedAssetIds.filter((id: string) => id !== assetId)
        };
      }

      if (remainingQuota === 0 || prevState.selectedAssetIds.length >= remainingQuota) {
        return null;
      }

      return {
        selectedAssetIds: [...prevState.selectedAssetIds, assetId]
      };
    });
  };

  private handleRegisterAssets = (): void => {
    this.setState((prevState) => {
      const currentEmployeeName: string = getCurrentEmployeeName(this.props);
      const remainingQuota: number = getEmployeeRemainingQuota(currentEmployeeName, prevState.requests);

      if (prevState.selectedAssetIds.length === 0 || remainingQuota === 0) {
        return null;
      }

      const allowedAssetIds: string[] = prevState.selectedAssetIds.slice(0, remainingQuota);
      const selectedAssets: IAssetItem[] = prevState.assets.filter(
        (asset: IAssetItem) => allowedAssetIds.indexOf(asset.id) >= 0
      );

      const updatedAssets: IAssetItem[] = prevState.assets.map((asset: IAssetItem) =>
        allowedAssetIds.indexOf(asset.id) >= 0 ? { ...asset, status: 'soldout' } : asset
      );

      const newRequests: IRequestItem[] = selectedAssets.map((asset: IAssetItem, index: number) => ({
        id: 'req-local-' + String(prevState.requests.length + index + 1),
        employeeName: currentEmployeeName,
        employeeCode: 'NV-DEMO',
        department: 'Khoi Noi bo',
        assetId: asset.id,
        assetName: asset.name,
        assetCode: asset.assetCode,
        barcode: asset.barcode,
        salePrice: asset.salePrice,
        registeredAt: '25/03/2026 09:30',
        paymentMethod: 'Cho xac nhan',
        status: 'registered'
      }));

      return {
        assets: updatedAssets,
        requests: [...newRequests, ...prevState.requests],
        selectedAssetIds: [],
        activeView: 'management'
      };
    });
  };

  private handleUpdateRequestStatus = (requestId: string, status: RequestStatus): void => {
    this.setState((prevState) => ({
      requests: prevState.requests.map((request: IRequestItem) =>
        request.id === requestId
          ? {
              ...request,
              status,
              paymentMethod:
                status === 'paid' && request.paymentMethod === 'Cho xac nhan'
                  ? 'Chuyen khoan noi bo'
                  : request.paymentMethod
            }
          : request
      )
    }));
  };

  private renderEmployeeView(): React.ReactNode {
    const currentEmployeeName: string = getCurrentEmployeeName(this.props);
    const { assets, requests, selectedAssetIds } = this.state;
    const availableCount: number = assets.filter((asset: IAssetItem) => asset.status === 'available').length;
    const currentEmployeeCount: number = getEmployeeRequestCount(currentEmployeeName, requests);
    const remainingQuota: number = getEmployeeRemainingQuota(currentEmployeeName, requests);
    const totalSelectedPrice: number = assets
      .filter((asset: IAssetItem) => selectedAssetIds.indexOf(asset.id) >= 0)
      .reduce((sum: number, asset: IAssetItem) => sum + asset.salePrice, 0);

    return (
      <div className={styles.viewPanel}>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.eyebrow}>Man hinh 1</span>
            <h2 className={styles.heroTitle}>Dang ky mua tai san cho Can bo Nhan vien</h2>
            <p className={styles.heroText}>
              Moi nhan vien duoc dang ky toi da 5 san pham tinh tren toan bo cac phieu da tao. Anh san pham dang doc tu
              URL SharePoint va hien thi fallback neu link chia se khong render truc tiep trong the img.
            </p>
          </div>

          <div className={styles.ruleBox}>
            <div className={styles.ruleValue}>{currentEmployeeCount + selectedAssetIds.length}/{PURCHASE_LIMIT}</div>
            <div className={styles.ruleLabel}>Tong san pham cua nhan vien</div>
            <div className={styles.ruleHint}>Con lai co the dang ky: {remainingQuota}</div>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Tai san con mo dang ky</span>
            <strong className={styles.summaryValue}>{availableCount}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Tong gia tri da chon</span>
            <strong className={styles.summaryValue}>{formatCurrency(totalSelectedPrice)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Quota cua {currentEmployeeName}</span>
            <strong className={styles.summaryValue}>{remainingQuota} san pham</strong>
          </div>
        </div>

        <div className={styles.assetGrid}>
          {assets.map((asset: IAssetItem) => {
            const isSelected: boolean = selectedAssetIds.indexOf(asset.id) >= 0;
            const isSoldOut: boolean = asset.status === 'soldout';
            const isBlockedByQuota: boolean = !isSelected && remainingQuota === 0;

            return (
              <article
                key={asset.id}
                className={`${styles.assetCard} ${isSelected ? styles.assetCardSelected : ''} ${
                  isSoldOut ? styles.assetCardSoldOut : ''
                }`}
              >
                <div className={styles.assetImageWrap}>
                  <img
                    src={asset.imageUrl}
                    alt={asset.name}
                    className={styles.assetImage}
                    onError={(event: React.SyntheticEvent<HTMLImageElement>) =>
                      this.handleImageError(event, asset.fallbackImageUrl)
                    }
                  />
                  <span className={`${styles.assetStatus} ${isSoldOut ? styles.assetStatusSoldOut : styles.assetStatusAvailable}`}>
                    {statusLabelMap[asset.status]}
                  </span>
                </div>

                <div className={styles.assetBody}>
                  <div className={styles.assetMetaTop}>
                    <span className={styles.assetCategory}>{asset.category}</span>
                    <span className={styles.assetCode}>{asset.assetCode}</span>
                  </div>

                  <h3 className={styles.assetTitle}>{asset.name}</h3>
                  <div className={styles.priceRow}>{formatCurrency(asset.salePrice)}</div>

                  <dl className={styles.metaList}>
                    <div className={styles.metaItem}>
                      <dt>Ma vach</dt>
                      <dd>{asset.barcode}</dd>
                    </div>
                    <div className={styles.metaItem}>
                      <dt>Vi tri</dt>
                      <dd>{asset.location}</dd>
                    </div>
                    <div className={styles.metaItem}>
                      <dt>Tinh trang</dt>
                      <dd>{asset.condition}</dd>
                    </div>
                  </dl>

                  <p className={styles.assetNote}>{asset.note}</p>

                  <button
                    type="button"
                    className={styles.selectButton}
                    onClick={() => this.handleSelectAsset(asset.id)}
                    disabled={isSoldOut || isBlockedByQuota}
                  >
                    {isSoldOut ? 'Da het hang' : isBlockedByQuota ? 'Da het quota 5 san pham' : isSelected ? 'Bo chon tai san' : 'Chon dang ky'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className={styles.actionBar}>
          <div>
            <strong className={styles.actionTitle}>Luu y dang ky</strong>
            <p className={styles.actionText}>
              Sau khi dang ky, tai san se chuyen sang danh sach QLTS de xac nhan thanh toan va ban giao.
            </p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={this.handleRegisterAssets}
            disabled={selectedAssetIds.length === 0 || remainingQuota === 0}
          >
            Dang ky {selectedAssetIds.length > 0 ? `(${selectedAssetIds.length})` : ''}
          </button>
        </div>
      </div>
    );
  }

  private renderManagementView(): React.ReactNode {
    const { requests } = this.state;
    const waitingPayment: number = requests.filter((request: IRequestItem) => request.status === 'registered').length;
    const readyHandover: number = requests.filter((request: IRequestItem) => request.status === 'paid').length;
    const handedOver: number = requests.filter((request: IRequestItem) => request.status === 'handedover').length;

    return (
      <div className={styles.viewPanel}>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.eyebrow}>Man hinh 2</span>
            <h2 className={styles.heroTitle}>Quan ly thanh toan va ban giao cho QLTS</h2>
            <p className={styles.heroText}>
              QLTS theo doi cac phieu dang ky thanh cong, xac nhan da thanh toan va thuc hien ban giao tai san theo dung
              trinh tu xu ly.
            </p>
          </div>

          <div className={styles.managementLegend}>
            <span className={`${styles.legendDot} ${styles.legendWaiting}`}>Cho thanh toan</span>
            <span className={`${styles.legendDot} ${styles.legendPaid}`}>Da thanh toan</span>
            <span className={`${styles.legendDot} ${styles.legendDone}`}>Da ban giao</span>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Cho thanh toan</span>
            <strong className={styles.summaryValue}>{waitingPayment}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>San sang ban giao</span>
            <strong className={styles.summaryValue}>{readyHandover}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Da ban giao xong</span>
            <strong className={styles.summaryValue}>{handedOver}</strong>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.requestTable}>
            <thead>
              <tr>
                <th>Nhan vien</th>
                <th>Tai san</th>
                <th>Ma vach</th>
                <th>Gia ban</th>
                <th>Thanh toan</th>
                <th>Trang thai</th>
                <th>Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request: IRequestItem) => (
                <tr key={request.id}>
                  <td>
                    <strong>{request.employeeName}</strong>
                    <span className={styles.cellSubText}>
                      {request.employeeCode} - {request.department}
                    </span>
                    <span className={styles.cellSubText}>Dang ky luc {request.registeredAt}</span>
                  </td>
                  <td>
                    <strong>{request.assetName}</strong>
                    <span className={styles.cellSubText}>{request.assetCode}</span>
                  </td>
                  <td>{request.barcode}</td>
                  <td>{formatCurrency(request.salePrice)}</td>
                  <td>{request.paymentMethod}</td>
                  <td>
                    <span className={`${styles.requestStatus} ${requestStatusClassMap[request.status]}`}>
                      {requestStatusLabelMap[request.status]}
                    </span>
                  </td>
                  <td>
                    <div className={styles.tableActions}>
                      {request.status === 'registered' && (
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => this.handleUpdateRequestStatus(request.id, 'paid')}
                        >
                          Xac nhan thanh toan
                        </button>
                      )}
                      {request.status === 'paid' && (
                        <button
                          type="button"
                          className={styles.primaryButtonSmall}
                          onClick={() => this.handleUpdateRequestStatus(request.id, 'handedover')}
                        >
                          Ban giao tai san
                        </button>
                      )}
                      {request.status === 'handedover' && <span className={styles.completedText}>Hoan tat</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  public render(): React.ReactElement<IThanhLyTaiSanProps> {
    const { activeView } = this.state;

    return (
      <section className={`${styles.thanhLyTaiSan} ${this.props.hasTeamsContext ? styles.teams : ''}`}>
        <div className={styles.shell}>
          <div className={styles.header}>
            <div>
              <span className={styles.kicker}>Thanh ly tai san noi bo</span>
              <h1 className={styles.pageTitle}>Demo 2 man hinh nghiep vu voi data local</h1>
              <p className={styles.pageSubtitle}>
                Luong tu dang ky mua cua CBNV sang xac nhan thanh toan va ban giao cho bo phan QLTS.
              </p>
            </div>

            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tabButton} ${activeView === 'employee' ? styles.tabActive : ''}`}
                onClick={() => this.setState({ activeView: 'employee' })}
              >
                Dang ky mua
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${activeView === 'management' ? styles.tabActive : ''}`}
                onClick={() => this.setState({ activeView: 'management' })}
              >
                Quan ly va ban giao
              </button>
            </div>
          </div>

          {activeView === 'employee' ? this.renderEmployeeView() : this.renderManagementView()}
        </div>
      </section>
    );
  }
}
