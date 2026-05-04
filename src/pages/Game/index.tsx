import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameHeader } from '../../components/Header';
import { useScriptNode } from '../../hooks/useScripts';
import type { ScriptNode, Outcome, ScriptMeta } from '../../types/script'; // ScriptMeta 供 GamePageProps 使用
import styles from './index.module.scss';

interface GamePageProps {
  scriptId: string;
  /** 剧本元数据（含 entryNodeId、title），由首页传入，避免 Game 页重复请求列表 */
  scriptMeta: ScriptMeta;
  onBack: () => void;
}

// ─── 历史记录条目 ─────────────────────────────────────────────────────────────
interface HistoryEntry {
  node: ScriptNode;
  /** 命中的选项文案，如"女"，显示在 nodeContent 末尾 */
  optionText: string;
  /** 判定结果文案，如"大佬水平"，所有历史节点均显示 */
  resultText: string;
  /** 完整 roll 标签，格式如 "d100 = 67 ： 大佬水平"，仅最新节点显示 */
  rollLabel: string;
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/** 判定范围文本 */
function getRangeText(match: number | [number, number]): string {
  if (typeof match === 'number') return String(match);
  return `${match[0]}-${match[1]}`;
}

/** 从 content 中提取表格标题 */
function extractTableTitle(content: string): string {
  if (!content) return '判定';
  const lines = content
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('ROLL'));
  // 从后往前找以冒号结尾的行作为标题（兼容 ES2022，不使用 findLast）
  let titleLine: string | undefined;
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (t.endsWith('：') || t.endsWith(':')) {
      titleLine = lines[i];
      break;
    }
  }
  return titleLine ? titleLine.replace(/[：:]$/, '').trim() : '判定';
}

/**
 * 计算有效 outcomes 的实际骰子上限
 * null 分支不计入范围，实际骰子上限 = 有效 outcomes 中 match 的最大值
 */
function getEffectiveDiceMax(outcomes: Outcome[]): number {
  const validOutcomes = outcomes.filter((o) => !!o.nextNode);
  if (validOutcomes.length === 0) return 1;
  let max = 0;
  for (const o of validOutcomes) {
    const val = typeof o.match === 'number' ? o.match : o.match[1];
    if (val > max) max = val;
  }
  return max;
}

/** 根据有效 outcomes 的实际范围投骰子（排除 null 分支） */
function rollDice(outcomes: Outcome[]): number {
  const max = getEffectiveDiceMax(outcomes);
  const min = 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 根据骰子点数匹配 outcome */
function matchOutcome(result: number, outcomes: Outcome[]): Outcome | null {
  return (
    outcomes.find((o) => {
      if (typeof o.match === 'number') return o.match === result;
      return result >= o.match[0] && result <= o.match[1];
    }) ?? null
  );
}

// ─── 历史节点展示 ─────────────────────────────────────────────────────────────
const HistoryItem: React.FC<{ entry: HistoryEntry; isLatest: boolean }> = ({ entry, isLatest }) => (
  <div className={styles.historyItem}>
    <div className={styles.nodeContent}>
      {entry.node.content}
      {entry.optionText && <span className={styles.optionText}>{entry.optionText}</span>}
    </div>
    {isLatest
      ? <div className={styles.rollLabel}>{entry.rollLabel}</div>
      : <div className={styles.resultText}>{entry.resultText}</div>
    }
  </div>
);

// ─── 当前节点展示 ─────────────────────────────────────────────────────────────
interface CurrentNodeProps {
  node: ScriptNode;
  onDiceRoll: (outcome: Outcome, diceResult: number) => void;
  onOptionClick: (outcome: Outcome) => void;
}

const CurrentNode: React.FC<CurrentNodeProps> = ({
  node,
  onDiceRoll,
  onOptionClick,
}) => {
  const choice = node.choices[0];

  const handleDiceRoll = useCallback(() => {
    if (!choice) return;
    // 只在有效 outcomes 的实际 match 范围内投骰，null 分支不参与
    const validOutcomes = choice.outcomes.filter((o) => !!o.nextNode);
    const result = rollDice(validOutcomes);
    const matched = matchOutcome(result, validOutcomes) ?? validOutcomes[0];
    onDiceRoll(matched, result);
  }, [choice, onDiceRoll]);

  return (
    <div className={styles.currentNode}>
      <div className={styles.nodeContent}>{node.content}</div>

      {node.type === 'dice' && choice && (
        <>
          {/* 判定表 */}
          <div className={styles.diceTable}>
            <div className={styles.diceTableTitle}>{extractTableTitle(node.content)}</div>
            {choice.outcomes.map((outcome, idx) => {
              const valid = !!outcome.nextNode;
              return (
                <div
                  key={idx}
                  className={`${styles.diceRow} ${!valid ? styles.diceRowDisabled : ''}`}
                  onClick={valid ? () => onOptionClick(outcome) : undefined}
                  title={!valid ? '此分支剧情尚未开放' : undefined}
                >
                  <span className={styles.diceRange}>{getRangeText(outcome.match)}</span>
                  <span className={styles.diceOption}>{outcome.optionText}</span>
                  {valid && (
                    <span className={styles.diceClickHint}>（点击选中）</span>
                  )}
                  {!valid && (
                    <span className={styles.diceUnavailable}>🚫 未开放</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 投掷按钮 */}
          <div className={styles.rollWrap}>
            <button className={styles.rollBtn} onClick={handleDiceRoll}>
              随机投掷 d{getEffectiveDiceMax(choice.outcomes)}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Game Page ────────────────────────────────────────────────────────────────
const GamePage: React.FC<GamePageProps> = ({ scriptId, scriptMeta, onBack }) => {
  const { currentNode, isLoading, error, loadNode, prefetchNextNodes } = useScriptNode(scriptId);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 进入游戏：加载入口节点
  useEffect(() => {
    if (scriptMeta.entryNodeId) {
      loadNode(scriptMeta.entryNodeId);
    }
  }, [scriptMeta.entryNodeId, loadNode]);

  // 节点加载完成后，预请求所有 nextNode（深度为 1）
  useEffect(() => {
    if (currentNode) {
      prefetchNextNodes(currentNode);
    }
  }, [currentNode, prefetchNextNodes]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, currentNode]);

  /** 投骰/选择后立即跳转，无需二次确认 */
  const advance = useCallback((outcome: Outcome, rollLabel: string) => {
    if (!currentNode) return;

    // 当前节点连同 roll 结果一起存入历史
    setHistory((prev) => [...prev, { node: currentNode, optionText: outcome.optionText, resultText: outcome.resultText, rollLabel }]);

    const next = outcome.nextNode;
    if (!next) {
      setIsFinished(true);
      return;
    }

    loadNode(next);
  }, [currentNode, loadNode]);

  // 投骰子后立即跳转
  const handleDiceRoll = useCallback((outcome: Outcome, diceResult: number) => {
    const choice = currentNode?.choices[0];
    const dMax = choice ? getEffectiveDiceMax(choice.outcomes) : '?';
    const label = `d${dMax} = ${diceResult} ： ${outcome.resultText}`;
    advance(outcome, label);
  }, [currentNode, advance]);

  // 手动点击选项后立即跳转
  const handleOptionClick = useCallback((outcome: Outcome) => {
    const label = `${getRangeText(outcome.match)} ： ${outcome.resultText}`;
    advance(outcome, label);
  }, [advance]);

  // ── 渲染 ──
  if (isLoading) {
    return (
      <div className={styles.page}>
        <GameHeader scriptTitle={scriptMeta.title} onBack={onBack} />
        <div className={styles.statusWrap}>
          <div className={styles.loadingSpinner} />
          <span>加载中…</span>
        </div>
      </div>
    );
  }

  if (error || (!isLoading && !currentNode)) {
    return (
      <div className={styles.page}>
        <GameHeader scriptTitle={scriptMeta.title} onBack={onBack} />
        <div className={styles.statusWrap}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{error ?? '暂无剧本内容'}</span>
          <button className={styles.backBtnInner} onClick={onBack}>返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <GameHeader scriptTitle={scriptMeta.title} onBack={onBack} />

      <div ref={scrollRef} className={styles.scroll}>
        <div className={styles.content}>
          {/* 历史记录：最新条目显示 rollLabel，其余只显示 resultText */}
          {history.map((entry, idx) => (
            <HistoryItem key={idx} entry={entry} isLatest={idx === history.length - 1} />
          ))}

          {/* 当前节点 / 结束 */}
          {isFinished ? (
            <div className={styles.finishWrap}>
              <div className={styles.finishIcon}>🎉</div>
              <div className={styles.finishText}>剧情演示结束</div>
              <button className={styles.backBtnInner} onClick={onBack}>返回首页</button>
            </div>
          ) : (
            currentNode && (
              <CurrentNode
                node={currentNode}
                onDiceRoll={handleDiceRoll}
                onOptionClick={handleOptionClick}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePage;
