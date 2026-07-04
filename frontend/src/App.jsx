import { useState } from 'react';

import ChatView from './components/ChatView.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useChat } from './hooks/useChat.js';

export default function App() {
  const chat = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectAndClose = (id) => {
    chat.selectSession(id);
    setSidebarOpen(false);
  };

  const newAndClose = () => {
    chat.newChat();
    setSidebarOpen(false);
  };

  return (
    <div className="app">
      <Sidebar
        sessions={chat.sessions}
        activeId={chat.activeId}
        busy={chat.busy}
        open={sidebarOpen}
        onSelect={selectAndClose}
        onNew={newAndClose}
      />
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}
      <ChatView chat={chat} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
    </div>
  );
}
