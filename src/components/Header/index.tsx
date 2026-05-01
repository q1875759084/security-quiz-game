import React from 'react';
import styles from './index.module.scss';

/**
 * 用户信息类型定义
 */
export interface User {
  name: string;
  id?: number;
  avatar?: string;
  email?: string;
}

/**
 * Header 组件属性类型定义
 */
export interface HeaderProps {
  /** 用户信息对象 */
  user?: User;
  /** 是否登录 */
  isLoggedIn: boolean;
  /** 登录按钮点击事件 */
  onLoginClick?: () => void;
}

/**
 * 顶部导航栏组件
 * @description 仅展示用户信息或登录按钮
 */
const Header: React.FC<HeaderProps> = ({
  user,
  isLoggedIn,
  onLoginClick = () => {},
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* 用户信息区域 */}
        <div className={styles.user}>
          {isLoggedIn ? (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name || '用户'}</span>
            </div>
          ) : (
            <button className={styles.loginBtn} onClick={onLoginClick}>
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;