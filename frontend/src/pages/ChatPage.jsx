import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function ChatPage() {
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [chatHistory] = useState(['Contract Review - April', 'NDA Analysis', 'Terms of Service']);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const fileRef = useRef();

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPdfName(file.name);
    setPdfUrl(URL.createObjectURL(file));
    setMessages([{ role: 'ai', text: `Document "${file.name}" uploaded. Ask me anything about it!` }]);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: input },
      { role: 'ai', text: '(AI response coming soon — backend not connected yet)' },
    ]);
    setInput('');
  };

  return (
    <div style={styles.wrapper}>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo}>⚖️ LexAI</div>
        <button style={styles.newChat} onClick={() => { setPdfUrl(null); setMessages([]); }}>
          + New Chat
        </button>
        <p style={styles.historyLabel}>Recent</p>
        {chatHistory.map((item, i) => (
          <div key={i} style={styles.historyItem}>{item}</div>
        ))}
        <div style={styles.sidebarBottom}>
          <button style={styles.logoutBtn} onClick={() => navigate('/')}>Logout</button>
        </div>
      </div>

      {/* Main area */}
      <div style={styles.main}>

        {!pdfUrl ? (
          // Upload screen
          <div style={styles.uploadScreen}>
            <p style={styles.uploadIcon}>📄</p>
            <h2 style={styles.uploadTitle}>Upload a Legal Document</h2>
            <p style={styles.uploadSub}>PDF format supported</p>
            <button style={styles.uploadBtn} onClick={() => fileRef.current.click()}>
              Choose File
            </button>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} />
          </div>
        ) : (
          // PDF + Chat layout
          <div style={styles.docChatLayout}>

            {/* Left — PDF Viewer */}
            <div style={styles.pdfPanel}>
              <div style={styles.pdfHeader}>
                <span style={styles.pdfName}>📄 {pdfName}</span>
                <button style={styles.changeDoc} onClick={() => fileRef.current.click()}>Change</button>
                <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} />
              </div>
              <iframe src={pdfUrl} style={styles.pdfFrame} title="PDF Viewer" />
            </div>

            {/* Right — Chat */}
            <div style={styles.chatPanel}>
              <div style={styles.messages}>
                {messages.map((msg, i) => (
                  <div key={i} style={msg.role === 'user' ? styles.userMsg : styles.aiMsg}>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div style={styles.inputRow}>
                <input
                  style={styles.chatInput}
                  placeholder="Ask about the document..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button style={styles.sendBtn} onClick={handleSend}>→</button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    height: '100vh',
    background: '#0d0d0d',
    color: '#ececec',
    fontFamily: 'Georgia, serif',
    overflow: 'hidden',
  },

  // Sidebar
  sidebar: {
    width: '240px',
    minWidth: '240px',
    background: '#111',
    borderRight: '1px solid #1e1e1e',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.2rem 1rem',
    gap: '0.5rem',
  },
  sidebarLogo: {
    fontSize: '1.2rem',
    color: '#c9a84c',
    fontWeight: 'bold',
    marginBottom: '0.8rem',
  },
  newChat: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    color: '#ececec',
    padding: '0.6rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    textAlign: 'left',
  },
  historyLabel: {
    color: '#555',
    fontSize: '0.75rem',
    margin: '0.8rem 0 0.3rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  historyItem: {
    color: '#888',
    fontSize: '0.85rem',
    padding: '0.5rem 0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sidebarBottom: {
    marginTop: 'auto',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #333',
    color: '#888',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    fontSize: '0.85rem',
  },

  // Main
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },

  // Upload screen
  uploadScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  },
  uploadIcon: { fontSize: '3rem', margin: 0 },
  uploadTitle: { fontSize: '1.5rem', margin: 0 },
  uploadSub: { color: '#666', margin: 0, fontSize: '0.9rem' },
  uploadBtn: {
    background: '#c9a84c',
    border: 'none',
    color: '#0d0d0d',
    padding: '0.7rem 2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },

  // PDF + Chat
  docChatLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  pdfPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #1e1e1e',
  },
  pdfHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.8rem 1rem',
    borderBottom: '1px solid #1e1e1e',
    background: '#111',
  },
  pdfName: { color: '#c9a84c', fontSize: '0.85rem', flex: 1 },
  changeDoc: {
    background: 'transparent',
    border: '1px solid #333',
    color: '#888',
    padding: '0.3rem 0.8rem',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  pdfFrame: {
    flex: 1,
    border: 'none',
    background: '#1a1a1a',
    width: '100%',
    height: '100%',
  },

  // Chat
  chatPanel: {
    width: '380px',
    minWidth: '380px',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f0f0f',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  aiMsg: {
    background: '#1a1a1a',
    border: '1px solid #222',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    color: '#ccc',
    fontSize: '0.88rem',
    maxWidth: '90%',
    lineHeight: 1.6,
  },
  userMsg: {
    background: '#c9a84c22',
    border: '1px solid #c9a84c44',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    color: '#ececec',
    fontSize: '0.88rem',
    maxWidth: '90%',
    alignSelf: 'flex-end',
    lineHeight: 1.6,
  },
  inputRow: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem',
    borderTop: '1px solid #1e1e1e',
  },
  chatInput: {
    flex: 1,
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '0.65rem 1rem',
    color: '#ececec',
    fontSize: '0.88rem',
    outline: 'none',
  },
  sendBtn: {
    background: '#c9a84c',
    border: 'none',
    color: '#0d0d0d',
    padding: '0.65rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
};

export default ChatPage;