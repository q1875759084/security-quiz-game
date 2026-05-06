import { login, register, getProfile } from '../api/user';
// UserInfo / LoginResponse / RegisterResponse 统一从 api 层导出，避免重复定义
import type { LoginParams, RegisterParams, UserInfo, LoginResponse, RegisterResponse } from '../api/user';
import { setAccessToken, getAccessToken, clearToken } from '../utils/token';
import request from '../utils/request';

// 重新导出供上层使用，外部代码可从 authService 直接引用类型，无需感知 api 层
export type { UserInfo, LoginResponse, RegisterResponse };

export const authService = {
  async login(params: LoginParams): Promise<LoginResponse> {
    const response = await login(params);
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  async register(params: RegisterParams): Promise<RegisterResponse> {
    const response = await register(params);
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  async validateToken(): Promise<UserInfo> {
    if (!getAccessToken()) {
      throw new Error('未登录');
    }

    const response = await getProfile();
    return response.data.userInfo;
  },

  // refreshToken 由 request.ts 响应拦截器内部的 refreshTokenRequest 统一处理，
  // authService 不重复实现，避免两套刷新逻辑并存造成混淆

  async logout(): Promise<void> {
    try {
      // 通知后端清除 HttpOnly Cookie 中的 RefreshToken
      await request.post('/user/logout');
    } catch {
      // 后端退出失败不阻塞本地清理（网络异常时也要能退出）
    } finally {
      clearToken();
    }
  },
};