import { Layout } from 'antd';
import React, { useEffect } from 'react';
import { renderRoutes } from 'react-router-config';
import { IRouteConfig } from '@/routes/config';
import useStore from '@/store';
import BasicHeader from './Header';
import styles from './index.module.less';
import Provider from '@/ts/core/provider';

type BasicLayoutProps = {
  route: IRouteConfig;
  history: any;
};

const BasicLayout: React.FC<BasicLayoutProps> = (props) => {
  const { route, history } = props;
  const { getUserInfo } = useStore((state) => ({ ...state }));
  useEffect(() => {
    if (Provider.getPerson) {
      getUserInfo();
    } else {
      history.push('/passport/login');
    }
  }, []);

  return (
    <Layout className={styles['page-layout']}>
      {/* 公共头部 */}
      <BasicHeader />
      {/* 内容区域 */}
      <Layout>{renderRoutes(route.routes)}</Layout>
    </Layout>
  );
};

export default BasicLayout;
