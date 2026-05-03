# 安科剧本 JSON 生成提示词

## 你的任务

我将给你一段帖子内容（通常来自论坛、贴吧或社交媒体），内容描述了某个 FFXIV 固定队或角色的经历、属性、故事。

你需要：
1. **阅读帖子内容**，提取其中出现的可随机化要素（如性别、职业、水平、性格、经历等）
2. **修改或补充** 下方提供的现有 JSON 节点（修复 `nextNode: null` 的断裂分支，补充缺失节点）
3. **生成新的节点**，以 JSON 数组格式输出，可直接合并到现有文件

---

## 数据结构说明

每个节点是一个 `ScriptNode` 对象，完整结构如下：

```json
{
  "id": "chapter1_nodeN",        // 唯一ID，格式：chapterX_nodeN
  "title": "节点标题",            // 简短描述，用于开发调试
  "content": "展示给玩家的文案\n换行用 \\n，最后一行通常以冒号结尾作为判定提示",
  "type": "dice",                // 固定填 "dice"（当前只支持骰子判定节点）
  "choices": [
    {
      "text": "判定项描述",
      "diceRequired": 6,         // 骰子面数（整数）或范围 [min, max]
      "outcomes": [
        {
          "match": 1,            // 精确匹配：数字；范围匹配：[min, max]
          "optionText": "选项文案（判定表里显示）",
          "resultText": "判定结果文案（历史记录里显示）",
          "nextNode": "chapter1_nodeN"  // 下一节点ID；暂未开发的分支填 null
        }
      ]
    }
  ]
}
```

### 关键规则

| 字段 | 规则 |
|------|------|
| `id` | 全局唯一，格式 `chapter{章节号}_node{序号}`，序号从现有最大值续接 |
| `match` | outcomes 中所有 match 必须**连续且无重叠**地覆盖 `1 ~ diceRequired` |
| `diceRequired` | 等于所有有效 outcomes 中 match 最大值（`null` 分支不算） |
| `nextNode` | 指向真实存在的节点 ID；**尚未开发的分支必须填 `null`，不要填字符串** |
| `content` | 文案口吻统一为旁白/主持人视角，轻松幽默，符合 FFXIV 二次元社区风格 |
| `optionText` | 判定表里的简短标签，≤15字 |
| `resultText` | 历史记录展示文案，≤20字，陈述句 |

---

## 现有节点总览（capture1.json）

```
chapter1_node2  → 队长性别（d2）
  match=1: 队长是男生       → null（未开发）
  match=2: 队长是女生       → chapter1_node3

chapter1_node3  → 入坑时间（d5）
  match=1: 2.0化石玩家      → null
  match=2: 3.0老登玩家      → null
  match=3: 4.0中期玩家      → null
  match=4: 5.0中期玩家      → chapter1_node4  ✅ 唯一有效分支
  match=5: 6.0豆芽          → null

chapter1_node4  → 主职类型（d19）
  [1,10]:  坦克或治疗        → chapter1_node5
  [11,18]: 近战或远程物理    → chapter1_node5
  19:      法系             → chapter1_node5

chapter1_node5  → 龙骑水平（d100）
  [1,20]:   灰色logs        → chapter1_node6
  [21,59]:  蓝绿logs        → chapter1_node6
  [60,90]:  紫橙logs        → chapter1_node6
  [91,100]: 全橙logs        → chapter1_node6

chapter1_node6  → 零式经验（d2）
  match=1: 有零式经验        → chapter1_node7
  match=2: 无零式经验        → chapter1_node7

chapter1_node7  → 打零式原因（d6）
  [1,3]: 主动想挑战          → chapter1_node8
  [4,6]: 被劝说/一时兴起     → chapter1_node8

chapter1_node8  → 固定队目标（d10）
  1:     首周通关            → chapter1_node9
  [2,6]: 次周/三周通关       → chapter1_node9
  [7,9]: 首月休闲            → chapter1_node9
  10:    随缘               → chapter1_node9

chapter1_node9  → 是否有亲友CP（d2）
  match=1: 有亲友/CP        → chapter1_node10（⚠️ 待生成）
  match=2: 孤身招募          → chapter1_node10（⚠️ 待生成）
```

**当前末尾节点：** `chapter1_node9`，两条分支均指向待生成的 `chapter1_node10`

**下一个可用序号：** `chapter1_node10` 起

---

## 输出格式要求

- 只输出 **JSON 数组**，不加任何解释文字
- 数组中每个元素是一个完整的 `ScriptNode` 对象
- 如需修改现有节点（如补全 `null` 分支），输出修改后的完整节点对象，并在最前面加注释说明哪些是修改节点、哪些是新节点
- 所有字符串使用双引号，JSON 合法，可直接粘贴

---

## 示例输入

> 帖子内容："我们队的龙骑姐姐是5.0入坑的，第一个职业其实是白魔，后来被队友忽悠着转了龙骑。零式经验为零，但是人超努力，每天对着轴练习……"

## 示例输出（节选）

```json
[
  {
    "id": "chapter1_node10",
    "title": "招募方式",
    "content": "那么她是怎么找到这支固定队的呢？\n招募方式：",
    "type": "dice",
    "choices": [
      {
        "text": "招募方式判定",
        "diceRequired": 4,
        "outcomes": [
          {
            "match": 1,
            "optionText": "贴吧/论坛招募帖",
            "resultText": "通过帖子找到固定队",
            "nextNode": "chapter1_node11"
          },
          {
            "match": 2,
            "optionText": "游戏内招募频道",
            "resultText": "游戏内招募频道找队",
            "nextNode": "chapter1_node11"
          },
          {
            "match": 3,
            "optionText": "朋友介绍/直接拉人",
            "resultText": "朋友拉进固定队",
            "nextNode": null
          },
          {
            "match": 4,
            "optionText": "自己建队拉人",
            "resultText": "自己组建了固定队",
            "nextNode": null
          }
        ]
      }
    ]
  }
]
```

---

## 现在请输入帖子内容，我将生成对应的 JSON 节点
