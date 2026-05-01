import { login, register, getProfile, LoginParams, RegisterParams } from '../api/user';
import { setAccessToken, getAccessToken, clearToken } from '../utils/token';
import request from '../utils/request';

export interface UserInfo {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  phone?: string;
}

export interface LoginResponse {
  accessToken: string;
  userInfo: UserInfo;
}

export interface RegisterResponse {
  accessToken: string;
  userInfo: UserInfo;
}

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

  async refreshToken(): Promise<string> {
    const response = await request.post('/api/user/refresh');
    const newAccessToken = response.data.accessToken;
    setAccessToken(newAccessToken);
    return newAccessToken;
  },

  logout(): void {
    clearToken();
  },
};