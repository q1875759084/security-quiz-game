# 架构决策记录（ADR）

> ADR = Architecture Decision Record
> 记录开发过程中有明确取舍的设计决策，供后续维护者理解「为什么这样做」。

---

## ADR-001：运行环境感知方案

**日期**：2026-05-03
**状态**：已采纳

### 背景

项目需要同时支持：
1. 独立运行（PC 浏览器 / 手机 H5）
2. 作为微前端子应用接入主壳（qiankun / micro-app）

不同场景下 UI 行为有差异：
- 手机 H5 vs PC：布局、交互组件不同
- 微前端子应用：隐藏独立 Header（主应用有自己的全局导航）

### 决策

使用**两个正交维度**感知运行环境，封装为 `useEnv` hook：

| 维度 | 判断依据 | 备选方案及弃用原因 |
|------|---------|----------------|
| 设备类型（isMobile） | `navigator.userAgent` | URL 参数：用户可篡改，分享链接泄露设备信息 |
| 是否微前端（isMicroApp） | 框架注入的全局标记（`__POWERED_BY_QIANKUN__` / `__MICRO_APP_ENVIRONMENT__`） | URL 参数：依赖调用方手动传参，主应用忘传则逻辑错误；Cookie/LocalStorage：跨应用污染 |

### 结果

```
独立运行 + PC    → isMicroApp: false, isMobile: false
独立运行 + 手机  → isMicroApp: false, isMobile: true
微前端子应用     → isMicroApp: true,  isMobile: 由 UA 决定
```

### 影响

- `isMicroApp` / `isMobile` 通过 `AuthContext` 下发，全应用任意组件可直接用 `useAuth()` 获取，无需 props drilling
- `HomeHeader` 在微前端环境下 `return null`，不渲染
- 后续手机端差异化 UI 统一通过 `isMobile` 条件渲染，禁止用 CSS `@media` 做功能级差异（样式差异可以用 media，功能差异用 isMobile）

---

## ADR-002：前端请求路径规范

**日期**：2026-05-03
**状态**：已采纳

### 背景

axios 实例配置了 `baseURL: '/api'`，但各 api 文件中请求路径写成 `/api/xxx`，导致实际请求变为 `/api/api/xxx`（404）。

### 决策

**`baseURL` 已含 `/api`，请求路径只写资源路径，不再重复 `/api` 前缀。**

```ts
// ❌ 错误：/api + /api/scripts = /api/api/scripts
request.get('/api/scripts')

// ✅ 正确：/api + /scripts = /api/scripts
request.get('/scripts')
```

### 影响

- 所有 `src/api/` 下的文件路径已修正
- `request.ts` 中 `refreshTokenRequest` 的路径已修正

---

## ADR-003：Nginx proxy_pass 与后端路由前缀对齐

**日期**：2026-05-03
**状态**：已采纳

### 背景

Nginx 反向代理 `/api/` 到后端，后端 Express 注册路由为 `app.use('/api', routes)`。
`proxy_pass` 末尾是否带 `/` 决定了转发路径，两次调错后最终确认正确配置。

### 决策

```nginx
location /api/ {
    proxy_pass http://172.17.0.1:3001;  # 无末尾斜杠
}
```

**规则**：
- `proxy_pass` **无末尾路径**：URL 原样转发，`/api/scripts` → 后端收到 `/api/scripts`
- `proxy_pass` **有末尾路径（含仅 `/`）**：用 proxy_pass 路径替换 location 匹配前缀，`/api/scripts` → 后端收到 `/scripts`

后端 `app.use('/api', routes)` 是**前缀匹配**（不是添加前缀），需要收到完整的 `/api/xxx` 才能路由到正确处理函数，因此 Nginx 不能剥掉 `/api` 前缀。

---

## 用户模块

### logout 完整链路

**日期**：2026-05-03

退出登录涉及两层 Token 的清理，逻辑如下：

```
前端 authService.logout()
  │
  ├─ 1. axios.post('/user/logout')  ← 前端主动发起，目的是清除后端 Cookie
  │       │
  │       └─ 浏览器构造 HTTP Request，自动携带当前域名下的 Cookie
  │
  ├─ 2. 后端收到请求
  │       │
  │       └─ res.clearCookie('refresh_token', { path: '/api/user/refresh' })
  │            实质：在 Response 头写入：
  │            Set-Cookie: refresh_token=; Path=/api/user/refresh; Max-Age=0; HttpOnly
  │
  ├─ 3. 浏览器收到 Response
  │       │
  │       ├─ 浏览器层（JS 不可见）：
  │       │    解析 Set-Cookie 头，Max-Age=0 → Cookie 立即过期 → 从存储中清除
  │       │
  │       └─ JS 层（axios）：拿到 { code: 200, data: null }，前端无需感知内容
  │
  └─ 4. finally: clearToken()  ← 清除本地 localStorage 中的 accessToken
```

**关键设计点**：

- `clearCookie` 本质是发送 `Max-Age=0` 的 Set-Cookie，HTTP 协议没有"删除 Cookie"的原语
- Cookie 由**浏览器托管**，JS 拿到 Response 之前浏览器已处理 Set-Cookie，JS 无法感知也无法直接操作 HttpOnly Cookie，这正是 HttpOnly 防 XSS 的原理
- `finally` 保证无论后端接口成功还是失败（网络异常），本地 accessToken 都会被清除，用户一定能退出
- 退出后 RefreshToken Cookie 被清除，即使 accessToken 未过期也无法续期，下次打开需要重新登录
