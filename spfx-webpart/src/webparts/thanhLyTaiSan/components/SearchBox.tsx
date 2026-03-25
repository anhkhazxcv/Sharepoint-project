import * as React from 'react';
import styles from './SearchBox.module.scss';

export interface ISearchBoxProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function SearchBox(props: ISearchBoxProps): React.ReactElement {
  const { value, placeholder, onChange } = props;

  return (
    <label className={styles.searchBox}>
      <span className={styles.icon} aria-hidden="true">
        Tìm
      </span>
      <input
        className={styles.input}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    </label>
  );
}
