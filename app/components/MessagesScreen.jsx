'use client';
import { useState } from 'react';
import ChatScreen from './ChatScreen';
import Header from './Header';

const conversations = [
  { id: '1', username: 'Léa Moreau', handle: '@leamorphoto', last: 'Ok top, on se retrouve à Oberkampf !', time: '14:32', unread: 2 },
  { id: '2', username: 'Marcus D.', handle: '@marcusdvideo', last: "T'as du matos pour shooter en basse lumière ?", time: '11:15', unread: 0 },
  { id: '3', username: 'Yanis R.', handle: '@yanisreel', last: 'Proposition de collab envoyée ⚡', time: 'Hier', unread: 0 },
];

export default function MessagesScreen({ theme }) {
  const [activeBuddy, setActiveBuddy] = useState(null);
  const darkMode = theme?.dark ?? true;
  const subText = darkMode ? '#666' : '#888';
  const avatarBg = darkMode ? '#2C2C2C' : '#CCC';

  if (activeBuddy) return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: theme?.bg }}>
      <ChatScreen buddy={activeBuddy} onBack={() => setActiveBuddy(null)} />
    </div>
  );

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color }}>
      <Header theme={theme} />
      <div style={{ padding: '24px 16px 100px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', color: theme?.color }}>Messages</h2>
        <p style={{ color: subText, fontSize: '13px', marginBottom: '20px' }}>Tes conversations</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {conversations.map(c => (
            <div key={c.id} onClick={() => setActiveBuddy(c)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 12px', borderRadius: '12px', cursor: 'pointer' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>◉</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '15px', color: theme?.color }}>{c.username}</span>
                  <span style={{ color: subText, fontSize: '11px' }}>{c.time}</span>
                </div>
                <div style={{ color: subText, fontSize: '13px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last}</div>
              </div>
              {c.unread > 0 && (
                <div style={{ background: '#FF4D4D', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{c.unread}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}