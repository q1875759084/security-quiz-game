import request from '../../utils/request';

export interface LoginParams {
  username: string;
  password: string;
}

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

export const login = async (data: LoginParams): Promise<{ data: LoginResponse }> => {
  const response = await request.post('/user/login', {
    account: data.username, // 转换参数名匹配后端
    password: data.password,
  });
  
  return response;
};

export interface RegisterParams {
  username: string;
  password: string;
  phone?: string;
  email?: string;
}

export interface RegisterResponse {
  accessToken: string;
  userInfo: UserInfo;
}

export const register = async (data: RegisterParams): Promise<{ data: RegisterResponse }> => {
  const response = await request.post('/user/register', data);
  
  return response;
};

/**
 * 获取当前用户信息（验证 Token 有效性）
 * @returns Promise<{ userInfo: UserInfo }>
 */
export const getProfile = async (): Promise<{ data: { userInfo: UserInfo } }> => {
  const response = await request.get('/user/profile');
  return response;
};