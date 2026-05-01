import React, { useState } from "react";
import styles from "./index.module.scss";
import { authService, UserInfo } from "../../services/authService";

export interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (userInfo: UserInfo) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const validateRegister = () => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = "请输入用户名";
    } else if (username.length < 6) {
      newErrors.username = "用户名长度不能少于6位";
    }

    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      newErrors.phone = "手机号格式错误";
    }

    if (email && !/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(email)) {
      newErrors.email = "邮箱格式错误";
    }

    if (!password) {
      newErrors.password = "请输入密码";
    } else if (password.length < 6) {
      newErrors.password = "密码长度不能少于6位";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "请确认密码";
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "两次输入的密码不一致";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      if (!validateLogin()) return;
      try {
        const data = await authService.login({ username: account.trim(), password });
        onSuccess(data.userInfo);
        onClose();
      } catch (error) {
        console.error('登录失败:', error);
        alert((error as Error).message || '登录失败');
      }
    } else {
      if (!validateRegister()) return;
      try {
        const data = await authService.register({
          username: username.trim(),
          phone: phone || undefined,
          email: email || undefined,
          password,
        });
        onSuccess(data.userInfo);
        onClose();
      } catch (error) {
        console.error('注册失败:', error);
        alert((error as Error).message || '注册失败');
      }
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const switchToRegister = () => {
    setMode("register");
    setErrors({});
  };

  const switchToLogin = () => {
    setMode("login");
    setErrors({});
  };

  if (!visible) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <button className={styles.closeBtn} onClick={onClose}>
          ×
        </button>

        <div className={styles.title}>
          {mode === "login" ? "账号登录" : "欢迎注册"}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === "login" && (
            <>
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

          {mode === "register" && (
            <>
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

          <button type="submit" className={styles.loginBtn}>
            {mode === "login" ? "登录" : "注册"}
          </button>

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