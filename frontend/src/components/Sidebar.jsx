import React, { useState, useRef, useEffect } from 'react';
import './Sidebar.css';

function ChatItem({ chat, isActive, onSelect, onDelete, onRename, onTogglePin }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(chat.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const itemMenuRef = useRef();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (itemMenuRef.current && !itemMenuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const startRename = (e) => {
    e.stopPropagation();
    setEditing(true);
    setMenuOpen(false);
  };

  const confirmRename = (e) => {
    e.stopPropagation();
    if (name.trim() && name !== chat.name) onRename(chat.id, name.trim());
    setEditing(false);
  };

  return (
    <div
      className={`sidebar-chat-item ${isActive ? 'active' : ''}`}
      onClick={() => !editing && onSelect(chat)}
    >
      <span className="chat-icon">{chat.pinned ? '📌' : '📄'}</span>

      {editing ? (
        <input
          className="chat-rename-input"
          value={name}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirmRename(e);
            if (e.key === 'Escape') { setEditing(false); setName(chat.name); }
          }}
          onBlur={confirmRename}
        />
      ) : (
        <span className="chat-name">{chat.name}</span>
      )}

      {!editing && (
        <div className="chat-item-menu" ref={itemMenuRef}>
          <button
            className="chat-menu-btn"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
            title="More options"
          >
            ⋯
          </button>

          {menuOpen && (
            <div className="chat-item-dropdown">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(chat.id);
                  setMenuOpen(false);
                }}
              >
                {chat.pinned ? '📍 Unpin' : '📌 Pin'}
              </button>
              <button onClick={startRename}>
                ✏️ Rename
              </button>
              <button
                className="chat-item-delete-option"
                onClick={(e) => { e.stopPropagation(); onDelete(chat.id); setMenuOpen(false); }}
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  chats,
  activeChatId,
  username,
  historyLoading = false,
  onSelectChat,
  onNewChat,
  onLogout,
  onDeleteChat,
  onRenameChat,
  onTogglePinChat,
  onDeleteAllChats,
  onDeleteAccount,
  onClose,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
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

  const pinnedChats = chats.filter((c) => Boolean(c.pinned));
  const recentChats = chats.filter((c) => !c.pinned);

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
        {historyLoading ? (
          <div className="sidebar-skeleton-wrapper">
            <div className="sidebar-skeleton-item" />
            <div className="sidebar-skeleton-item" />
            <div className="sidebar-skeleton-item" />
          </div>
        ) : (
          <>
            {chats.length === 0 && <p className="sidebar-empty">No chats yet</p>}

            {/* Pinned Section (Only if pinnedChats.length > 0) */}
            {pinnedChats.length > 0 && (
          <div className="sidebar-section pinned-section">
            <button
              className="sidebar-section-header"
              onClick={() => setPinnedExpanded((p) => !p)}
            >
              <span className="sidebar-section-title">📌 PINNED ({pinnedChats.length})</span>
              <span className="sidebar-section-chevron">{pinnedExpanded ? '▾' : '▸'}</span>
            </button>
            {pinnedExpanded && (
              <div className="sidebar-section-content">
                {pinnedChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChatId === chat.id}
                    onSelect={onSelectChat}
                    onDelete={onDeleteChat}
                    onRename={onRenameChat}
                    onTogglePin={onTogglePinChat}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recents Section */}
        {chats.length > 0 && (
          <div className="sidebar-section">
            <p className="sidebar-section-label">Recents</p>
            {recentChats.length === 0 ? (
              <p className="sidebar-empty">No recent chats</p>
            ) : (
              recentChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeChatId === chat.id}
                  onSelect={onSelectChat}
                  onDelete={onDeleteChat}
                  onRename={onRenameChat}
                  onTogglePin={onTogglePinChat}
                />
              ))
            )}
          </div>
        )}
          </>
        )}
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