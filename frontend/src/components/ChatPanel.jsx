import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Send, Square } from 'lucide-react';
import AnalysisPanel from './AnalysisPanel';
import { analyzeDocument, getAnalysis } from '../api/api';
import './ChatPanel.css';

export default function ChatPanel({ messages, input, loading, onInputChange, onSend, onStop, chatId }) {
  const [tab, setTab] = useState('chat');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const messagesEndRef = useRef();
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setAnalysis(null);
    getAnalysis(chatId).then(setAnalysis).catch(() => {});
  }, [chatId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (!e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    }
  };

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
            {messages.length === 0 ? (
              <div className="chat-empty-state">
                <Sparkles size={32} className="chat-empty-icon" />
                <h3>Ask a question to begin</h3>
                <p>Query the document, request key clauses, or look up specific sections.</p>
                <div className="quick-queries">
                  <button className="quick-query-pill" onClick={() => onSend("Summarize the document")}>
                    "Summarize the document"
                  </button>
                  <button className="quick-query-pill" onClick={() => onSend("Explain Page 4")}>
                    "Explain Page 4"
                  </button>
                  <button className="quick-query-pill" onClick={() => onSend("What are the key obligations or liabilities?")}>
                    "What are the key obligations or liabilities?"
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isLast = i === messages.length - 1;
                const isThinking = msg.role === 'ai' && isLast && loading && msg.text === '';
                const isStreaming = msg.role === 'ai' && isLast && loading && msg.text !== '';

                return (
                  <div
                    key={`${i}-${msg.role}`}
                    className={`${msg.role === 'user' ? 'user-msg' : 'ai-msg'} ${isStreaming ? 'streaming' : ''}`}
                  >
                    {isThinking ? (
                      <div className="status-indicator">
                        <div className="typing-dots">
                          <span></span><span></span><span></span>
                        </div>
                        <span className="status-text">{msg.status || 'Thinking...'}</span>
                      </div>
                    ) : msg.role === 'ai' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    ) : (
                      msg.text
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-row">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Ask about the document..."
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            {loading ? (
              <button className="send-btn send-btn--stop" onClick={onStop}>
                <Square size={10} fill="currentColor" stroke="none" />
              </button>
            ) : (
              <button className="send-btn" onClick={() => onSend()} disabled={!input.trim()}>
                <Send size={16} />
              </button>
            )}
          </div>
        </>
      ) : (
        <AnalysisPanel analysis={analysis} loading={analyzing} onAnalyze={handleAnalyze} />
      )}
    </div>
  );
}