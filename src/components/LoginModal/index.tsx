import React, { useState, useEffect } from "react";
import styles from "./index.module.scss";
import { authService } from "../../services/authService";
import type { UserInfo } from "../../services/authService";

export interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (userInfo: UserInfo) => void;
}

// 表单字段统一收进对象，避免 reset 时遗漏某个字段
interface FormFields {
  account: string;
  password: string;
  username: string;
  phone: string;
  email: string;
  confirmPassword: string;
}

const EMPTY_FORM: FormFields = {
  account: '',
  password: '',
  username: '',
  phone: '',
  email: '',
  confirmPassword: '',
};

const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose, onSuccess }) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fields, setFields] = useState<FormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormFields>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 关闭时重置所有状态
  useEffect(() => {
    if (!visible) {
      setMode("login");
      setFields(EMPTY_FORM);
      setErrors({});
    }
  }, [visible]);

  const setField = (key: keyof FormFields) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }));

  // 合并两个 switch 函数，切换时同时清空错误
  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setErrors({});
  };

  const validateLogin = (): boolean => {
    const newErrors: Partial<FormFields> = {};
    if (!fields.account.trim()) newErrors.account = "请输入账号";
    if (!fields.password) newErrors.password = "请输入密码";
    else if (fields.password.length < 6) newErrors.password = "密码长度不能少于6位";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegister = (): boolean => {
    const newErrors: Partial<FormFields> = {};
    if (!fields.username.trim()) newErrors.username = "请输入用户名";
    else if (fields.username.length < 6) newErrors.username = "用户名长度不能少于6位";
    if (fields.phone && !/^1[3-9]\d{9}$/.test(fields.phone)) newErrors.phone = "手机号格式错误";
    if (fields.email && !/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(fields.email)) newErrors.email = "邮箱格式错误";
    if (!fields.password) newErrors.password = "请输入密码";
    else if (fields.password.length < 6) newErrors.password = "密码长度不能少于6位";
    if (!fields.confirmPassword) newErrors.confirmPassword = "请确认密码";
    else if (fields.confirmPassword !== fields.password) newErrors.confirmPassword = "两次输入的密码不一致";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const valid = mode === "login" ? validateLogin() : validateRegister();
    if (!valid) return;

    setIsSubmitting(true);
    try {
      const data = mode === "login"
        ? await authService.login({ username: fields.account.trim(), password: fields.password })
        : await authService.register({
            username: fields.username.trim(),
            phone: fields.phone || undefined,
            email: fields.email || undefined,
            password: fields.password,
          });
      onSuccess(data.userInfo);
      onClose();
    } catch (error) {
      console.error(mode === "login" ? '登录失败:' : '注册失败:', error);
      alert((error as Error).message || (mode === "login" ? '登录失败' : '注册失败'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!visible) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>

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
                  value={fields.account}
                  onChange={setField("account")}
                />
                {errors.account && <span className={styles.errorText}>{errors.account}</span>}
              </div>
              <div className={styles.formGroup}>
                <input
                  type="password"
                  className={`${styles.input} ${errors.password ? styles.error : ""}`}
                  placeholder="密码"
                  value={fields.password}
                  onChange={setField("password")}
                />
                {errors.password && <span className={styles.errorText}>{errors.password}</span>}
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
                  value={fields.username}
                  onChange={setField("username")}
                />
                {errors.username && <span className={styles.errorText}>{errors.username}</span>}
              </div>
              <div className={styles.formGroup}>
                <input
                  type="tel"
                  className={`${styles.input} ${errors.phone ? styles.error : ""}`}
                  placeholder="可用于登录和找回密码"
                  value={fields.phone}
                  onChange={setField("phone")}
                />
                {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
              </div>
              <div className={styles.formGroup}>
                <input
                  type="email"
                  className={`${styles.input} ${errors.email ? styles.error : ""}`}
                  placeholder="邮箱地址（选填）"
                  value={fields.email}
                  onChange={setField("email")}
                />
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>
              <div className={styles.formGroup}>
                <input
                  type="password"
                  className={`${styles.input} ${errors.password ? styles.error : ""}`}
                  placeholder="设置密码"
                  value={fields.password}
                  onChange={setField("password")}
                />
                {errors.password && <span className={styles.errorText}>{errors.password}</span>}
              </div>
              <div className={styles.formGroup}>
                <input
                  type="password"
                  className={`${styles.input} ${errors.confirmPassword ? styles.error : ""}`}
                  placeholder="确认密码"
                  value={fields.confirmPassword}
                  onChange={setField("confirmPassword")}
                />
                {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
              </div>
            </>
          )}

          <button type="submit" className={styles.loginBtn} disabled={isSubmitting}>
            {isSubmitting ? '处理中…' : mode === "login" ? "登录" : "注册"}
          </button>

          <div className={styles.switchLink}>
            {mode === "login" ? (
              <>
                还没有账号?{" "}
                <a href="#" className={styles.link} onClick={(e) => { e.preventDefault(); switchMode("register"); }}>
                  立即注册
                </a>
              </>
            ) : (
              <>
                已有账号?{" "}
                <a href="#" className={styles.link} onClick={(e) => { e.preventDefault(); switchMode("login"); }}>
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
