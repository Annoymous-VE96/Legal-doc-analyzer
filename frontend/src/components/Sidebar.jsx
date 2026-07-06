import React, { useState, useRef, useEffect } from 'react';
import './Sidebar.css';

function ChatItem({ chat, isActive, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(chat.name);

  const handleRename = (e) => {
    e.stopPropagation();
    if (editing) {
      if (name.trim() && name !== chat.name) onRename(chat.id, name.trim());
      setEditing(false);
    } else {
      setEditing(true);
    }
  };

  return (
    <div
      className={`sidebar-chat-item ${isActive ? 'active' : ''}`}
      onClick={() => !editing && onSelect(chat)}
    >
      <span className="chat-icon">📄</span>

      {editing ? (
        <input
          className="chat-rename-input"
          value={name}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename(e);
            if (e.key === 'Escape') { setEditing(false); setName(chat.name); }
          }}
        />
      ) : (
        <span className="chat-name">{chat.name}</span>
      )}

      <button className="chat-rename-btn" onClick={handleRename} title={editing ? 'Save' : 'Rename'}>
        {editing ? '✓' : '✏️'}
      </button>
      <button
        className="chat-delete-btn"
        onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}
        title="Delete"
      >✕</button>
    </div>
  );
}

export default function Sidebar({
  chats,
  activeChatId,
  username,
  onSelectChat,
  onNewChat,
  onLogout,
  onDeleteChat,
  onRenameChat,
  onDeleteAllChats,
  onDeleteAccount,
  onClose,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="sidebar">
      {/* Top: Close + New Chat */}
      <div className="sidebar-top">
        <button className="sidebar-close" onClick={onClose} title="Close sidebar">✕</button>
        <button className="new-chat-btn" onClick={onNewChat}>
          <span>＋</span> New Chat
        </button>
      </div>

      {/* Chat History */}
      <div className="sidebar-history">
        <p className="sidebar-section-label">Recents</p>
        {chats.length === 0 && <p className="sidebar-empty">No chats yet</p>}
        {chats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={activeChatId === chat.id}
            onSelect={onSelectChat}
            onDelete={onDeleteChat}
            onRename={onRenameChat}
          />
        ))}
      </div>

      {/* Bottom: User Menu */}
      <div className="sidebar-bottom" ref={menuRef}>
        {menuOpen && (
          <div className="user-floating-menu">
            <button onClick={() => { onDeleteAllChats(); setMenuOpen(false); }}>
              🗑️ Delete All Chats
            </button>
            <button onClick={() => { onDeleteAccount(); setMenuOpen(false); }}>
              ⚠️ Delete Account
            </button>
            <button className="logout-option" onClick={() => { onLogout(); setMenuOpen(false); }}>
              ↩ Logout
            </button>
          </div>
        )}
        <button className="user-pill" onClick={() => setMenuOpen((p) => !p)}>
          <span className="user-avatar">{username?.[0]?.toUpperCase() || '?'}</span>
          <span className="user-name">{username || 'User'}</span>
          <span className="user-chevron">{menuOpen ? '▾' : '▴'}</span>
        </button>
      </div>
    </div>
  );
}