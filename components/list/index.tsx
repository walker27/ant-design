import * as React from 'react';
import classNames from 'classnames';
import omit from 'omit.js';
import Spin, { SpinProps } from '../spin';
import { RenderEmptyHandler, ConfigContext } from '../config-provider';

import Pagination, { PaginationConfig } from '../pagination';
import { Row } from '../grid';

import Item from './Item';

export { ListItemProps, ListItemMetaProps } from './Item';

export type ColumnCount = 1 | 2 | 3 | 4 | 6 | 8 | 12 | 24;

export type ColumnType = 'gutter' | 'column' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface ListGridType {
  gutter?: number;
  column?: ColumnCount;
  xs?: ColumnCount;
  sm?: ColumnCount;
  md?: ColumnCount;
  lg?: ColumnCount;
  xl?: ColumnCount;
  xxl?: ColumnCount;
}

export type ListSize = 'small' | 'default' | 'large';

export type ListItemLayout = 'horizontal' | 'vertical';

export interface ListProps<T> {
  bordered?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  dataSource?: T[];
  extra?: React.ReactNode;
  grid?: ListGridType;
  id?: string;
  itemLayout?: ListItemLayout;
  loading?: boolean | SpinProps;
  loadMore?: React.ReactNode;
  pagination?: PaginationConfig | false;
  prefixCls?: string;
  rowKey?: ((item: T) => string) | string;
  renderItem?: (item: T, index: number) => React.ReactNode;
  size?: ListSize;
  split?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  locale?: ListLocale;
}

export interface ListLocale {
  emptyText: React.ReactNode | (() => React.ReactNode);
}

export interface ListConsumerProps {
  grid?: any;
  itemLayout?: string;
}

export const ListContext = React.createContext<ListConsumerProps>({});

export const ListConsumer = ListContext.Consumer;

function List<T>({ pagination, ...props }: ListProps<T>) {
  const paginationObj = pagination && typeof pagination === 'object' ? pagination : {};

  const [paginationCurrent, setPaginationCurrent] = React.useState(
    paginationObj.defaultCurrent || 1,
  );
  const [paginationSize, setPaginationSize] = React.useState(paginationObj.defaultPageSize || 10);

  const { getPrefixCls, renderEmpty, direction } = React.useContext(ConfigContext);

  const defaultPaginationProps = {
    current: 1,
    total: 0,
  };

  const keys: { [key: string]: string } = {};

  const triggerPaginationEvent = (eventName: string) => {
    return (page: number, pageSize: number) => {
      setPaginationCurrent(page);
      setPaginationSize(pageSize);
      if (pagination && (pagination as any)[eventName]) {
        (pagination as any)[eventName](page, pageSize);
      }
    };
  };

  const onPaginationChange = triggerPaginationEvent('onChange');

  const onPaginationShowSizeChange = triggerPaginationEvent('onShowSizeChange');

  const renderItem = (item: any, index: number) => {
    const { rowKey } = props;
    if (!props.renderItem) return null;

    let key;

    if (typeof rowKey === 'function') {
      key = rowKey(item);
    } else if (typeof rowKey === 'string') {
      key = item[rowKey];
    } else {
      key = item.key;
    }

    if (!key) {
      key = `list-item-${index}`;
    }

    keys[index] = key;

    return props.renderItem(item, index);
  };

  const isSomethingAfterLastItem = () => {
    const { loadMore, footer } = props;
    return !!(loadMore || pagination || footer);
  };

  const renderEmptyFunc = (prefixCls: string, renderEmptyHandler: RenderEmptyHandler) => {
    const { locale } = props;

    return (
      <div className={`${prefixCls}-empty-text`}>
        {(locale && locale.emptyText) || renderEmptyHandler('List')}
      </div>
    );
  };

  const {
    prefixCls: customizePrefixCls,
    bordered,
    split,
    className,
    children,
    itemLayout,
    loadMore,
    grid,
    dataSource = [],
    size,
    header,
    footer,
    loading,
    ...rest
  } = props;

  const prefixCls = getPrefixCls('list', customizePrefixCls);
  let loadingProp = loading;
  if (typeof loadingProp === 'boolean') {
    loadingProp = {
      spinning: loadingProp,
    };
  }
  const isLoading = loadingProp && loadingProp.spinning;

  // large => lg
  // small => sm
  let sizeCls = '';
  switch (size) {
    case 'large':
      sizeCls = 'lg';
      break;
    case 'small':
      sizeCls = 'sm';
      break;
    default:
      break;
  }

  const classString = classNames(prefixCls, className, {
    [`${prefixCls}-vertical`]: itemLayout === 'vertical',
    [`${prefixCls}-${sizeCls}`]: sizeCls,
    [`${prefixCls}-split`]: split,
    [`${prefixCls}-bordered`]: bordered,
    [`${prefixCls}-loading`]: isLoading,
    [`${prefixCls}-grid`]: grid,
    [`${prefixCls}-something-after-last-item`]: isSomethingAfterLastItem(),
    [`${prefixCls}-rtl`]: direction === 'rtl',
  });

  const paginationProps = {
    ...defaultPaginationProps,
    total: dataSource.length,
    current: paginationCurrent,
    pageSize: paginationSize,
    ...(pagination || {}),
  };

  const largestPage = Math.ceil(paginationProps.total / paginationProps.pageSize);
  if (paginationProps.current > largestPage) {
    paginationProps.current = largestPage;
  }
  const paginationContent = pagination ? (
    <div className={`${prefixCls}-pagination`}>
      <Pagination
        {...paginationProps}
        onChange={onPaginationChange}
        onShowSizeChange={onPaginationShowSizeChange}
      />
    </div>
  ) : null;

  let splitDataSource = [...dataSource];
  if (pagination) {
    if (dataSource.length > (paginationProps.current - 1) * paginationProps.pageSize) {
      splitDataSource = [...dataSource].splice(
        (paginationProps.current - 1) * paginationProps.pageSize,
        paginationProps.pageSize,
      );
    }
  }

  let childrenContent;
  childrenContent = isLoading && <div style={{ minHeight: 53 }} />;
  if (splitDataSource.length > 0) {
    const items = splitDataSource.map((item: any, index: number) => renderItem(item, index));

    const childrenList: Array<React.ReactNode> = [];
    React.Children.forEach(items, (child: any, index) => {
      childrenList.push(
        React.cloneElement(child, {
          key: keys[index],
        }),
      );
    });

    childrenContent = grid ? (
      <Row gutter={grid.gutter}>{childrenList}</Row>
    ) : (
      <ul className={`${prefixCls}-items`}>{childrenList}</ul>
    );
  } else if (!children && !isLoading) {
    childrenContent = renderEmptyFunc(prefixCls, renderEmpty);
  }

  const paginationPosition = paginationProps.position || 'bottom';

  return (
    <ListContext.Provider value={{ grid: props.grid, itemLayout: props.itemLayout }}>
      <div className={classString} {...omit(rest, ['rowKey', 'renderItem', 'locale'])}>
        {(paginationPosition === 'top' || paginationPosition === 'both') && paginationContent}
        {header && <div className={`${prefixCls}-header`}>{header}</div>}
        <Spin {...loadingProp}>
          {childrenContent}
          {children}
        </Spin>
        {footer && <div className={`${prefixCls}-footer`}>{footer}</div>}
        {loadMore ||
          ((paginationPosition === 'bottom' || paginationPosition === 'both') && paginationContent)}
      </div>
    </ListContext.Provider>
  );
}

List.defaultProps = {
  dataSource: [],
  bordered: false,
  split: true,
  loading: false,
  pagination: false as ListProps<any>['pagination'],
};

List.Item = Item;

export default List;
