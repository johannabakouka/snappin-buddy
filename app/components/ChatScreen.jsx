'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

export default function ChatScreen({ buddy, onBack, theme }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [user, setUser] = useState(null);
  const bottomRef = useRef(null);
  const darkMode = theme?.dark ?? true;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user && buddy?.id) {
        loadMessages(data.user.id, buddy.id);
        subscribeToMessages(data.user.id, buddy.id);
      }
    });
  }, [buddy]);

  async function loadMessages(myId, buddyId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${buddyId}),and(sender_id.eq.${buddyId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  function subscribeToMessages(myId, buddyId) {
    supabase
      .channel('messages-' + buddyId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new;
        if (
          (msg.sender_id === myId && msg.receiver_id === buddyId) ||
          (msg.sender_id === buddyId && msg.receiver_id === myId)
        ) {
          setMessages(prev => [...prev, msg]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      })
      .subscribe();
  }

  async function sendMessage() {
    if (!text.trim() || !user || !buddy?.id) return;
    const content = text;
    setText('');
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: buddy.id,
      content,
    });
  }

  const bg = darkMode ? '#0A0A0A' : '#F5F5F5';
  const color = darkMode ? 'white' : '#111';
  const subText = darkMode ? '#666' : '#888';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const border = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const avatarBg = darkMode ? '#2C2C2C' : '#CCC';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: bg, color }}>
      
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◉</div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px', color }}>{buddy?.username}</div>
          <div style={{ color: subText, fontSize: '12px' }}>{buddy?.handle}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 && (
          <p style={{ color: subText, textAlign: 'center', marginTop: '40px' }}>Commence la conversation !</p>
        )}
        {messages.map(m => {
          const isMe = m.sender_id === user?.id;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: '18px',
                background: isMe ? (darkMode ? 'white' : '#111') : (darkMode ? '#1A1A1A' : '#E0E0E0'),
                color: isMe ? (darkMode ? 'black' : 'white') : color,
                fontSize: '14px',
              }}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px 80px', borderTop: `1px solid ${border}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Message..."
          style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '14px' }}
        />
        <button onClick={sendMessage} style={{ width: '40px', height: '40px', borderRadius: '50%', background: color, border: 'none', fontSize: '18px', cursor: 'pointer', color: bg }}>↑</button>
      </div>
    </div>
  );
}