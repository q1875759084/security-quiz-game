import request from '../../utils/request';
import type { ScriptMeta, ScriptNode } from '../../types/script';

export interface GetScriptsParams {
  /** 搜索关键词，后端匹配标题，为空时返回全量 */
  keyword?: string;
}

export interface GetScriptsResponse {
  data: ScriptMeta[];
}

/**
 * 获取剧本列表
 * GET /api/scripts?keyword=xxx
 * 无需鉴权，仅返回 status=1（上架）的剧本。
 * keyword 不传或为空时返回全量，后端按标题 SQL LIKE 过滤。
 */
export const getScripts = async (params?: GetScriptsParams): Promise<GetScriptsResponse> => {
  const response = await request.get('/scripts', { params });
  return response;
};

/**
 * 获取单个剧本节点
 * GET /api/scripts/:scriptId/nodes/:nodeId
 */
export const getNode = async (scriptId: string, nodeId: string): Promise<{ data: ScriptNode }> => {
  const response = await request.get(`/scripts/${scriptId}/nodes/${nodeId}`);
  return response;
};
