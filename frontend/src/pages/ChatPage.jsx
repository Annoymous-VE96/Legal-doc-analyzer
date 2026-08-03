import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud } from 'lucide-react';
import { uploadPDF, fetchHistory, fetchMessages, logoutUser, deleteChat, deleteAllChats, renameChat, deleteAccount, togglePinChat } from '../api/api';
import Sidebar from '../components/Sidebar';
import PDFViewer from '../components/PDFViewer';
import ChatPanel from '../components/ChatPanel';
import './ChatPage.css';

const BASE_URL = process.env.REACT_APP_API_URL;

export default function ChatPage() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const abortControllerRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [username, setUsername] = useState('');
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(() => localStorage.getItem('activeChatId') || null);
  const [activeChat, setActiveChat] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  const handleSelectChat = useCallback(async (chat) => {
    setActiveChatId(chat.id);
    localStorage.setItem('activeChatId', chat.id);
    setLoading(true);
    try {
      const data = await fetchMessages(chat.id);
      setActiveChat({
        id: chat.id,
        name: chat.name,
        pdfUrl: data.pdf_path,
        messages: data.messages.map((m) => ({ role: m.role === 'AI' ? 'ai' : 'user', text: m.message })),
      });
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory()
      .then((data) => {
        setChats(data.chats);
        setUsername(data.username);
        
        const storedChatId = localStorage.getItem('activeChatId');
        if (storedChatId && data.chats.length > 0) {
          const found = data.chats.find((c) => String(c.id) === String(storedChatId));
          if (found) {
            handleSelectChat(found);
          } else {
            setActiveChatId(null);
            localStorage.removeItem('activeChatId');
          }
        } else {
          setActiveChatId(null);
          localStorage.removeItem('activeChatId');
        }
      })
      .catch(() => navigate('/'))
      .finally(() => setHistoryLoading(false));
  }, [navigate, handleSelectChat]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    // Create client-side object URL instantly (0ms delay)
    const clientPdfUrl = URL.createObjectURL(file);
    const tempId = 'temp_' + Date.now();

    // Optimistically show the workspace immediately
    setActiveChatId(tempId);
    setActiveChat({
      id: tempId,
      name: file.name,
      pdfUrl: clientPdfUrl,
      messages: [{ role: 'ai', text: `Document "${file.name}" uploaded. Ask me anything about it!` }],
    });

    try {
      const newChat = await uploadPDF(file);
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      localStorage.setItem('activeChatId', newChat.id);
      setActiveChat((prev) => (prev && prev.id === tempId ? { ...prev, id: newChat.id } : prev));
    } catch (err) {
      alert('Upload failed: ' + (err.detail || 'Unknown error'));
      setActiveChat(null);
      setActiveChatId(null);
    }
  };

  // ── handleSend with client-side typing effect ──
  const handleSend = async (overrideText) => {
    const userText = typeof overrideText === 'string' ? overrideText : input;
    if (!userText.trim() || !activeChatId) return;
    setInput('');

    setActiveChat((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        { role: 'user', text: userText },
        { role: 'ai', text: '' },
      ],
    }));

    setLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Typing queue: decouples network arrival speed from display speed
    let queue = '';
    let typingActive = false;

    const typeNextChar = () => {
      if (queue.length === 0) { typingActive = false; return; }
      typingActive = true;
      const char = queue[0];
      queue = queue.slice(1);

      setActiveChat((prev) => {
        const msgs = [...prev.messages];
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          text: msgs[msgs.length - 1].text + char,
        };
        return { ...prev, messages: msgs };
      });

      setTimeout(typeNextChar, 15); // typing speed — tweak 10-25ms
    };

    const enqueue = (text) => {
      queue += text;
      if (!typingActive) typeNextChar();
    };

    try {
      const authToken = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content: userText }),
        signal: controller.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value);
        const lines = raw.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const chunk = line.replace('data: ', '');
          if (chunk === '[DONE]') break;
          enqueue(chunk);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
        setActiveChat((prev) => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'ai') {
            msgs[msgs.length - 1] = {
              ...lastMsg,
              text: lastMsg.text + ' 🛑 *[Generation Interrupted]*',
            };
          }
          return { ...prev, messages: msgs };
        });
        return;
      }
      console.error('Stream error:', err);
      setActiveChat((prev) => {
        const msgs = [...prev.messages];
        msgs[msgs.length - 1] = { role: 'ai', text: '⚠️ Failed to get response. Try again.' };
        return { ...prev, messages: msgs };
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setActiveChat(null);
        localStorage.removeItem('activeChatId');
      }
    } catch (err) {
      alert('Delete failed: ' + (err.detail || 'Unknown error'));
    }
  };

  const handleDeleteAllChats = async () => {
    try {
      await deleteAllChats();
      setChats([]);
      setActiveChatId(null);
      setActiveChat(null);
      localStorage.removeItem('activeChatId');
    } catch (err) {
      alert('Failed: ' + (err.detail || 'Unknown error'));
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account? This cannot be undone.')) return;
    try {
      await deleteAccount();
      localStorage.removeItem('token');
      navigate('/');
    } catch (err) {
      console.log('Error:', err);
      alert('Failed to delete account: ' + JSON.stringify(err));
    }
  };

  const handleRenameChat = async (chatId, newName) => {
    try {
      await renameChat(chatId, newName);
      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, name: newName } : c));
      if (activeChatId === chatId) setActiveChat((prev) => ({ ...prev, name: newName }));
    } catch (err) {
      alert('Rename failed: ' + (err.detail || 'Unknown error'));
    }
  };

  const handleTogglePinChat = async (chatId) => {
    // Instant optimistic UI update
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, pinned: !c.pinned } : c))
    );
    try {
      const res = await togglePinChat(chatId);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, pinned: Boolean(res.pinned) } : c))
      );
    } catch (err) {
      // Revert state if backend request fails
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, pinned: !c.pinned } : c))
      );
      alert('Failed to pin/unpin chat: ' + (err.detail || 'Unknown error'));
    }
  };

  return (
    <div className="page-wrapper">
      {sidebarOpen ? (
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          username={username}
          historyLoading={historyLoading}
          onSelectChat={handleSelectChat}
          onNewChat={() => { setActiveChatId(null); setActiveChat(null); localStorage.removeItem('activeChatId'); fileRef.current.click(); }}
          onLogout={() => { logoutUser(); localStorage.removeItem('activeChatId'); navigate('/'); }}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onTogglePinChat={handleTogglePinChat}
          onDeleteAllChats={handleDeleteAllChats}
          onDeleteAccount={handleDeleteAccount}
          onClose={() => setSidebarOpen(false)}
        />
      ) : (
        <button className="open-sidebar-btn" onClick={() => setSidebarOpen(true)}>☰</button>
      )}

      <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} />

      <div className="main">
        {activeChatId && !activeChat ? (
          <div className="doc-chat-layout">
            <div className="pdf-panel">
              <div className="pdf-header">
                <div className="pdf-name">Loading legal document...</div>
              </div>
              <div className="pdf-scroll-area">
                <div className="pdf-loading">Loading document viewer...</div>
              </div>
            </div>
            <div className="chat-panel">
              <div className="tab-bar">
                <button className="tab active">Chat</button>
                <button className="tab">Analysis</button>
              </div>
              <div className="messages">
                <div className="ai-msg">
                  <div className="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
              <div className="input-row">
                <input className="chat-input" placeholder="Preparing workspace..." disabled />
                <button className="send-btn" disabled>→</button>
              </div>
            </div>
          </div>
        ) : !activeChat ? (
          <div className="upload-screen">
            <div className="upload-icon-container" onClick={() => !loading && fileRef.current.click()}>
              <UploadCloud size={48} className="upload-cloud-icon" />
              <h3>{loading ? 'Uploading contract...' : 'Upload a Legal Document'}</h3>
              <p>{loading ? 'Please wait while parsing semantic nodes...' : 'Drag & drop contracts here or click to browse'}</p>
              <span className="upload-format-hint">PDF format supported</span>
            </div>
          </div>
        ) : (
          <div className="doc-chat-layout">
            <PDFViewer
              pdfUrl={activeChat.pdfUrl}
              chatName={activeChat.name}
              onChangePdf={() => fileRef.current.click()}
              onAutoSend={handleSend}
              onPrefillInput={setInput}
            />
            <ChatPanel
              messages={activeChat.messages}
              input={input}
              loading={loading}
              onInputChange={setInput}
              onSend={handleSend}
              onStop={handleStopGeneration}
              chatId={activeChatId}
            />
          </div>
        )}
      </div>
    </div>
  );
}