import request from '../../utils/request';

// ─── 类型定义 ────────────────────────────────────────────────────────────────

/** 单条历史记录（前端组装，后端原样存储） */
export interface HistoryItem {
  /** 节点 ID */
  nodeId: string;
  /** 节点正文内容 */
  content: string;
  /** 选择结果文案 */
  resultText: string;
  /** 骰子结果展示文案，如 "d2 = 2 ： 队长是女生" */
  rollLabel: string;
  /** 记录时间戳 */
  timestamp: string;
}

/** 存档对象（GET 接口响应） */
export interface GameRecord {
  id: number;
  scriptId: string;
  currentNodeId: string;
  history: HistoryItem[];
  /** 1 进行中 / 2 已完成 */
  status: 1 | 2;
  updatedAt: string;
}

/** POST /api/records 请求体 */
export interface SaveRecordParams {
  scriptId: string;
  currentNodeId: string;
  history: HistoryItem[];
  /** 1 进行中 / 2 已完成，默认 1 */
  status?: 1 | 2;
}

// ─── 接口封装 ────────────────────────────────────────────────────────────────

/**
 * 获取存档
 * GET /api/records?scriptId=xxx
 * 需要鉴权（Bearer Token）
 * 无存档时 data 为 null，code 仍为 0
 */
export const getRecord = async (scriptId: string): Promise<{ data: GameRecord | null }> => {
  const response = await request.get('/records', { params: { scriptId } });
  return response;
};

/**
 * 创建或更新存档（upsert）
 * POST /api/records
 * 需要鉴权（Bearer Token）
 * 同一用户同一剧本只保留一条存档，重复调用为更新
 */
export const saveRecord = async (params: SaveRecordParams): Promise<{ data: { id: number } }> => {
  const response = await request.post('/records', params);
  return response;
};
