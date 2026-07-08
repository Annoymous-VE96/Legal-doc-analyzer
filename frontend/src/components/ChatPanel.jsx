import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AnalysisPanel from './AnalysisPanel';
import { analyzeDocument, getAnalysis } from '../api/api';
import './ChatPanel.css';

export default function ChatPanel({ messages, input, loading, onInputChange, onSend, chatId }) {
  const [tab, setTab] = useState('chat');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const messagesEndRef = useRef();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setAnalysis(null);
    getAnalysis(chatId).then(setAnalysis).catch(() => {});
  }, [chatId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeDocument(chatId);
      setAnalysis(result);
    } catch (err) {
      alert('Analysis failed: ' + (err.detail || 'Unknown error'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="chat-panel">
      <div className="tab-bar">
        <button className={tab === 'chat' ? 'tab active' : 'tab'} onClick={() => setTab('chat')}>Chat</button>
        <button className={tab === 'analysis' ? 'tab active' : 'tab'} onClick={() => setTab('analysis')}>Analysis</button>
      </div>

      {tab === 'chat' ? (
        <>
          <div className="messages">
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1;
              const isThinking = msg.role === 'ai' && isLast && loading && msg.text === '';
              const isStreaming = msg.role === 'ai' && isLast && loading && msg.text !== '';

              return (
                <div
                  key={`${i}-${msg.text.length}`}
                  className={`${msg.role === 'user' ? 'user-msg' : 'ai-msg'} ${isStreaming ? 'streaming' : ''}`}
                >
                  {isThinking ? (
                    <div className="typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                  ) : msg.role === 'ai' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-row">
            <input className="chat-input" placeholder="Ask about the document..." value={input}
              onChange={(e) => onInputChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSend()} disabled={loading} />
            <button className="send-btn" onClick={onSend} disabled={loading}>→</button>
          </div>
        </>
      ) : (
        <AnalysisPanel analysis={analysis} loading={analyzing} onAnalyze={handleAnalyze} />
      )}
    </div>
  );
}