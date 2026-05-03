import React, { useState, useCallback } from 'react';
import { HomeHeader } from '../../components/Header';
import { useScriptList } from '../../hooks/useScripts';
import type { ScriptMeta } from '../../types/script';
import styles from './index.module.scss';

interface HomePageProps {
  /** 点击剧本进入游戏，同时传递完整 meta 供 GamePage 使用 */
  onEnterGame: (scriptId: string, meta: ScriptMeta) => void;
}

const ScriptCard: React.FC<{ script: ScriptMeta; onEnter: () => void }> = ({
  script,
  onEnter,
}) => (
  <div className={styles.card} onClick={onEnter}>
    <div className={styles.cardBody}>
      <div className={styles.cardTitle}>{script.title}</div>
      <p className={styles.cardDesc}>{script.description}</p>
      <div className={styles.tagList}>
        {script.tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>
    </div>
    <div className={styles.cardEnterBtn}>开始游戏 →</div>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({ onEnterGame }) => {
  const [searchValue, setSearchValue] = useState('');
  const { scripts, isLoading, error } = useScriptList(searchValue);

  const handleSearchChange = useCallback((val: string) => setSearchValue(val), []);

  return (
    <div className={styles.page}>
      <HomeHeader searchValue={searchValue} onSearchChange={handleSearchChange} />

      <main className={styles.main}>
        {/* 标题区 */}
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>狒批故事馆</h1>
          <p className={styles.heroSub}>这大抵应该是个简介</p>
        </div>

        {/* 搜索结果提示 */}
        {searchValue && (
          <div className={styles.searchHint}>
            搜索「{searchValue}」，共找到 {scripts.length} 个剧本
          </div>
        )}

        {/* 内容区 */}
        {isLoading ? (
          <div className={styles.empty}>加载中…</div>
        ) : error ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⚠️</span>
            <span>{error}</span>
          </div>
        ) : scripts.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📭</span>
            <span>没有找到符合条件的剧本</span>
          </div>
        ) : (
          <div className={styles.grid}>
            {scripts.map((s) => (
              <ScriptCard key={s.id} script={s} onEnter={() => onEnterGame(s.id, s)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;
