/**
 * Token存储工具：区分AccessToken/RefreshToken，统一操作入口
 * 安全设计：
 * 1. AccessToken：内存+LocalStorage双存储（方便页面刷新恢复）
 * 2. RefreshToken：仅存HttpOnly Cookie（后端设置，前端无法直接访问，防XSS）
 */

/**
 * Token类型定义
 */
export interface TokenModel {
  accessToken: string;
  refreshToken?: string; // 前端不存储，仅供接口返回使用
}

// Token键名（避免硬编码，方便统一修改）
const TOKEN_KEYS = {
  ACCESS: 'APP_ACCESS_TOKEN',
} as const;

// 内存存储AccessToken（页面不刷新则永久存在，避免频繁读LocalStorage）
let memoryAccessToken: string | null = null;

/**
 * 设置AccessToken（登录成功/刷新成功时调用）
 * @param accessToken - 访问令牌
 */
export const setAccessToken = (accessToken: string): void => {
  // 内存存储AccessToken（优先使用）
  memoryAccessToken = accessToken;
  // LocalStorage存储（页面刷新后恢复）
  localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
};

/**
 * 获取AccessToken（优先从内存取，无则从LocalStorage恢复）
 */
export const getAccessToken = (): string | null => {
  if (memoryAccessToken) return memoryAccessToken;
  const localToken = localStorage.getItem(TOKEN_KEYS.ACCESS);
  // 恢复到内存，避免下次重复读取LocalStorage
  if (localToken) memoryAccessToken = localToken;
  return localToken;
};

/**
 * 清除AccessToken（退出登录/刷新失败时调用）
 */
export const clearToken = (): void => {
  // 清空内存+LocalStorage
  memoryAccessToken = null;
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  // RefreshToken由后端通过Set-Cookie清除，前端无法操作HttpOnly Cookie
};

/**
 * 判断是否存在有效AccessToken（用于路由守卫/页面鉴权）
 */
export const hasValidToken = (): boolean => {
  return !!getAccessToken();
};