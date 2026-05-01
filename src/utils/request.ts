import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getAccessToken, setAccessToken, clearToken, hasValidToken } from './token';
import { redirectToLogin } from './redirect';

/**
 * 全局Axios实例配置
 */
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', // 接口基础地址
  timeout: 10000, // 超时时间10秒
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  },
  withCredentials: true, // 关键：允许携带Cookie（包括HttpOnly Cookie）
});

/**
 * 刷新Token相关全局状态（控制并发）
 * 1. isRefreshing：是否正在刷新Token，防止多请求同时触发
 * 2. failedRequests：存储Token过期时的待执行请求，刷新成功后统一重试
 */
let isRefreshing = false;
let failedRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}> = [];

/**
 * 刷新Token请求（单独封装，避免走拦截器造成循环请求）
 * RefreshToken通过HttpOnly Cookie自动携带，无需手动传递
 * @returns Promise<{ accessToken: string }> - 新的AccessToken
 */
const refreshTokenRequest = async (): Promise<{ accessToken: string }> => {
  try {
    // 直接用axios原生实例，不使用封装后的service，避免触发拦截器
    const res = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || '/api'}/api/user/refresh`, // 后端刷新Token接口
      {}, // RefreshToken通过Cookie自动携带
      { 
        timeout: 5000,
        withCredentials: true, // 携带Cookie
      }
    );
    if (res.data.code !== 200) {
      throw new Error(res.data.msg || '刷新Token失败');
    }
    return res.data.data; // 后端返回格式：{ code:200, msg:'', data:{ accessToken } }
  } catch (error) {
    throw new Error((error as AxiosError).message || '刷新Token接口请求失败');
  }
};

/**
 * 请求拦截器：添加AccessToken到请求头
 * 所有接口请求前执行，自动携带Token，业务代码无需关心
 */
service.interceptors.request.use(
  (config: AxiosRequestConfig): AxiosRequestConfig => {
    // 存在有效Token时，添加Authorization请求头（Bearer规范）
    if (hasValidToken() && config.headers) {
      config.headers.Authorization = `Bearer ${getAccessToken()}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    // 请求发送前的错误（如参数错误、取消请求）
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器：处理接口响应/异常
 * 核心：捕获401（Token过期），实现无感刷新；统一处理所有服务端异常
 */
service.interceptors.response.use(
  (response: AxiosResponse): any => {
    const data = response.data;
    
    // 如果 code 不是 200，抛出错误
    if (data.code !== 200) {
      throw new Error(data.message || '请求失败');
    }
    
    return data; // 返回整个响应对象，包含 code, message, data
  },
  async (error: AxiosError): Promise<never> => {
    // 1. 网络错误/请求超时：直接抛错
    if (!error.response) {
      console.error(error.message || '网络异常，请检查网络连接');
      return Promise.reject(error);
    }

    const { response, config } = error;
    // 2. 401状态码：Token过期/无效，处理刷新逻辑（config为当前请求配置，必传）
    if (response.status === 401 && config) {
      // 保存当前请求配置，用于刷新后重试（添加cancelToken避免重复请求）
      const originalRequest = { ...config, _retry: true };

      try {
        // 无有效AccessToken：直接跳转登录
          if (!hasValidToken()) {
            clearToken();
            redirectToLogin();
            return Promise.reject(new Error('登录状态过期，请重新登录'));
          }

          // 未在刷新：触发刷新请求，加锁防止并发
          if (!isRefreshing) {
            isRefreshing = true;
            // 调用刷新Token接口（RefreshToken通过Cookie自动携带）
            const newToken = await refreshTokenRequest();
            // 保存新AccessToken到内存+LocalStorage
            setAccessToken(newToken.accessToken);
            console.log('登录状态已刷新');

          // 刷新成功：重试所有挂起的请求
          failedRequests.forEach(({ resolve }) => {
            resolve(newToken.accessToken);
          });
          failedRequests = []; // 清空失败请求队列
          isRefreshing = false; // 释放刷新锁

          // 重试当前过期的请求（更新请求头的Token）
          originalRequest.headers!.Authorization = `Bearer ${newToken.accessToken}`;
          return service(originalRequest);
        } else {
          // 正在刷新：将当前请求加入失败队列，等待刷新完成后重试
          return new Promise((resolve, reject) => {
            failedRequests.push({
              resolve: (newToken) => {
                // 刷新成功，更新请求头Token并重试
                originalRequest.headers!.Authorization = `Bearer ${newToken}`;
                resolve(service(originalRequest));
              },
              reject: (err) => reject(err)
            });
          });
        }
      } catch (refreshError) {
        // 3. 刷新Token失败：清除所有Token，跳转登录，清空队列+释放锁
        clearToken();
        redirectToLogin();
        failedRequests.forEach(({ reject }) => {
          reject(refreshError as AxiosError);
        });
        failedRequests = [];
        isRefreshing = false;
        console.error((refreshError as Error).message || '登录状态过期，请重新登录');
        return Promise.reject(refreshError);
      }
    }

    // 4. 其他状态码异常（403/404/500等）：统一处理
    const errMsg = response.data?.msg || `请求失败[${response.status}]`;
    console.error(errMsg);
    return Promise.reject(error);
  }
);

// 导出封装后的Axios实例，业务层直接使用
export default service;