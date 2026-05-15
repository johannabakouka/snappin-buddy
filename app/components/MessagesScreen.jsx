'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import ChatScreen from './ChatScreen';
import Header from './Header';

export default function MessagesScreen({ theme }) {
  const [activeBuddy, setActiveBuddy] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [user, setUser] = useState(null);
  const darkMode = theme?.dark ?? true;
  const subText = darkMode ? '#666' : '#888';
  const avatarBg = darkMode ? '#2C2C2C' : '#CCC';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadConversations(data.user.id);
      }
    });
  }, []);

  async function loadConversations(userId) {
    // Charger tous les messages où je suis impliqué
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!msgs || msgs.length === 0) return;

    // Trouver les interlocuteurs uniques
    const buddyIds = [...new Set(msgs.map(m =>
      m.sender_id === userId ? m.receiver_id : m.sender_id
    ))];

    // Charger les profils
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, handle')
      .in('user_id', buddyIds);

    // Construire les conversations avec le dernier message
    const convs = buddyIds.map(buddyId => {
      const profile = profiles?.find(p => p.user_id === buddyId);
      const lastMsg = msgs.find(m =>
        (m.sender_id === userId && m.receiver_id === buddyId) ||
        (m.sender_id === buddyId && m.receiver_id === userId)
      );
      const unread = msgs.filter(m =>
        m.sender_id === buddyId && m.receiver_id === userId
      ).length;

      return {
        id: buddyId,
        user_id: buddyId,
        username: profile?.username || 'Créatif',
        handle: profile?.handle || '',
        last: lastMsg?.content || '',
        time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        unread: 0,
      };
    });

    setConversations(convs);
  }

  if (activeBuddy) return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: theme?.bg }}>
      <ChatScreen buddy={activeBuddy} onBack={() => { setActiveBuddy(null); if (user) loadConversations(user.id); }} theme={theme} />
    </div>
  );

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color }}>
      <Header theme={theme} />
      <div style={{ padding: '24px 16px 100px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', color: theme?.color }}>Messages</h2>
        <p style={{ color: subText, fontSize: '13px', marginBottom: '20px' }}>Tes conversations</p>

        {conversations.length === 0 && (
          <p style={{ color: subText, fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
            Aucune conversation pour l'instant
          </p>
        )}

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