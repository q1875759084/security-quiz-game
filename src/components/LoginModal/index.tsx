import React, { useState } from "react";
import styles from "./index.module.scss";

/**
 * 登录弹窗属性类型定义
 */
export interface LoginModalProps {
  /** 是否显示弹窗 */
  visible: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 登录成功回调 */
  onLogin: (account: string, password: string) => void;
  /** 注册成功回调 */
  onRegister?: (data: RegisterData) => void;
}

/**
 * 注册数据类型
 */
export interface RegisterData {
  username: string;
  phone?: string;
  email?: string;
  password: string;
}

/**
 * 登录弹窗组件
 */
const LoginModal: React.FC<LoginModalProps> = ({
  visible,
  onClose,
  onLogin,
  onRegister,
}) => {
  // 当前模式：login | register
  const [mode, setMode] = useState<"login" | "register">("login");

  // 登录表单
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  // 注册表单
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 关闭弹窗时重置表单
  React.useEffect(() => {
    if (!visible) {
      setMode("login");
      setAccount("");
      setPassword("");
      setUsername("");
      setPhone("");
      setEmail("");
      setConfirmPassword("");
      setErrors({});
    }
  }, [visible]);

  // 登录表单验证
  const validateLogin = () => {
    const newErrors: Record<string, string> = {};

    if (!account.trim()) {
      newErrors.account = "请输入账号";
    }

    if (!password) {
      newErrors.password = "请输入密码";
    } else if (password.length < 6) {
      newErrors.password = "密码长度不能少于6位";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 注册表单验证
  const validateRegister = () => {
    const newErrors: Record<string, string> = {};

    // 用户名必填
    if (!username.trim()) {
      newErrors.username = "请输入用户名";
    } else if (username.length < 6) {
      newErrors.username = "用户名长度不能少于6位";
    }

    // 手机号格式验证（选填）
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      newErrors.phone = "手机号格式错误";
    }

    // 邮箱格式验证（选填）
    if (email && !/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(email)) {
      newErrors.email = "邮箱格式错误";
    }

    // 密码验证
    if (!password) {
      newErrors.password = "请输入密码";
    } else if (password.length < 6) {
      newErrors.password = "密码长度不能少于6位";
    }

    // 确认密码
    if (!confirmPassword) {
      newErrors.confirmPassword = "请确认密码";
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "两次输入的密码不一致";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      if (!validateLogin()) return;
      onLogin(account.trim(), password);
    } else {
      if (!validateRegister()) return;
      onRegister?.({
        username: username.trim(),
        phone: phone || undefined,
        email: email || undefined,
        password,
      });
    }
  };

  // 点击遮罩关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 切换到注册模式
  const switchToRegister = () => {
    setMode("register");
    setErrors({});
  };

  // 切换到登录模式
  const switchToLogin = () => {
    setMode("login");
    setErrors({});
  };

  if (!visible) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        {/* 关闭按钮 */}
        <button className={styles.closeBtn} onClick={onClose}>
          ×
        </button>

        {/* 标题 */}
        <div className={styles.title}>
          {mode === "login" ? "账号登录" : "欢迎注册"}
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* 登录模式 */}
          {mode === "login" && (
            <>
              {" "}
              {/* 账号输入 */}
              <div className={styles.formGroup}>
                <input
                  type="text"
                  className={`${styles.input} ${errors.account ? styles.error : ""}`}
                  placeholder="手机号/用户名/邮箱"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                />
                {errors.account && (
                  <span className={styles.errorText}>{errors.account}</span>
                )}
              </div>
              {/* 密码输入 */}
              <div className={styles.formGroup}>
                <input
                  type="password"
                  className={`${styles.input} ${errors.password ? styles.error : ""}`}
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {errors.password && (
                  <span className={styles.errorText}>{errors.password}</span>
                )}
              </div>
            </>
          )}

          {/* 注册模式 */}
          {mode === "register" && (
            <>
              {" "}
              {/* 用户名输入 */}
              <div className={styles.formGroup}>
                <input
                  type="text"
                  className={`${styles.input} ${errors.username ? styles.error : ""}`}
                  placeholder="请设置用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {errors.username && (
                  <span className={styles.errorText}>{errors.username}</span>
                )}
              </div>
              {/* 手机号输入 */}
              <div className={styles.formGroup}>
                <input
                  type="tel"
                  className={`${styles.input} ${errors.phone ? styles.error : ""}`}
                  placeholder="可用于登录和找回密码"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {errors.phone && (
                  <span className={styles.errorText}>{errors.phone}</span>
                )}
              </div>
              {/* 邮箱输入 */}
              <div className={styles.formGroup}>
                <input
                  type="email"
                  className={`${styles.input} ${errors.email ? styles.error : ""}`}
                  placeholder="邮箱地址（选填）"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && (
                  <span className={styles.errorText}>{errors.email}</span>
                )}
              </div>
              {/* 密码输入 */}
              <div className={styles.formGroup}>
                <input
                  type="password"
                  className={`${styles.input} ${errors.password ? styles.error : ""}`}
                  placeholder="设置密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {errors.password && (
                  <span className={styles.errorText}>{errors.password}</span>
                )}
              </div>
              {/* 确认密码输入 */}
              <div className={styles.formGroup}>
                <input
                  type="password"
                  className={`${styles.input} ${errors.confirmPassword ? styles.error : ""}`}
                  placeholder="确认密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {errors.confirmPassword && (
                  <span className={styles.errorText}>
                    {errors.confirmPassword}
                  </span>
                )}
              </div>
            </>
          )}

          {/* 提交按钮 */}
          <button type="submit" className={styles.loginBtn}>
            {mode === "login" ? "登录" : "注册"}
          </button>

          {/* 切换链接 */}
          <div className={styles.switchLink}>
            {mode === "login" ? (
              <>
                还没有账号?{" "}
                <a
                  href="#"
                  className={styles.link}
                  onClick={(e) => {
                    e.preventDefault();
                    switchToRegister();
                  }}
                >
                  立即注册
                </a>
              </>
            ) : (
              <>
                已有账号?{" "}
                <a
                  href="#"
                  className={styles.link}
                  onClick={(e) => {
                    e.preventDefault();
                    switchToLogin();
                  }}
                >
                  登录
                </a>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
