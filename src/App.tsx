import React, { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import LoginModal from "./components/LoginModal";
import storyNodes from "./assets/capture1.json";
import { authService } from "./services/authService";

// 全局样式
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
        background: #121212;
        color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.8;
        font-size: 18px;
      }
      .app-container {
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }
      .scroll-container {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        padding-top: 85px;
      }
    `}
  </style>
);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({ name: '用户' });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  
  // 核心状态
  const [currentNodeId, setCurrentNodeId] = useState("chapter1_node2");
  const [history, setHistory] = useState([]);
  const [diceResult, setDiceResult] = useState(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const [currentOutcome, setCurrentOutcome] = useState("");
  const [currentNextNode, setCurrentNextNode] = useState("");
  const scrollRef = useRef(null);

  const currentNode = storyNodes.find((node) => node.id === currentNodeId);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const userInfo = await authService.validateToken();
        setIsLoggedIn(true);
        setUser({ name: userInfo.username });
      } catch (error) {
        console.error('登录状态验证失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 0);
    }
  }, [history, showOutcome]);

  // 打开登录弹窗
  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  // 关闭登录弹窗
  const handleCloseModal = () => {
    setShowLoginModal(false);
  };

  const handleLoginSuccess = (userInfo: { username: string }) => {
    setIsLoggedIn(true);
    setUser({ name: userInfo.username });
  };
  // 生成随机数
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

  // 匹配结果
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

  // 处理骰子投掷
  const handleDiceRoll = (choice) => {
    const result = rollDice(choice.diceRequired);
    matchOutcome(result, choice.outcomes);
    setShowOutcome(true);
  };

  // 跳转到下一个节点
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

  // 提取表格标题
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

  // 格式化骰子显示文本
  const formatDiceText = (diceRequired) => {
    if (typeof diceRequired === "number") return `d${diceRequired}`;
    if (Array.isArray(diceRequired))
      return `d${diceRequired[0]}-${diceRequired[1]}`;
    return "d2";
  };

  // 解析match为范围文本
  const getRangeText = (match) => {
    if (typeof match === "number") return match.toString();
    if (Array.isArray(match)) return `${match[0]}-${match[1]}`;
    return "";
  };

  // 点击选项选中
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
    <div className="app-container">
      <GlobalStyle />
      {/* 顶部导航栏 */}
      <Header
        user={user}
        isLoggedIn={isLoggedIn}
        onLoginClick={handleLoginClick}
      />
      
      {/* 登录弹窗 */}
      <LoginModal
        visible={showLoginModal}
        onClose={handleCloseModal}
        onSuccess={handleLoginSuccess}
      />
      
      {/* 滚动容器 */}
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

        {/* 当前节点 */}
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
                {/* 判定表格 */}
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

                {/* 投掷按钮 */}
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
    </div>
  );
}

export default App;