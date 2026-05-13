import React, { useState, useEffect, useRef } from 'react';

// KaTeX 로드 함수 (수식 렌더링용)
const loadKaTeX = () => {
  return new Promise((resolve) => {
    if (window.katex) {
      resolve(window.katex);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
    script.onload = () => resolve(window.katex);
    document.head.appendChild(script);
  });
};

// 텍스트 내의 LaTeX 수식을 파싱하여 렌더링하는 컴포넌트
const MessageContent = ({ text }) => {
  if (!window.katex) return <span className="whitespace-pre-wrap">{text}</span>;

  // LaTeX 수식과 **강조** 텍스트를 파싱하기 위한 정규식 추가
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\*\*[\s\S]*?\*\*)/g);

  return (
    <span className="whitespace-pre-wrap text-[15px] leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          try {
            const html = window.katex.renderToString(math, { displayMode: true, throwOnError: false });
            return <div key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-2 text-center overflow-x-auto" />;
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          try {
            const html = window.katex.renderToString(math, { displayMode: false, throwOnError: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        } else if (part.startsWith('**') && part.endsWith('**')) {
          // 마크다운 bold 문법 처리
          const boldText = part.slice(2, -2);
          return <strong key={index} className="font-bold">{boldText}</strong>;
        } else {
          return <span key={index}>{part}</span>;
        }
      })}
    </span>
  );
};

// 시스템 프롬프트: AI의 페르소나와 동작 규칙을 정의합니다.
const SYSTEM_PROMPT = `
너는 목일중학교 2학년 학생들의 수학 모델링 프로젝트를 돕는 친절하고 똑똑한 AI 경제 분석 파트너 '지나(Gina)'야. 
네 목표는 학생들이 매점에서 판매할 간식의 '시장 균형 가격'을 찾기 위해 연립일차방정식을 스스로 세울 수 있도록 돕는 거야. 
중학교 2학년 눈높이에 맞춰 꼭 필요한 경제 개념만 아주 쉽게 설명하고, 친근하고 격려하는 말투를 사용해.

[상황 및 제약 사항]
1. 판매 물품 제한: 학생들이 다루는 물건은 반드시 '간식(과자, 초콜릿, 음료, 사탕, 젤리 등 식사가 아닌 가벼운 음식)'이어야 해. 학생이 간식이 아닌 것을 제안하면, "우와, 그것도 좋지만 이번에는 매점에서 쉬는 시간에 가볍게 즐길 수 있는 '간식' 종류로 다시 골라볼까?"라고 유도해.
2. 수식 및 변수 출력: 수식을 표시할 때는 반드시 LaTeX 문법을 사용해. 특히 문장 속에서 변수(a, b, c, d, x, y)를 언급할 때는 무조건 $a$, $b$, $c$, $d$, $x$, $y$ 처럼 인라인 수식으로 감싸서 출력해.
3. 텍스트 강조: 중요한 용어나 수치 등을 설명할 때는 반드시 **텍스트** 처럼 마크다운 볼드체를 사용하여 강조해.
4. 대화 원칙: 한 번에 모든 것을 묻지 마. 반드시 한 번에 하나의 변수씩 질문하고 학생의 대답을 들어. 네가 먼저 임의의 숫자를 정답처럼 제시하지 마.
5. "모르겠어" 대응 (중요): 학생이 "모른다", "글쎄", "어려워" 등으로 대답하면 절대 단번에 값을 제시하지 마. 대신 구체적인 예시(예: "이 초콜릿이 평소 1000원이었는데 1100원이 된다면, 평소 사 먹던 친구 10명 중 몇 명이나 안 사 먹을까?")와 그 상황에 대한 설명을 제시하며 학생이 감을 잡고 다시 정해보도록 유도해.
6. 연립방정식 해의 조건 및 마무리 멘트 (매우 중요):
   - 네가 $a$, $b$, $c$, $d$ 값을 최종 제안할 때, 시장 균형 가격 $x$는 100원 단위의 자연수, 판매 수량 $y$는 50 이상의 자연수가 되도록 내부적으로 계산해서 수치를 미세 조정해.
   - 단, 마지막에 학생에게 안내할 때 "계산이 딱 떨어져서~" 혹은 "계산을 위해~" 같은 표현은 절대 쓰지 마. 반드시 "우리가 정한 값들을 바탕으로, 현실적인 개수와 가격이 형성되도록 내가 수치를 조금 조정해봤어!"라고 말해.
   - 최종 연립방정식을 보여주기 직전에, 학생들이 한눈에 알 수 있도록 우리가 정한 변수의 최종 값을 글머리 기호(bullet points)로 깔끔하게 요약해서 먼저 제시해줘. 이때 반드시 각 변수와 값을 LaTeX 수식을 사용하여 명확히 출력해. (예시: - **가격 민감도**: $a = 2$, - **잠재적 수요량**: $c = 5000$)
   - 최종 연립방정식은 LaTeX 디스플레이 모드($$ ... $$)를 사용하여 묶어서 보여주되, 첫 번째 식(수요 방정식)은 $ax + y - c = 0$ 꼴로, 두 번째 식(공급 방정식)은 $-bx + y = d$ 꼴(상수항이 우변에 있는 꼴)로 표현해. 
     (예시: $$ \begin{cases} 2x + y - 5000 = 0 \\ -3x + y = 1000 \end{cases} $$)

[대화 진행 순서] (이 순서를 반드시 지켜!)
- Step 1: 학생이 간식을 정하면 가격 민감도($a$)를 설명해. "가격이 100원 오를 때 수요량이 몇 개나 줄어들지" 물어봐. 학생이 "200개"라고 하면, 가격이 1원 오를 때는 2개가 줄어드는 것이므로 $a=2$가 됨을 자연스럽게 알려주고 합의해.
- Step 2: 잠재적 수요량($c$) 설명하고 질문. (공짜일 때 원하는 총 수량)
- Step 3: 생산 효율성($b$) 설정. "가격이 100원 오를 때 학생회가 몇 개나 더 구해올 수 있을지" 물어봐. 학생 대답을 바탕으로 1원당 변화량인 $b$ 값을 도출해줘.
- Step 4: 최소 생산 목표($d$) 설명하고 질문. (가격과 상관없이 무조건 갖춰야 할 기본 재고량)
- Step 5: $a, b, c, d$가 모두 정해지면 (해 조건에 맞게 수치를 현실적으로 조정한 뒤), 먼저 4가지 변수 값들을 한눈에 알기 쉽게 정리해서 보여주고, 최종 연립방정식을 예쁘게 제시한 뒤 학생 스스로 $x$(가격), $y$(수량)를 구해보라고 격려하며 대화를 마무리해.
`;

export default function App() {
  const [messages, setMessages] = useState([
    { 
      role: 'model', 
      text: "안녕! 나는 목일중학교 매점 프로젝트를 함께할 AI 파트너 '지나(Gina)'야! 만나서 반가워. 😊\n\n우리가 세울 매점에서는 어떤 '간식'을 팔면 좋을까? 네가 생각한 매점 최고의 간식을 하나 알려줘!" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [katexLoaded, setKatexLoaded] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    loadKaTeX().then(() => setKatexLoaded(true));
  }, []);

  // 스크롤을 항상 최하단으로 유지 (화면 전체가 들썩이는 현상 수정)
  const scrollToBottom = () => {
    // 수식 렌더링 등으로 인한 DOM 변화 후 스크롤되도록 지연 시간 추가
    setTimeout(() => {
      if (mainRef.current) {
        mainRef.current.scrollTo({
          top: mainRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const callGeminiAPI = async (chatHistory) => {
    const apiKey = ""; // API 키는 환경에서 자동 제공됨
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // API가 요구하는 형식으로 메시지 히스토리 변환
    const formattedContents = chatHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const payload = {
      contents: formattedContents,
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      }
    };

    let retries = 5;
    let delay = 1000;

    while (retries > 0) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('API Request Failed');
        
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "앗, 잠깐 생각이 꼬였어. 다시 한번 말해줄래?";
      } catch (error) {
        retries--;
        if (retries === 0) return "미안해, 지금 네트워크 연결이 조금 불안정한 것 같아. 잠시 후 다시 시도해줄래? 😢";
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    // 사용자 메시지 추가
    const newMessages = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    // AI 응답 호출
    const aiResponse = await callGeminiAPI(newMessages);
    
    // AI 메시지 추가
    setMessages(prev => [...prev, { role: 'model', text: aiResponse }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-orange-50 font-sans">
      {/* Header */}
      <header className="bg-orange-400 text-white p-4 shadow-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">
            🍪
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">AI 파트너 '지나'</h1>
            <p className="text-orange-100 text-xs">목일중학교 매점 창업 프로젝트</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main ref={mainRef} className="flex-1 overflow-y-auto p-4 pb-12 space-y-4">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-orange-300 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                🤖
              </div>
            )}
            <div 
              className={`max-w-[75%] p-3 rounded-2xl shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-yellow-400 text-yellow-950 rounded-tr-sm whitespace-pre-wrap' 
                  : 'bg-white text-gray-800 rounded-tl-sm border border-orange-100'
              }`}
            >
              <MessageContent text={msg.text} />
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-orange-300 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
              🤖
            </div>
            <div className="max-w-[75%] p-4 rounded-2xl bg-white text-gray-500 rounded-tl-sm border border-orange-100 flex gap-1 items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="bg-white p-3 border-t border-orange-200">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="지나에게 메시지 보내기..."
            className="flex-1 bg-orange-50 border border-orange-200 rounded-full px-4 py-3 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all text-sm"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5 font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            전송
          </button>
        </form>
      </footer>
    </div>
  );
}
