'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Navbar({ screen, setScreen, theme }) {
  const darkMode = theme?.dark ?? true;
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingCollabs, setPendingCollabs] = useState(0);

  useEffect(() => {
    let msgChannel, collabChannel;

    async function loadBadges() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Messages non lus
      const { data: msgs } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('read', false);
      setUnreadMessages(msgs?.length || 0);

      // Collabs en attente reçus
      const { data: collabs } = await supabase
        .from('collabs')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      setPendingCollabs(collabs?.length || 0);

      // Écoute temps réel messages
      msgChannel = supabase
        .channel('navbar-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => {
          setUnreadMessages(n => n + 1);
        })
        .subscribe();

      // Écoute temps réel collabs
      collabChannel = supabase
        .channel('navbar-collabs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'collabs', filter: `receiver_id=eq.${user.id}` }, () => {
          setPendingCollabs(n => n + 1);
        })
        .subscribe();
    }

    loadBadges();

    return () => {
      if (msgChannel) supabase.removeChannel(msgChannel);
      if (collabChannel) supabase.removeChannel(collabChannel);
    };
  }, []);

  // Reset badge messages quand on va sur Messages
  useEffect(() => {
    if (screen === 'messages') setUnreadMessages(0);
    if (screen === 'match') setPendingCollabs(0);
  }, [screen]);

  const tabs = [
    { id: 'map', label: 'Carte', icon: '◎' },
    { id: 'explore', label: 'Explorer', icon: '⊞' },
    { id: 'match', label: 'Match', icon: '⚡', badge: pendingCollabs },
    { id: 'messages', label: 'Messages', icon: '◻', badge: unreadMessages },
    { id: 'profile', label: 'Profil', icon: '◉' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '390px',
      background: darkMode ? 'rgba(10,10,10,0.97)' : 'rgba(245,245,245,0.97)',
      borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      display: 'flex',
      justifyContent: 'space-around',
      padding: '12px 0 24px',
      zIndex: 9999,
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setScreen(tab.id)}
          style={{
            background: 'none',
            border: 'none',
            color: screen === tab.id ? (darkMode ? '#FFFFFF' : '#000000') : '#888',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            fontSize: '20px',
            position: 'relative',
          }}
        >
          <span style={{ position: 'relative' }}>
            {tab.icon}
            {tab.badge > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-8px',
                background: '#FF4D4D',
                color: 'white',
                borderRadius: '10px',
                minWidth: '16px',
                height: '16px',
                fontSize: '9px',
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: `2px solid ${darkMode ? 'rgba(10,10,10,0.97)' : 'rgba(245,245,245,0.97)'}`,
              }}>
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            )}
          </span>
          <span style={{ fontSize: '10px' }}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}