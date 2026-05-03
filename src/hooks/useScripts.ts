import { useState, useEffect, useMemo } from 'react';
import type { ScriptMeta, ScriptNode } from '../types/script';

// ─── Mock 剧本元数据列表 ──────────────────────────────────────────────────────
// TODO: 替换为后端接口 GET /api/scripts
const MOCK_SCRIPTS: ScriptMeta[] = [
  {
    id: 'capture1',
    title: '我们仍未知道那天在边狱所看到的固定队的名字',
    description: '一切从一支固定队开始。骰子将决定你们的故事走向……',
    coverColor: '#1a3a5c',
    tags: ['零式', '固定队', '剧情'],
    chapterCount: 1,
  },
  {
    id: 'capture2',
    title: '安科：暗潮',
    description: '固定队内部矛盾渐起，信任正在悄然瓦解。',
    coverColor: '#3a1a2c',
    tags: ['团队', '冲突'],
    chapterCount: 2,
  },
  {
    id: 'capture3',
    title: '安科：终局',
    description: '最终决战前夕，每一个选择都将改变结局。',
    coverColor: '#1a2e1a',
    tags: ['终局', '多结局'],
    chapterCount: 3,
  },
];

// ─── 剧本列表 Hook ────────────────────────────────────────────────────────────
export function useScriptList(searchKeyword: string) {
  const [scripts] = useState<ScriptMeta[]>(MOCK_SCRIPTS);
  const [isLoading] = useState(false);

  // 搜索过滤：匹配标题或标签（不区分大小写）
  const filtered = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return scripts;
    return scripts.filter(
      (s) =>
        s.title.toLowerCase().includes(kw) ||
        s.description.toLowerCase().includes(kw) ||
        s.tags.some((t) => t.toLowerCase().includes(kw)),
    );
  }, [scripts, searchKeyword]);

  return { scripts: filtered, isLoading };
}

// ─── 剧本节点 Hook ────────────────────────────────────────────────────────────
// TODO: 替换为后端接口 GET /api/scripts/:id/nodes
export function useScriptNodes(scriptId: string) {
  const [nodes, setNodes] = useState<ScriptNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scriptId) return;
    setIsLoading(true);
    setError(null);

    // 目前只有 capture1 有真实数据，其余返回空节点
    import('../assets/chapter1.json')
      .then((mod) => {
        if (scriptId === 'capture1') {
          setNodes(mod.default as ScriptNode[]);
        } else {
          setNodes([]);
        }
      })
      .catch(() => setError('剧本数据加载失败'))
      .finally(() => setIsLoading(false));
  }, [scriptId]);

  return { nodes, isLoading, error };
}
