# 通用设定

```
BaseURL:  /api
鉴权方式: Authorization: Bearer <accessToken>
响应格式: { code: 0, message: "success", data: {} }
错误格式: { code: 400, message: "错误原因", data: null }
```

---

# 用户模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/user/register` | 否 | 注册，成功后自动登录返回 Token |
| POST | `/api/user/login` | 否 | 登录，返回 AccessToken + 写入 RefreshToken Cookie |
| GET | `/api/user/profile` | ✅ | 获取当前用户信息 |
| POST | `/api/user/refresh` | Cookie | 刷新 AccessToken |
| POST | `/api/user/logout` | ✅ | 退出，清除 Cookie |

## POST /api/user/register

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名，6-20位字母/数字/下划线 |
| password | string | ✅ | 密码，最少 6 位 |
| email | string | | 邮箱 |
| phone | string | | 手机号 |
| nickname | string | | 昵称，默认等于 username |

**响应 data**

```json
{
  "userInfo": {
    "id": 1,
    "username": "player01",
    "nickname": "player01",
    "email": null,
    "phone": null
  },
  "accessToken": "<JWT>"
}
```

> 注册成功后 RefreshToken 通过 HttpOnly Cookie 写入，Cookie 路径限定为 `/api/user/refresh`。

---

## POST /api/user/login

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| account | string | ✅ | 用户名 / 邮箱 / 手机号（自动识别类型） |
| password | string | ✅ | 明文密码 |

**响应 data**

```json
{
  "userInfo": {
    "id": 1,
    "username": "player01",
    "nickname": "player01",
    "email": null,
    "phone": null
  },
  "accessToken": "<JWT>"
}
```

> RefreshToken 通过 HttpOnly Cookie 写入，有效期 7 天。

---

## GET /api/user/profile

**请求头**

```
Authorization: Bearer <accessToken>
```

**响应 data**

```json
{
  "userInfo": {
    "id": 1,
    "username": "player01",
    "nickname": "player01",
    "email": null,
    "phone": null,
    "created_at": "2026-05-01T00:00:00.000Z"
  }
}
```

---

## POST /api/user/refresh

> 无需 Authorization 头，依赖 HttpOnly Cookie 中的 RefreshToken 自动携带。

**响应 data**

```json
{
  "accessToken": "<新JWT>"
}
```

> 同时滚动更新 RefreshToken Cookie。

---

## POST /api/user/logout

**请求头**

```
Authorization: Bearer <accessToken>
```

**响应 data**

```json
null
```

> 清除服务端 RefreshToken Cookie。

---

# 剧本模块

| 方法 | 路径 | 鉴权 | 说明 | 状态 |
|------|------|------|------|------|
| GET | `/api/scripts` | 否 | 剧本列表 | 待开发 |
| GET | `/api/scripts/:scriptId/nodes/:nodeId` | 否 | 单节点详情 | 待开发 |

## GET /api/scripts

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 搜索关键词，后端按标题匹配（SQL LIKE），不传或为空时返回全量 |

**响应 data**

```json
[
  {
    "id": "capture1",
    "title": "我们仍未知道那天在边狱所看到的固定队的名字",
    "description": "一切从一支固定队开始。骰子将决定你们的故事走向……",
    "coverColor": "#1a3a5c",
    "tags": ["安科", "零式", "固定队", "剧情"],
    "chapterCount": 1
  }
]
```

> 仅返回 `status = 1`（上架）的剧本。

---

## GET /api/scripts/:scriptId/nodes/:nodeId

**Path 参数**

| 参数 | 说明 |
|------|------|
| scriptId | 剧本 ID，如 `capture1` |
| nodeId | 节点 ID，如 `chapter1_node2` |

**响应 data**

```json
{
  "id": "chapter1_node2",
  "title": "固定队队长性别",
  "content": "让我们先看一下这名未来的固定队队长是一个什么样的人吧？\n性别：",
  "type": "dice",
  "choices": [
    {
      "text": "队长性别判定",
      "diceRequired": 2,
      "outcomes": [
        {
          "match": 1,
          "optionText": "男",
          "resultText": "队长是男生",
          "nextNode": null
        },
        {
          "match": 2,
          "optionText": "女",
          "resultText": "队长是女生",
          "nextNode": "chapter1_node3"
        }
      ]
    }
  ]
}
```

---

# 存档模块

| 方法 | 路径 | 鉴权 | 说明 | 状态 |
|------|------|------|------|------|
| GET | `/api/records` | ✅ | 查询存档 | 待开发 |
| POST | `/api/records` | ✅ | 创建/更新存档 | 待开发 |

## GET /api/records

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scriptId | string | ✅ | 剧本 ID |

**响应 data**

```json
{
  "id": 1,
  "scriptId": "capture1",
  "currentNodeId": "chapter1_node5",
  "history": [
    {
      "nodeId": "chapter1_node2",
      "content": "让我们先看一下……",
      "resultText": "队长是女生",
      "rollLabel": "d2 = 2 ： 队长是女生",
      "timestamp": "2026-05-03T10:23:00.000Z"
    }
  ],
  "status": 1,
  "updatedAt": "2026-05-03T10:00:00.000Z"
}
```

> 用户在当前剧本无存档时返回 `data: null`，code 仍为 0。

---

## POST /api/records

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scriptId | string | ✅ | 剧本 ID |
| currentNodeId | string | ✅ | 当前节点 ID |
| history | array | ✅ | 历史记录快照，每条包含 nodeId / content / resultText / rollLabel / timestamp |
| status | number | | 1进行中 2已完成，默认 1 |

**响应 data**

```json
{
  "id": 1
}
```

> 同一用户同一剧本只保留一条存档，重复调用为更新操作（upsert）。
