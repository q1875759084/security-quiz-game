# 架构设计文档

## 1. 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 样式 | CSS Modules (SCSS) |
| 路由 | 自实现 Hash Router（无外部依赖） |
| 构建 | Webpack 5 + Babel |
| 后端 | Express + SQLite |
| 部署 | Docker + Nginx 反向代理 |

---

## 2. 前端目录结构

```
src/
├── App.tsx               # 根组件，含 AuthContext 和 Hash Router
├── pages/
│   ├── Home/             # 剧本列表页
│   └── Game/             # 游戏主页面
├── components/           # 公共组件（Header、LoginModal）
├── hooks/                # 数据 Hook（useScripts）
├── services/             # 外部服务调用（authService）
├── types/                # TypeScript 类型定义
├── assets/               # 静态剧本 JSON（demo 阶段）
└── utils/                # 工具函数（request、token 等）
```

---

## 3. 剧本数据结构

### ScriptMeta（列表页展示）

```typescript
interface ScriptMeta {
  id: string;
  title: string;
  description: string;
  coverColor: string;   // 封面主题色
  tags: string[];
  chapterCount: number;
}
```

### ScriptNode（游戏节点）

```typescript
interface ScriptNode {
  id: string;           // 全局唯一，格式：chapter{N}_node{M} 或语义化命名
  title: string;
  content: string;      // 节点正文，\n 换行
  type: 'dice' | 'choice' | 'text';
  choices: Choice[];
}

interface Choice {
  text: string;
  diceRequired: number | [number, number];  // 骰子面数或范围
  outcomes: Outcome[];
}

interface Outcome {
  match: number | [number, number];  // 精确点数或范围区间
  optionText: string;   // 判定表展示文案
  resultText: string;   // 历史记录展示文案
  nextNode: string | null;  // null 表示分支尚未开发，不可跳转
}
```

**约束规则：**
- 同一 `Choice` 下所有 `outcome.match` 必须连续且无重叠，完整覆盖 `1 ~ diceRequired`
- `nextNode: null` 的分支在前端自动屏蔽（不参与随机投骰、不可点击）
- 节点 ID 序号不要求连续，引擎通过字符串精确匹配查找节点

---

## 4. 剧本数据加载策略

### 现状（Demo 阶段）

当前使用静态 JSON 文件一次性加载全部节点：

```
GET (static) /assets/capture1.json  →  所有节点数组
```

适用于节点数 < 200 的 demo 场景，无需改动。

### 目标方案（正式后端接入后）

采用**单节点按需拉取 + 预取（Prefetch）**策略：

#### 接口设计

```
GET /api/scripts/:scriptId/nodes/:nodeId
```

返回单个 `ScriptNode` 对象。

#### 加载流程

```
玩家到达 nodeA
    │
    ├─ ① 渲染 nodeA（已在缓存）
    │
    └─ ② 后台静默预取 nodeA 所有有效子节点
           nodeA.choices[].outcomes
             .filter(o => o.nextNode !== null)
             .map(o => o.nextNode)
           → 并行 GET /nodes/nodeB、/nodes/nodeC、/nodes/nodeD
    
玩家投骰，结果落在 nodeB
    │
    ├─ ③ nodeB 已在缓存 → 0 延迟跳转
    │
    └─ ④ 后台静默预取 nodeB 的子节点（递归 depth=1）
```

#### 预取深度

| 深度 | 预取量 | 推荐场景 |
|------|--------|---------|
| depth=1 ✅ | 直接子节点 | 标准场景，覆盖下一步所有可能，流量可控 |
| depth=2 | 子节点 + 孙节点 | 网络较差时提升体验，流量翻倍 |
| depth=∞ | 全量 | 退化为当前 demo 方案，不推荐 |

#### 实现位置

数据层（`useScriptNode` Hook）负责缓存和预取，`GamePage` 感知不到网络：

```typescript
// hooks/useScriptNode.ts（待实现）
export function useScriptNode(scriptId: string, nodeId: string | null) {
  // 1. 优先从缓存读取
  // 2. 缓存未命中时发起请求
  // 3. 节点加载完成后，提取所有有效 nextNode 并行预取
  return { node, isLoading };
}
```

`GamePage` 中的 `advance()` 触发跳转时，同步触发下一层预取：

```typescript
const advance = useCallback((outcome, rollLabel) => {
  setHistory(prev => [...prev, { node: currentNode, rollLabel, resultText }]);
  setCurrentNodeId(outcome.nextNode);        // 跳转（命中缓存，0延迟）
  prefetchNextNodes(scriptId, outcome.nextNode);  // 预取下一层
}, [...]);
```

#### 与现有代码的兼容性

`GamePage` 的状态管理逻辑（历史记录、当前节点、投骰/跳转）**无需任何改动**，只需将数据层的 `useScriptNodes`（全量）替换为 `useScriptNode`（单节点 + 缓存）即可。

---

## 5. 数据库表设计

> 数据库：SQLite（better-sqlite3）
> 文件路径：项目根目录 `database.sqlite3`

### users 表（已建）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 用户 ID |
| username | TEXT | UNIQUE, NOT NULL | 用户名，6-20位字母/数字/下划线 |
| password_hash | TEXT | NOT NULL | bcrypt 加密密码（10轮加盐） |
| email | TEXT | UNIQUE | 邮箱（选填） |
| phone | TEXT | UNIQUE | 手机号（选填） |
| nickname | TEXT | | 昵称，默认等于 username |
| avatar | TEXT | | 头像 URL |
| status | TINYINT | DEFAULT 1 | 账号状态：1正常 0禁用 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | | 更新时间 |

---

### scripts 表（待建）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | 剧本唯一ID，如 `capture1` |
| title | TEXT | NOT NULL | 剧本标题 |
| description | TEXT | | 剧本简介 |
| cover_color | TEXT | | 封面主题色，如 `#1a3a5c` |
| tags | TEXT | | JSON 数组字符串，如 `["安科","零式"]` |
| chapter_count | INTEGER | DEFAULT 1 | 章节数 |
| status | TINYINT | DEFAULT 1 | 1上架 0下架 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | | |

---

### script_nodes 表（待建）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | 节点ID，如 `chapter1_node2` |
| script_id | TEXT | FK → scripts.id | 所属剧本 |
| title | TEXT | NOT NULL | 节点标题（调试用） |
| content | TEXT | NOT NULL | 节点正文，`\n` 换行 |
| type | TEXT | NOT NULL | `dice` / `choice` / `text` |
| choices | TEXT | NOT NULL | JSON 序列化的 Choice[]，结构见第 3 节 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

> `choices` 直接存 JSON 字符串，避免多表 JOIN，单节点查询 O(1)，适合按需拉取场景。

---

### game_records 表（待建，存档用）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| user_id | INTEGER | FK → users.id | 玩家 |
| script_id | TEXT | FK → scripts.id | 剧本 |
| current_node_id | TEXT | NOT NULL | 当前所在节点 ID |
| history | TEXT | NOT NULL | JSON 序列化的历史记录快照 |
| status | TINYINT | DEFAULT 1 | 1进行中 2已完成 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | | |

---

## 6. 认证流程

```
前端启动
  └─ validateToken()
       ├─ 本地 Token 有效 → 静默登录，写入 AuthContext
       └─ 无 Token / 过期 → 游客态，可浏览剧本列表
                               └─ 触发需登录操作 → 弹出 LoginModal
```

JWT Token 存储于 `localStorage`，通过 `authService` 统一管理。

---

## 7. 待办事项

- [x] 后端 Express + SQLite 基础框架搭建
- [ ] 后端端口统一：后端 4000，前端 3000
- [ ] 前端 Webpack proxy 配置（`/api` → `localhost:4000`）
- [ ] `scripts` 表 + `script_nodes` 表建表及初始数据导入
- [ ] `GET /api/scripts` 剧本列表接口
- [ ] `GET /api/scripts/:id/nodes/:nodeId` 单节点接口
- [ ] `GET /api/scripts/:id/nodes/:nodeId/prefetch` 批量预取接口
- [ ] `useScriptNode` Hook 实现（单节点 + 预取缓存）
- [ ] `game_records` 表建表
- [ ] 游戏存档接口（创建/更新/查询）
- [ ] Docker Compose 生产环境配置
