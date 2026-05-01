/**
 * 页面跳转工具：统一登录页/首页跳转逻辑
 */

// 白名单：无需跳转登录的页面（如登录页、注册页）
const WHITE_LIST = ['/login', '/register', '/forgot-pwd'];

/**
 * 跳转登录页（清除Token后，避免重复跳转）
 */
export const redirectToLogin = (): void => {
  const currentPath = window.location.pathname;
  // 白名单内页面，不重复跳转
  if (WHITE_LIST.includes(currentPath)) return;
  // 携带当前页面路径，登录成功后回跳
  const redirectUrl = encodeURIComponent(window.location.href);
  window.location.href = `/login?redirect=${redirectUrl}`;
};

/**
 * 跳转首页（登录成功/刷新成功后）
 */
export const redirectToHome = (): void => {
  // 检查是否有回跳地址
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');
  if (redirect) {
    try {
      const decodedUrl = decodeURIComponent(redirect);
      // 安全检查：确保跳转地址是本站地址
      const url = new URL(decodedUrl, window.location.origin);
      if (url.origin === window.location.origin) {
        window.location.href = decodedUrl;
        return;
      }
    } catch {
      // 解码失败或URL无效，跳转到首页
    }
  }
  window.location.href = '/';
};