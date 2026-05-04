/**
 * useEnv — 运行环境感知 Hook
 *
 * 提供两个互相独立的维度：
 *   1. isMicroApp  — 是否作为微前端子应用运行（由框架注入的全局标记判断）
 *   2. isMobile    — 是否为移动设备（由 User-Agent 判断）
 *
 * 两个维度正交，可自由组合，见 docs/decisions.md 中的决策说明。
 */

// 扩展 window 类型，避免 TS 报错
declare global {
  interface Window {
    /** qiankun 注入：子应用在微前端中运行时为 true */
    __POWERED_BY_QIANKUN__?: boolean;
    /** micro-app 注入：子应用在微前端中运行时为 true */
    __MICRO_APP_ENVIRONMENT__?: boolean;
  }
}

export interface EnvInfo {
  /** 是否作为微前端子应用运行 */
  isMicroApp: boolean;
  /** 是否为移动设备（手机/平板） */
  isMobile: boolean;
  /** 是否为 PC 端（isMobile 取反，语义糖） */
  isPC: boolean;
}

/**
 * 判断当前是否运行在微前端容器中。
 * 优先检测框架注入的全局标记，比 URL 参数可靠（不依赖调用方手动传参）。
 */
function detectMicroApp(): boolean {
  return !!(window.__POWERED_BY_QIANKUN__ || window.__MICRO_APP_ENVIRONMENT__);
}

/**
 * 判断当前设备是否为移动端。
 * 使用 User-Agent 匹配，SSR 场景下 navigator 不存在时降级为 false（PC）。
 */
function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

// 环境信息在运行期间不会变化，模块级缓存，避免每次 hook 调用重复计算
const envInfo: EnvInfo = {
  isMicroApp: detectMicroApp(),
  isMobile: detectMobile(),
  isPC: !detectMobile(),
};

/**
 * @example
 * const { isMicroApp, isMobile } = useEnv();
 *
 * // 微前端中隐藏独立应用的顶部导航（主应用有自己的导航）
 * if (isMicroApp) { ... }
 *
 * // 手机端显示底部 Tab，PC 端显示侧边栏
 * if (isMobile) { ... }
 */
export function useEnv(): EnvInfo {
  return envInfo;
}
