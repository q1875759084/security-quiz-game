import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { authService } from './services/authService';
import type { UserInfo } from './services/authService';
import type { ScriptMeta } from './types/script';
import LoginModal from './components/LoginModal';
import HomePage from './pages/Home';
import GamePage from './pages/Game';
import { useEnv } from './hooks/useEnv';

// ─── 全局样式 ───────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root {
      height: 100%;
      background: #121212;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.8;
      font-size: 18px;
    }
  `}</style>
);

// ─── Auth Context ────────────────────────────────────────────────────────────
export interface AuthContextValue {
  isLoggedIn: boolean;
  user: UserInfo | null;
  isAuthLoading: boolean;
  /** 是否作为微前端子应用运行（主应用会提供自己的导航，子应用隐藏独立 Header） */
  isMicroApp: boolean;
  /** 是否为移动端设备 */
  isMobile: boolean;
  openLoginModal: () => void;
  handleLoginSuccess: (userInfo: UserInfo) => void;
  handleLogout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  user: null,
  isAuthLoading: true,
  isMicroApp: false,
  isMobile: false,
  openLoginModal: () => {},
  handleLoginSuccess: () => {},
  handleLogout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── Router（轻量 hash 路由，无需安装依赖） ────────────────────────────────
type Route = '/' | `/game/${string}`;

function useHashRouter(): [Route, (path: Route) => void] {
  const getPath = (): Route => {
    const hash = window.location.hash.slice(1) || '/';
    return hash as Route;
  };
  const [path, setPath] = useState<Route>(getPath);

  useEffect(() => {
    const onHashChange = () => setPath(getPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((to: Route) => {
    window.location.hash = to;
  }, []);

  return [path, navigate];
}

// ─── App ─────────────────────────────────────────────────────────────────────
function App() {
  const { isMicroApp, isMobile } = useEnv();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [path, navigate] = useHashRouter();
  // 点击剧本时暂存 meta，进入 GamePage 后直接使用，避免 GamePage 重复请求列表
  const [currentScriptMeta, setCurrentScriptMeta] = useState<ScriptMeta | null>(null);

  // 初始化：校验本地 Token
  useEffect(() => {
    const initAuth = async () => {
      try {
        const userInfo = await authService.validateToken();
        setIsLoggedIn(true);
        setUser(userInfo);
      } catch {
        // Token 不存在或已过期，静默处理
      } finally {
        setIsAuthLoading(false);
      }
    };
    initAuth();
  }, []);

  const openLoginModal = useCallback(() => setShowLoginModal(true), []);
  const handleCloseModal = useCallback(() => setShowLoginModal(false), []);

  const handleLoginSuccess = useCallback((userInfo: UserInfo) => {
    setIsLoggedIn(true);
    setUser(userInfo);
  }, []);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    setIsLoggedIn(false);
    setUser(null);
  }, []);

  // 解析当前路由
  const isGamePage = path.startsWith('/game/');
  const scriptId = isGamePage ? path.replace('/game/', '') : null;

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, isAuthLoading, isMicroApp, isMobile, openLoginModal, handleLoginSuccess, handleLogout }}>
      <GlobalStyle />
      {isGamePage && scriptId && currentScriptMeta ? (
        <GamePage
          scriptId={scriptId}
          scriptMeta={currentScriptMeta}
          onBack={() => navigate('/')}
        />
      ) : (
        <HomePage
          onEnterGame={(id, meta) => {
            setCurrentScriptMeta(meta);
            navigate(`/game/${id}`);
          }}
        />
      )}
      <LoginModal
        visible={showLoginModal}
        onClose={handleCloseModal}
        onSuccess={handleLoginSuccess}
      />
    </AuthContext.Provider>
  );
}

export default App;
