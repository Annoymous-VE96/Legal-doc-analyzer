import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadPDF, fetchHistory, fetchMessages, logoutUser, deleteChat, deleteAllChats, renameChat, deleteAccount } from '../api/api';
import Sidebar from '../components/Sidebar';
import PDFViewer from '../components/PDFViewer';
import ChatPanel from '../components/ChatPanel';
import './ChatPage.css';

export default function ChatPage() {
  const navigate = useNavigate();
  const fileRef = useRef();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [username, setUsername] = useState('');
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory()
      .then((data) => {
        setChats(data.chats);
        setUsername(data.username);
      })
      .catch(() => navigate('/'));
  }, [navigate]);

  const handleSelectChat = async (chat) => {
    setActiveChatId(chat.id);
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
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setLoading(true);
    try {
      const newChat = await uploadPDF(file);
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setActiveChat({
        id: newChat.id,
        name: newChat.name,
        pdfUrl: URL.createObjectURL(file),
        messages: [{ role: 'ai', text: `Document "${file.name}" uploaded. Ask me anything about it!` }],
      });
    } catch (err) {
      alert('Upload failed: ' + (err.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (overrideText) => {
    const userText = typeof overrideText === 'string' ? overrideText : input;
    if (!userText.trim() || !activeChatId || loading) return;
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
    try {
      const authToken = localStorage.getItem('token');
      const res = await fetch(`https://Annoymous0409-LexAI.hf.space/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content: userText }),
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

          setActiveChat((prev) => {
            const msgs = [...prev.messages];
            msgs[msgs.length - 1] = {
              ...msgs[msgs.length - 1],
              text: msgs[msgs.length - 1].text + chunk,
            };
            return { ...prev, messages: msgs };
          });
        }
      }

      // ✅ Force re-render after stream completes
      setActiveChat((prev) => ({ ...prev, messages: [...prev.messages] }));

    } catch (err) {
      console.error('Stream error:', err);
      setActiveChat((prev) => {
        const msgs = [...prev.messages];
        msgs[msgs.length - 1] = { role: 'ai', text: '⚠️ Failed to get response. Try again.' };
        return { ...prev, messages: msgs };
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) { setActiveChatId(null); setActiveChat(null); }
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

  return (
    <div className="page-wrapper">
      {sidebarOpen ? (
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          username={username}
          onSelectChat={handleSelectChat}
          onNewChat={() => { setActiveChatId(null); setActiveChat(null); fileRef.current.click(); }}
          onLogout={() => { logoutUser(); navigate('/'); }}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onDeleteAllChats={handleDeleteAllChats}
          onDeleteAccount={handleDeleteAccount}
          onClose={() => setSidebarOpen(false)}
        />
      ) : (
        <button className="open-sidebar-btn" onClick={() => setSidebarOpen(true)}>☰</button>
      )}

      <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} />

      <div className="main">
        {!activeChat ? (
          <div className="upload-screen">
            <p className="upload-icon">📄</p>
            <h2 className="upload-title">Upload a Legal Document</h2>
            <p className="upload-sub">PDF format supported</p>
            <button className="upload-btn" onClick={() => fileRef.current.click()} disabled={loading}>
              {loading ? 'Uploading...' : 'Choose File'}
            </button>
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
            />
          </div>
        )}
      </div>
    </div>
  );
}