// ─── 剧本节点数据结构 ──────────────────────────────────────────────────────────

/** 单条判定结果 */
export interface Outcome {
  /** 匹配的骰子点数（数字 = 精确匹配，数组 = 范围 [min, max]） */
  match: number | [number, number];
  /** 判定表里显示的选项文案 */
  optionText: string;
  /** 判定结果文案 */
  resultText: string;
  /**
   * 跳转的下一个节点 ID
   * null 表示剧情分支尚未填充，不可选中/跳转
   */
  nextNode: string | null;
}

/** 节点的一个选择项（包含骰子和结果集） */
export interface Choice {
  text: string;
  diceRequired: number | [number, number];
  outcomes: Outcome[];
}

/** 剧本节点类型 */
export type NodeType = 'dice' | 'choice' | 'text';

/** 剧本节点 */
export interface ScriptNode {
  id: string;
  title: string;
  content: string;
  type: NodeType;
  choices: Choice[];
}

// ─── 剧本元信息（列表页展示用） ────────────────────────────────────────────────
export interface ScriptMeta {
  id: string;
  title: string;
  description: string;
  /** 封面颜色（临时用色块代替图片） */
  coverColor: string;
  /** 标签，用于搜索过滤 */
  tags: string[];
  /** 章节数 */
  chapterCount: number;
}
