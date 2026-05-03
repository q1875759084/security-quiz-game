import React, { useCallback } from 'react';
import styles from './index.module.scss';
import { useAuth } from '../../App';

// ─── 首页 Header（含搜索框） ──────────────────────────────────────────────────
export interface HomeHeaderProps {
  searchValue: string;
  onSearchChange: (val: string) => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ searchValue, onSearchChange }) => {
  const { isLoggedIn, user, openLoginModal, handleLogout } = useAuth();

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value),
    [onSearchChange],
  );

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo / 标题 */}
        <div className={styles.logo}>狒批故事馆</div>

        {/* 搜索框 */}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="搜索剧本名称、标签…"
            value={searchValue}
            onChange={handleInput}
          />
          {searchValue && (
            <button className={styles.searchClear} onClick={() => onSearchChange('')}>
              ×
            </button>
          )}
        </div>

        {/* 用户区域 */}
        <div className={styles.user}>
          {isLoggedIn ? (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.username || '用户'}</span>
              <button className={styles.logoutBtn} onClick={handleLogout}>退出</button>
            </div>
          ) : (
            <button className={styles.loginBtn} onClick={openLoginModal}>登录</button>
          )}
        </div>
      </div>
    </header>
  );
};

// ─── 游戏页 Header（含返回按钮） ─────────────────────────────────────────────
export interface GameHeaderProps {
  scriptTitle?: string;
  onBack: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ scriptTitle, onBack }) => {
  const { isLoggedIn, user, openLoginModal } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* 返回按钮 */}
        <button className={styles.backBtn} onClick={onBack}>
          ← 返回首页
        </button>

        {/* 剧本标题 */}
        {scriptTitle && <div className={styles.scriptTitle}>{scriptTitle}</div>}

        {/* 用户区域 */}
        <div className={styles.user}>
          {isLoggedIn ? (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.username || '用户'}</span>
            </div>
          ) : (
            <button className={styles.loginBtn} onClick={openLoginModal}>登录</button>
          )}
        </div>
      </div>
    </header>
  );
};

// 默认导出首页版（向后兼容，避免破坏其他潜在引用）
export default HomeHeader;
