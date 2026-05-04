import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameHeader } from '../../components/Header';
import { useScriptNode } from '../../hooks/useScripts';
import type { ScriptNode, Outcome, ScriptMeta } from '../../types/script'; // ScriptMeta 供 GamePageProps 使用
import { getRecord, saveRecord } from '../../api/records';
import type { HistoryItem as RecordHistoryItem } from '../../api/records';
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

  // 用 ref 同步持有最新 history，供 saveRecord 调用时读取（避免闭包过时值问题）
  const historyRef = useRef<HistoryEntry[]>([]);

  // ─── 存档：将本地 HistoryEntry[] 转换为后端 RecordHistoryItem[] ────────────
  const toRecordHistory = useCallback((entries: HistoryEntry[]): RecordHistoryItem[] =>
    entries.map((e) => ({
      nodeId: e.node.id,
      content: e.node.content,
      resultText: e.resultText,
      rollLabel: e.rollLabel,
      timestamp: new Date().toISOString(),
    }))
  , []);

  // ─── 触发存档（fire-and-forget，不阻塞游戏流程） ──────────────────────────
  const triggerSave = useCallback((nodeId: string, status: 1 | 2 = 1) => {
    saveRecord({
      scriptId,
      currentNodeId: nodeId,
      history: toRecordHistory(historyRef.current),
      status,
    }).catch((err) => {
      // 存档失败静默处理，不影响游戏体验
      console.warn('[存档] 自动保存失败：', err);
    });
  }, [scriptId, toRecordHistory]);

  // 进入游戏：优先读取存档，有存档则恢复进度，否则从入口节点开始
  useEffect(() => {
    const initGame = async () => {
      try {
        const res = await getRecord(scriptId);
        if (res.data) {
          // 有存档：恢复历史记录，跳转到上次保存的节点
          const savedHistory: HistoryEntry[] = res.data.history.map((item) => ({
            node: { id: item.nodeId, content: item.content, title: '', type: 'dice', choices: [] },
            optionText: '',
            resultText: item.resultText,
            rollLabel: item.rollLabel,
          }));
          setHistory(savedHistory);
          historyRef.current = savedHistory;
          loadNode(res.data.currentNodeId);
        } else if (scriptMeta.entryNodeId) {
          // 无存档：从入口节点开始
          loadNode(scriptMeta.entryNodeId);
        }
      } catch {
        // 读档失败降级：从入口节点开始，不影响游戏
        if (scriptMeta.entryNodeId) {
          loadNode(scriptMeta.entryNodeId);
        }
      }
    };
    initGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId]);

  // 节点加载完成后，预请求所有 nextNode（深度为 1）
  useEffect(() => {
    if (currentNode) {
      prefetchNextNodes(currentNode);
    }
  }, [currentNode, prefetchNextNodes]);

  /** 投骰/选择后立即跳转，无需二次确认 */
  const advance = useCallback((outcome: Outcome, rollLabel: string) => {
    if (!currentNode) return;

    const newEntry = { node: currentNode, optionText: outcome.optionText, resultText: outcome.resultText, rollLabel };
    const newHistory = [...historyRef.current, newEntry];

    // 同步更新 ref（供 triggerSave 读取）和 state（供渲染）
    historyRef.current = newHistory;
    setHistory(newHistory);

    const next = outcome.nextNode;
    if (!next) {
      setIsFinished(true);
      // 剧情结束，存档状态改为已完成
      triggerSave(currentNode.id, 2);
      return;
    }

    // 每次选择后自动存档（进行中）
    triggerSave(next, 1);
    loadNode(next);
  }, [currentNode, loadNode, triggerSave]);

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

      <div className={styles.scroll}>
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
