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

---

## 设计缺陷

> ⚠️ 以下问题在当前项目中属于已知且可接受的取舍，但在高敏感业务场景下**必须解决**。

### 缺陷-001：logout 后 accessToken 仍有效

**问题**：

用户点击退出登录后，后端只清除了 RefreshToken Cookie，但 accessToken 本身不会失效。如果 accessToken 在退出前被复制或被恶意脚本获取，攻击者在 token 自然过期前（当前配置 1 小时）仍可用它访问需鉴权的接口。

**根因**：

JWT 是无状态 Token，后端不存储会话，验证逻辑只检查签名和过期时间，无法主动使某个 token 失效。

**当前取舍**：

本项目为游戏应用，鉴权接口（`/api/user/profile`）仅返回用户名等非敏感信息，1 小时泄露窗口可接受。RefreshToken 登出时已清除，泄露的 token 到期后无法续期。

**高敏感场景的解决方案**：

> ⚠️ **支付、转账、权限变更等高敏感接口，必须解决此问题**，可选方案如下：

| 方案 | 原理 | 适用场景 |
|------|------|---------|
| 缩短 accessToken 有效期（如 15min） | 缩小泄露窗口，成本最低 | 通用，作为基础手段 |
| Token 黑名单（Redis） | 登出时将 token 的 `jti`（唯一 ID）写入 Redis，每次验证时检查黑名单 | 高敏感业务，已有 Redis 基础设施 |
| token 版本号（数据库字段） | 用户表增加 `token_version`，登出时 +1，验证时比对版本号 | 无 Redis 但有数据库，每次验证多一次 DB 查询 |
| 敏感操作二次验证 | 支付等操作要求重新输入密码或验证码，不依赖 token 状态 | 金融类业务的行业标准做法 |

**面试**：
"前端侧我已经做完了所有能做的：清 localStorage、调登出接口通知后端清 Cookie。剩余的风险是 accessToken 本身还有效，这是 JWT 无状态的固有问题，前端无法单独解决。我能识别出这个 1 小时的泄露窗口，知道它在当前游戏场景下是可接受的，但如果业务升级到支付场景，我会把这个风险同步给后端，推动他们评估是否需要引入 token 吊销机制。"

---

## ADR-004：存档 history 字段的存储方案

**日期**：2026-05-04
**状态**：已采纳

### 背景

存档模块需要记录用户在当前剧本的完整历史轨迹，每条记录包含：节点 ID、节点内容、选择结果文案、骰子结果、时间戳。

设计时存在两种方案：

**方案 A：前端只传节点路径（`nodeId[]`），后端反查剧本 JSON 拼装完整 history**

**方案 B：前端组装完整 history 对象数组，后端直接存储**

### 决策

采用**方案 B**：前端传完整 history，后端直接序列化存储。

### 取舍分析

| | 方案 A | 方案 B |
|---|---|---|
| 前端操作 | 轻（只记录 nodeId） | 轻（数据已在内存中，push 成本极低） |
| 网络传输 | 轻 | 较重（但 history 条数有限，可忽略） |
| 后端操作 | 重（需反查剧本 JSON 拼装） | 轻（直接存储） |
| 耦合度 | 高（后端强依赖剧本 JSON 结构） | 低（后端只做持久化，不感知业务内容） |

### 弃用方案 A 的原因

方案 A 要求后端根据 nodeId 去剧本 JSON 里反查 `content`、`resultText`、`rollLabel`，意味着后端必须理解剧本数据结构。剧本 JSON 格式一旦变更，存档模块也要跟着改——两个不相关的模块产生了不必要的耦合。

### 采用方案 B 的原因

前端在游戏运行时已经持有完整的节点数据（用于渲染），存档时只是把已有数据原样交给后端保存，额外成本接近零。后端职责单一（纯存取），不感知业务内容，符合"各层只做属于自己的事"的分层原则。

### 已知限制：全量 history 的极端数据量风险

**场景**：剧本节点数达到上万级别，用户连续操作数千次后触发存档。

**风险点**：
- 网络传输：7000 条记录 × 约 300 字节 ≈ 2MB 单次请求体，移动端弱网下可能超时
- 后端阻塞：`JSON.stringify` 大体积数据在 Node.js 主线程同步执行，可能阻塞事件循环数百毫秒，影响其他用户请求

**当前取舍**：本项目剧本节点数量有限，游戏性质决定用户不会连续操作上万次不关页面，此风险在当前业务边界内可接受。

**若需解决的方向**：
- **增量存档**：前端每次选择后只 POST 单条新增记录，后端做 append 而非全量覆盖；代价是写入频率变高
- **截断 history**：只保留最近 N 条（如 500 条），适合历史记录仅用于展示回顾的场景