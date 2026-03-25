import * as React from 'react';
import { PurchaseLimitBadge } from './PurchaseLimitBadge';
import { SearchBox } from './SearchBox';
import type { IAssetFilters } from './types';
import styles from './FilterBar.module.scss';

export interface IFilterBarProps {
  filters: IAssetFilters;
  categories: string[];
  conditions: string[];
  sites: string[];
  searchValue: string;
  purchasedCount: number;
  maxLimit: number;
  onFilterChange: (key: keyof IAssetFilters, value: string) => void;
  onSearchChange: (value: string) => void;
}

interface ISelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function SelectField(props: ISelectFieldProps): React.ReactElement {
  const { id, label, value, options, onChange } = props;

  return (
    <label className={styles.filterField} htmlFor={id}>
      <span className={styles.filterLabel}>{label}</span>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      >
        <option value="">Tất cả</option>
        {options.map((option: string) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar(props: IFilterBarProps): React.ReactElement {
  const {
    filters,
    categories,
    conditions,
    sites,
    searchValue,
    purchasedCount,
    maxLimit,
    onFilterChange,
    onSearchChange
  } = props;

  return (
    <section className={styles.filterBar}>
      <div className={styles.leftGroup}>
        <SelectField
          id="filter-category"
          label="Phân loại"
          value={filters.category}
          options={categories}
          onChange={(value: string) => onFilterChange('category', value)}
        />
        <SelectField
          id="filter-condition"
          label="Tình trạng"
          value={filters.condition}
          options={conditions}
          onChange={(value: string) => onFilterChange('condition', value)}
        />
        <SelectField
          id="filter-site"
          label="Site"
          value={filters.site}
          options={sites}
          onChange={(value: string) => onFilterChange('site', value)}
        />
      </div>

      <div className={styles.rightGroup}>
        <PurchaseLimitBadge purchasedCount={purchasedCount} maxLimit={maxLimit} />
        <SearchBox value={searchValue} placeholder="Tìm kiếm Mã/Tên TS" onChange={onSearchChange} />
      </div>
    </section>
  );
}
