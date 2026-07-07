'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useT } from '../i18n';

export default function ChatScreen({ buddy, onBack, theme }) {
  const t = useT();
  const isEn = t.map === 'Map';
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [user, setUser] = useState(null);
  const [buddyStatus, setBuddyStatus] = useState(buddy?.status || 'dispo');
  const [showQRReminder, setShowQRReminder] = useState(false);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const darkMode = theme?.dark ?? true;

  const buddyUserId = buddy?.user_id || buddy?.id;

  const statusColor = buddyStatus === 'shoot' ? '#FFD700' : buddyStatus === 'indispo' ? '#FF4D4D' : '#2ECC71';
  const statusLabel = buddyStatus === 'shoot'
    ? (isEn ? 'On shoot' : 'En shoot')
    : buddyStatus === 'indispo'
    ? (isEn ? 'Unavailable' : 'Indisponible')
    : (isEn ? 'Available' : 'Disponible');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user && buddyUserId) {
        loadMessages(data.user.id, buddyUserId);
        subscribeToMessages(data.user.id, buddyUserId);
        loadBuddyStatus();
      }
    });
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [buddy]);

  async function loadBuddyStatus() {
    if (!buddyUserId) return;
    const { data } = await supabase.from('profiles').select('status').eq('user_id', buddyUserId).single();
    if (data?.status) setBuddyStatus(data.status);
  }

  async function loadMessages(myId, buddyId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${buddyId}),and(sender_id.eq.${buddyId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
      if (data.length === 1 && (data[0].content.includes('Collab acceptée') || data[0].content.includes('Collab accepted') || data[0].content.includes('Créons'))) {
        setShowQRReminder(true);
      }
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  function subscribeToMessages(myId, buddyId) {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    const channel = supabase.channel('chat-' + myId + '-' + buddyId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, payload => {
        const msg = payload.new;
        if (
          (msg.sender_id === myId && msg.receiver_id === buddyId) ||
          (msg.sender_id === buddyId && msg.receiver_id === myId)
        ) {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      })
      .subscribe();
    channelRef.current = channel;
  }

  async function sendMessage() {
    if (!text.trim() || !user || !buddyUserId) return;
    const content = text.trim();
    setText('');
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: buddyUserId,
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

      <div style={{ padding: '16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarBg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: `2px solid ${statusColor}` }}>
          {buddy?.avatar_url ? <img src={buddy.avatar_url} alt={buddy.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color }}>{buddy?.username}</div>
          <div style={{ color: statusColor, fontSize: '11px', fontWeight: '600' }}>
            ● {statusLabel}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {showQRReminder && (
          <div style={{
            background: darkMode ? 'rgba(255,154,61,0.08)' : 'rgba(255,154,61,0.1)',
            border: '1px solid rgba(255,154,61,0.3)',
            borderRadius: '14px', padding: '12px 14px', marginBottom: '8px', position: 'relative',
          }}>
            <button onClick={() => setShowQRReminder(false)} style={{ position: 'absolute', top: '8px', right: '10px', background: 'none', border: 'none', color: subText, fontSize: '14px', cursor: 'pointer' }}>✕</button>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,154,61,0.9)', marginBottom: '4px' }}>
              🔒 {isEn ? 'Before you meet' : 'Avant de vous retrouver'}
            </p>
            <p style={{ fontSize: '12px', color: subText, lineHeight: 1.5 }}>
              {isEn
                ? <>Remember to generate and scan your QR codes in the <strong style={{ color }}>Match → 🤝</strong> tab!</>
                : <>Pensez à générer et scanner vos QR codes dans l&apos;onglet <strong style={{ color }}>Match → 🤝</strong> !</>
              }
            </p>
          </div>
        )}

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>🎨</p>
            <p style={{ color: subText, fontSize: '14px', lineHeight: 1.6 }}>
              {isEn
                ? "It all starts here... let's create something beautiful!"
                : 'Tout commence ici... créez quelque chose de beau !'}
            </p>
          </div>
        )}

        {messages.map(m => {
          const isMe = m.sender_id === user?.id;
          const isSystem = m.content.includes('Collab acceptée') || m.content.includes('Collab accepted') || m.content.includes('Créons');
          if (isSystem) return (
            <div key={m.id} style={{ textAlign: 'center', margin: '8px 0' }}>
              <span style={{ fontSize: '12px', color: '#2ECC71', background: darkMode ? 'rgba(46,204,113,0.08)' : 'rgba(46,204,113,0.1)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(46,204,113,0.2)' }}>
                {m.content}
              </span>
            </div>
          );
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: '18px',
                borderBottomRightRadius: isMe ? '4px' : '18px',
                borderBottomLeftRadius: isMe ? '18px' : '4px',
                background: isMe ? (darkMode ? 'white' : '#111') : (darkMode ? '#1A1A1A' : '#E0E0E0'),
                color: isMe ? (darkMode ? 'black' : 'white') : color,
                fontSize: '14px', lineHeight: 1.4,
              }}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px 80px', borderTop: `1px solid ${border}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={isEn ? 'Message...' : 'Message...'}
          style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '14px', outline: 'none' }}
        />
        <button onClick={sendMessage} style={{ width: '42px', height: '42px', borderRadius: '50%', background: text.trim() ? color : (darkMode ? '#333' : '#CCC'), border: 'none', fontSize: '18px', cursor: 'pointer', color: bg, flexShrink: 0, transition: 'background 0.2s' }}>↑</button>
      </div>
    </div>
  );
}