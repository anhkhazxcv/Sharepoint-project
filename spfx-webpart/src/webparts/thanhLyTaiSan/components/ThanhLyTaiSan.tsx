import * as React from 'react';
import type { IThanhLyTaiSanProps } from './IThanhLyTaiSanProps';
import { OrderWorkspace } from './OrderWorkspace';
import styles from './ThanhLyTaiSan.module.scss';

export default function ThanhLyTaiSan(props: IThanhLyTaiSanProps): React.ReactElement<IThanhLyTaiSanProps> {
  return (
    <section className={`${styles.thanhLyTaiSan} ${props.hasTeamsContext ? styles.teams : ''}`}>
      <OrderWorkspace
        userDisplayName={props.userDisplayName}
        userEmail={props.userEmail}
        spHttpClient={props.spHttpClient}
        siteUrl={props.siteUrl}
      />
    </section>
  );
}
