import React, { useState, useRef, useEffect } from "react";
import storyNodes from "./assets/capture1.json";

// 仅保留最必要的全局重置，无任何多余样式
const GlobalStyle = () => (
  <style>
    {`
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html, body, #root {
        height: 100%;
        overflow: hidden; /* 仅禁止根节点滚动，无其他样式 */
        background: #121212;
        color: #e0e0e0;
        font-family: sans-serif;
        line-height: 1.8;
        font-size: 18px;
      }
      /* 仅保留全屏滚动容器，无任何宽度/自定义样式 */
      .scroll-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow-y: auto; /* 仅原生滚动条，无任何自定义 */
        padding: 20px; /* 仅基础内边距，避免内容贴边 */
      }
    `}
  </style>
);

function App() {
  // 核心状态（仅保留功能必需）
  const [currentNodeId, setCurrentNodeId] = useState("chapter1_node2");
  const [history, setHistory] = useState([]);
  const [diceResult, setDiceResult] = useState(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const [currentOutcome, setCurrentOutcome] = useState("");
  const [currentNextNode, setCurrentNextNode] = useState("");
  const scrollRef = useRef(null);

  const currentNode = storyNodes.find((node) => node.id === currentNodeId);

  // 自动滚动（仅保留核心逻辑）
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 0);
    }
  }, [history, showOutcome]);

  // 生成随机数（核心功能不变）
  const rollDice = (diceRequired) => {
    let min, max;
    if (typeof diceRequired === "number") {
      min = 1;
      max = diceRequired;
    } else if (Array.isArray(diceRequired)) {
      [min, max] = diceRequired;
    } else {
      min = 1;
      max = 2;
    }
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    setDiceResult(result);
    return result;
  };

  // 匹配结果（核心功能不变）
  const matchOutcome = (result, outcomes) => {
    if (!outcomes || outcomes.length === 0) {
      setCurrentOutcome("无判定结果");
      setCurrentNextNode("");
      return "无判定结果";
    }
    const matched = outcomes.find((outcome) => {
      if (typeof outcome.match === "number") return outcome.match === result;
      if (Array.isArray(outcome.match))
        return result >= outcome.match[0] && result <= outcome.match[1];
      return false;
    });
    const resultText = matched?.resultText || "判定完成";
    const nextNode = matched?.nextNode || "";
    setCurrentOutcome(resultText);
    setCurrentNextNode(nextNode);
    return resultText;
  };

  // 处理骰子投掷（核心功能不变）
  const handleDiceRoll = (choice) => {
    const result = rollDice(choice.diceRequired);
    matchOutcome(result, choice.outcomes);
    setShowOutcome(true);
  };

  // 跳转到下一个节点（核心功能不变）
  const goToNextNode = () => {
    if (!currentNextNode) {
      alert("🎉 安科剧情演示结束！");
      return;
    }
    setHistory((prev) => [
      ...prev,
      {
        node: currentNode,
        diceResult,
        outcome: currentOutcome,
        diceRequired: currentNode.choices[0]?.diceRequired || 0,
      },
    ]);
    setCurrentNodeId(currentNextNode);
    setDiceResult(null);
    setShowOutcome(false);
    setCurrentOutcome("");
    setCurrentNextNode("");
  };

  // 提取表格标题（核心功能不变）
  const extractTableTitle = (content) => {
    if (!content) return "判定";
    const lines = content.split("\n").filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("ROLL") && trimmed !== "";
    });
    const titleLine = lines.findLast(
      (line) => line.trim().endsWith("：") || line.trim().endsWith(":"),
    );
    return titleLine ? titleLine.replace(/[：:]$/, "").trim() : "判定";
  };

  // 格式化骰子显示文本（核心功能不变）
  const formatDiceText = (diceRequired) => {
    if (typeof diceRequired === "number") return `d${diceRequired}`;
    if (Array.isArray(diceRequired))
      return `d${diceRequired[0]}-${diceRequired[1]}`;
    return "d2";
  };

  // 解析match为范围文本（核心功能不变）
  const getRangeText = (match) => {
    if (typeof match === "number") return match.toString();
    if (Array.isArray(match)) return `${match[0]}-${match[1]}`;
    return "";
  };

  // 点击选项选中（核心功能不变）
  const handleOptionClick = (outcome) => {
    setCurrentOutcome(outcome.resultText);
    setCurrentNextNode(outcome.nextNode);
    setDiceResult(
      typeof outcome.match === "number"
        ? outcome.match
        : `${outcome.match[0]}-${outcome.match[1]}`,
    );
    setShowOutcome(true);
  };

  return (
    <>
      <GlobalStyle />
      {/* 仅全屏滚动容器，无title、无多余宽度/样式 */}
      <div ref={scrollRef} className="scroll-container">
        {/* 历史记录 */}
        {history.map((item, index) => (
          <div
            key={index}
            style={{
              margin: "20px 0",
              paddingBottom: "20px",
              borderBottom: "1px solid #2d2d2d",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{item.node.content}</div>
            {item.outcome && (
              <div
                style={{
                  marginTop: "10px",
                  textAlign: "center",
                  fontSize: "20px",
                  color: "#ffcc80",
                }}
              >
                {item.outcome}
              </div>
            )}
          </div>
        ))}

        {/* 当前节点（仅保留基础样式，无多余宽度） */}
        {currentNode && (
          <div
            style={{
              margin: "20px 0",
              paddingBottom: "20px",
              borderBottom: "1px solid #2d2d2d",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{currentNode.content}</div>

            {currentNode.type === "dice" && !showOutcome && (
              <>
                {/* 判定表格 - 无max-width，自适应宽度 */}
                <div
                  style={{
                    margin: "20px 0",
                    border: "2px solid #4a4a4a",
                    background: "#1e1e1e",
                    padding: "10px",
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: "22px",
                      fontWeight: "bold",
                      marginBottom: "10px",
                      paddingBottom: "10px",
                      borderBottom: "2px solid #4a4a4a",
                    }}
                  >
                    {extractTableTitle(currentNode.content)}
                  </div>
                  <div>
                    {currentNode.choices[0]?.outcomes?.map((outcome, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "8px 0",
                          borderBottom:
                            idx < currentNode.choices[0].outcomes.length - 1
                              ? "1px solid #3a3a3a"
                              : "none",
                          cursor: "pointer",
                        }}
                        onClick={() => handleOptionClick(outcome)}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "80px",
                            fontWeight: "bold",
                            color: "#ff9800",
                          }}
                        >
                          {getRangeText(outcome.match)}
                        </span>
                        <span>{outcome.optionText}</span>
                        <span
                          style={{
                            marginLeft: "10px",
                            fontSize: "14px",
                            color: "#888",
                          }}
                        >
                          （点击直接选中）
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 投掷按钮 - 无多余样式 */}
                <div style={{ textAlign: "center", margin: "20px 0" }}>
                  {currentNode.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleDiceRoll(choice)}
                      disabled={showOutcome}
                      style={{
                        padding: "10px 20px",
                        background: "#2e7d32",
                        color: "white",
                        border: "none",
                        cursor: showOutcome ? "not-allowed" : "pointer",
                        opacity: showOutcome ? 0.7 : 1,
                      }}
                    >
                      🎲 随机投掷 {formatDiceText(choice.diceRequired)}
                    </button>
                  ))}
                </div>

                {/* 临时骰子结果 */}
                {diceResult && !showOutcome && (
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: "36px",
                      fontWeight: "bold",
                      color: "#ff7043",
                    }}
                  >
                    {diceResult}
                  </div>
                )}
              </>
            )}

            {/* 判定结果 */}
            {showOutcome && (
              <div style={{ textAlign: "center", margin: "20px 0" }}>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#ffcc80",
                    marginBottom: "10px",
                  }}
                >
                  {typeof diceResult === "number"
                    ? `ROLL : ${formatDiceText(currentNode.choices[0]?.diceRequired)}=${formatDiceText(currentNode.choices[0]?.diceRequired)}(${diceResult})=${diceResult}`
                    : `已选中：${diceResult}`}
                </div>
                <div style={{ fontSize: "20px", marginBottom: "20px" }}>
                  {currentOutcome}
                </div>
                <button
                  onClick={goToNextNode}
                  style={{
                    padding: "10px 20px",
                    background: "#1976d2",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  继续剧情 →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default App;
