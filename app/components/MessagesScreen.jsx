'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import ChatScreen from './ChatScreen';
import Header from './Header';

export default function MessagesScreen({ theme }) {
  const [activeBuddy, setActiveBuddy] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [following, setFollowing] = useState([]);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('messages');
  const darkMode = theme?.dark ?? true;
  const subText = darkMode ? '#666' : '#888';
  const avatarBg = darkMode ? '#2C2C2C' : '#CCC';
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadConversations(data.user.id);
        loadBuddies(data.user.id);
        loadFollowing(data.user.id);
      }
    });
  }, []);

  async function loadConversations(userId) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!msgs || msgs.length === 0) return;

    const buddyIds = [...new Set(msgs.map(m =>
      m.sender_id === userId ? m.receiver_id : m.sender_id
    ))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, handle, avatar_url')
      .in('user_id', buddyIds);

    const convs = buddyIds.map(buddyId => {
      const profile = profiles?.find(p => p.user_id === buddyId);
      const lastMsg = msgs.find(m =>
        (m.sender_id === userId && m.receiver_id === buddyId) ||
        (m.sender_id === buddyId && m.receiver_id === userId)
      );
      return {
        id: buddyId,
        user_id: buddyId,
        username: profile?.username || 'Créatif',
        handle: profile?.handle || '',
        avatar_url: profile?.avatar_url || null,
        last: lastMsg?.content || '',
        time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        unread: 0,
      };
    });

    setConversations(convs);
  }

  async function loadBuddies(userId) {
    // Buddies = collabs acceptées
    const { data: collabs } = await supabase
      .from('collabs')
      .select('*')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (!collabs || collabs.length === 0) return;

    const buddyIds = [...new Set(collabs.map(c =>
      c.sender_id === userId ? c.receiver_id : c.sender_id
    ))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, handle, avatar_url, role, styles')
      .in('user_id', buddyIds);

    setBuddies(profiles || []);
  }

  async function loadFollowing(userId) {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (!data || data.length === 0) return;

    const ids = data.map(f => f.following_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, handle, avatar_url, role, styles')
      .in('user_id', ids);

    setFollowing(profiles || []);
  }

  async function toggleFollow(targetUserId) {
    if (!user) return;
    const isFollowing = following.some(f => f.user_id === targetUserId);
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);
      setFollowing(prev => prev.filter(f => f.user_id !== targetUserId));
    } else {
      await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: targetUserId,
      });
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, username, handle, avatar_url, role, styles')
        .eq('user_id', targetUserId)
        .single();
      if (profile) setFollowing(prev => [...prev, profile]);
    }
  }

  const isFollowing = (uid) => following.some(f => f.user_id === uid);

  const tabStyle = (active) => ({
    flex: 1, padding: '10px', border: 'none', background: 'transparent',
    color: active ? theme?.color : subText,
    fontWeight: active ? '800' : '600', fontSize: '14px', cursor: 'pointer',
    borderBottom: `2px solid ${active ? theme?.color : 'transparent'}`,
    transition: 'all 0.2s',
  });

  function ProfileCard({ p }) {
    const styles = (p.styles || '').split(',').map(s => s.trim()).filter(Boolean);
    return (
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: avatarBg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
          {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: '700', fontSize: '14px', color: theme?.color }}>{p.username}</p>
          <p style={{ color: subText, fontSize: '11px' }}>{p.role}{p.handle ? ` · ${p.handle}` : ''}</p>
          {styles.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
              {styles.slice(0, 3).map(s => (
                <span key={s} style={{ fontSize: '10px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '1px 7px' }}>{s}</span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => toggleFollow(p.user_id)}
          style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            border: `1px solid ${isFollowing(p.user_id) ? cardBorder : theme?.color}`,
            background: isFollowing(p.user_id) ? 'transparent' : theme?.color,
            color: isFollowing(p.user_id) ? subText : theme?.bg,
            flexShrink: 0,
          }}
        >
          {isFollowing(p.user_id) ? 'Suivi ✓' : 'Suivre'}
        </button>
      </div>
    );
  }

  if (activeBuddy) return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: theme?.bg }}>
      <ChatScreen buddy={activeBuddy} onBack={() => { setActiveBuddy(null); if (user) loadConversations(user.id); }} theme={theme} />
    </div>
  );

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color }}>
      <Header theme={theme} />

      {/* Onglets */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${cardBorder}`, flexShrink: 0 }}>
        <button style={tabStyle(tab === 'messages')} onClick={() => setTab('messages')}>💬 Messages</button>
        <button style={tabStyle(tab === 'buddies')} onClick={() => setTab('buddies')}>⚡ Buddies</button>
        <button style={tabStyle(tab === 'suivis')} onClick={() => setTab('suivis')}>🔖 Suivis</button>
      </div>

      <div style={{ padding: '20px 16px 100px' }}>

        {/* ═══ MESSAGES ═══ */}
        {tab === 'messages' && (
          <>
            {conversations.length === 0 && (
              <p style={{ color: subText, fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
                Aucune conversation pour l&apos;instant
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {conversations.map(c => (
                <div key={c.id} onClick={() => setActiveBuddy(c)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 12px', borderRadius: '12px', cursor: 'pointer' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: avatarBg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    {c.avatar_url ? <img src={c.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: theme?.color }}>{c.username}</span>
                      <span style={{ color: subText, fontSize: '11px' }}>{c.time}</span>
                    </div>
                    <div style={{ color: subText, fontSize: '13px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ BUDDIES ═══ */}
        {tab === 'buddies' && (
          <>
            <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>
              Créatifs avec qui tu as déjà collaboré
            </p>
            {buddies.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</p>
                <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>Pas encore de buddies</p>
                <p style={{ color: subText, fontSize: '13px' }}>Tes collabs acceptées apparaîtront ici !</p>
              </div>
            ) : (
              buddies.map(p => <ProfileCard key={p.user_id} p={p} />)
            )}
          </>
        )}

        {/* ═══ SUIVIS ═══ */}
        {tab === 'suivis' && (
          <>
            <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>
              Ta liste privée de créatifs à suivre
            </p>
            {following.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔖</p>
                <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>Personne encore</p>
                <p style={{ color: subText, fontSize: '13px' }}>Suis des créatifs depuis Explorer ou Buddies !</p>
              </div>
            ) : (
              following.map(p => <ProfileCard key={p.user_id} p={p} />)
            )}
          </>
        )}

      </div>
    </div>
  );
}