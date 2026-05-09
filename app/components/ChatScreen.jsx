'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

export default function ChatScreen({ buddy, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [user, setUser] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  async function sendMessage() {
    if (!text.trim()) return;
    const newMsg = { id: Date.now(), content: text, sender_id: user?.id };
    setMessages(prev => [...prev, newMsg]);
    setText('');
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0A0A0A' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2C2C2C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◉</div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px' }}>{buddy?.username}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>{buddy?.handle}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 && <p style={{ color: '#444', textAlign: 'center', marginTop: '40px' }}>Commence la conversation !</p>}
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: '18px', background: 'white', color: 'black', fontSize: '14px' }}>{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

<div style={{ padding: '12px 16px 34px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Message..."
          style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '14px' }}
        />
        <button onClick={sendMessage} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: 'none', fontSize: '18px', cursor: 'pointer' }}>↑</button>
      </div>
    </div>
  );
}