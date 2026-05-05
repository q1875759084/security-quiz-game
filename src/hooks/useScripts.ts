import { useState, useEffect, useRef, useCallback } from 'react';
import type { ScriptMeta, ScriptNode } from '../types/script';
import { getScripts, getNode } from '../api/scripts';

// ─── 剧本列表 Hook ────────────────────────────────────────────────────────────
// keyword 传给后端，由后端 SQL LIKE 过滤，前端不做二次过滤。
// 防抖 300ms：减少请求频率。
// AbortController：取消上一次未完成的请求，防止竞态（弱网下旧请求后返回覆盖新结果）。
export function useScriptList(searchKeyword: string) {
  const [scripts, setScripts] = useState<ScriptMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 用 ref 存放防抖 timer 和当前请求的 AbortController
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // 1. 清除上一次未触发的防抖
    if (timerRef.current) clearTimeout(timerRef.current);

    // 2. 取消上一次已发出但未完成的请求，防止竞态
    if (abortRef.current) abortRef.current.abort();

    setIsLoading(true);
    setError(null);

    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      const keyword = searchKeyword.trim() || undefined;

      getScripts({ keyword }, controller.signal)
        .then((res) => {
          setScripts(res.data ?? []);
        })
        .catch((err: unknown) => {
          // AbortError 是主动取消，不是真正的错误，忽略即可
          if (err instanceof Error && err.name === 'AbortError') return;
          setError('剧本列表加载失败，请稍后重试');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 300);

    return () => {
      // 组件卸载时同时清除防抖和取消进行中的请求
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [searchKeyword]);

  return { scripts, isLoading, error };
}

// ─── 单节点 Hook ──────────────────────────────────────────────────────────────
// 按需加载单个节点，同时提供预请求能力（prefetch）
// 架构设计：单节点按需拉取 + 深度为 1 的子节点预取
export function useScriptNode(scriptId: string) {
  // 节点缓存：nodeId → ScriptNode，避免重复请求
  const cacheRef = useRef<Map<string, ScriptNode>>(new Map());

  const [currentNode, setCurrentNode] = useState<ScriptNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 加载指定节点，优先读缓存 */
  const loadNode = useCallback(async (nodeId: string) => {
    const cached = cacheRef.current.get(nodeId);
    if (cached) {
      setCurrentNode(cached);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await getNode(scriptId, nodeId);
      const node = res.data;
      cacheRef.current.set(nodeId, node);
      setCurrentNode(node);
    } catch {
      setError('节点加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [scriptId]);

  /**
   * 预请求当前节点所有 nextNode（深度为 1）
   * 已在缓存中的节点跳过，静默失败不影响主流程
   */
  const prefetchNextNodes = useCallback((node: ScriptNode) => {
    const nextNodeIds = node.choices
      .flatMap((c) => c.outcomes)
      .map((o) => o.nextNode)
      .filter((id): id is string => !!id && !cacheRef.current.has(id));

    // 去重
    const uniqueIds = [...new Set(nextNodeIds)];

    for (const nodeId of uniqueIds) {
      getNode(scriptId, nodeId)
        .then((res) => cacheRef.current.set(nodeId, res.data))
        .catch(() => { /* 预请求失败静默处理，不影响主流程 */ });
    }
  }, [scriptId]);

  return { currentNode, isLoading, error, loadNode, prefetchNextNodes };
}
