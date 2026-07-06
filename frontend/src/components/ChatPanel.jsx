import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ChatPanel.css';

export default function ChatPanel({ messages, input, loading, onInputChange, onSend }) {
  const messagesEndRef = useRef();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-panel">
      <div className="messages">
        {messages.map((msg, i) => {
          const isStreaming = msg.role === 'ai' && i === messages.length - 1 && loading;
          return (
            <div
              key={`${i}-${msg.text.length}`}
              className={`${msg.role === 'user' ? 'user-msg' : 'ai-msg'} ${isStreaming ? 'streaming' : ''}`}
            >
              {msg.role === 'ai'
                ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                : msg.text
              }
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-row">
        <input
          className="chat-input"
          placeholder="Ask about the document..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          disabled={loading}
        />
        <button className="send-btn" onClick={onSend} disabled={loading}>→</button>
      </div>
    </div>
  );
}