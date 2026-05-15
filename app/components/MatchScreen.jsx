'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Header from './Header';
import QRScreen from './QRScreen';

export default function MatchScreen({ theme, setScreen }) {
  const darkMode = theme?.dark ?? true;
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const subText = darkMode ? '#666' : '#888';

  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [user, setUser] = useState(null);
  const [qrCollab, setQrCollab] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadCollabs(data.user.id);
      }
    });
  }, []);

  async function loadCollabs(userId) {
    const { data: recv } = await supabase
      .from('collabs').select('*')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    const { data: snt } = await supabase
      .from('collabs').select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    if (recv && recv.length > 0) {
      const senderIds = recv.map(c => c.sender_id);
      const { data: senderProfiles } = await supabase
        .from('profiles').select('user_id, username, handle, role')
        .in('user_id', senderIds);
      setReceived(recv.map(c => ({ ...c, senderProfile: senderProfiles?.find(p => p.user_id === c.sender_id) })));
    } else setReceived([]);

    if (snt && snt.length > 0) {
      const receiverIds = snt.map(c => c.receiver_id);
      const { data: receiverProfiles } = await supabase
        .from('profiles').select('user_id, username, handle, role')
        .in('user_id', receiverIds);
      setSent(snt.map(c => ({ ...c, receiverProfile: receiverProfiles?.find(p => p.user_id === c.receiver_id) })));
    } else setSent([]);
  }

  async function respondCollab(id, status, senderId) {
    await supabase.from('collabs').update({ status }).eq('id', id);
    if (status === 'accepted' && user && senderId) {
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: senderId,
        content: '⚡ Collab acceptée ! On se retrouve quand ?',
      });
      setScreen('messages');
    }
    loadCollabs(user.id);
  }

  const statusBadge = (status) => {
    if (status === 'accepted') return { label: 'Accepté ✓', color: '#3DFF8F' };
    if (status === 'declined') return { label: 'Refusé', color: '#FF4D4D' };
    return { label: 'En attente', color: '#FFD700' };
  };

  if (qrCollab) return (
    <QRScreen
      collab={qrCollab}
      user={user}
      theme={theme}
      onBack={() => setQrCollab(null)}
    />
  );

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color }}>
      <Header theme={theme} />
      <div style={{ padding: '24px 16px 100px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', color: theme?.color }}>Match</h2>
        <p style={{ color: subText, fontSize: '13px', marginBottom: '24px' }}>Tes propositions de collab</p>

        {received.length > 0 && (
          <>
            <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>REÇUES</p>
            {received.map(c => (
              <div key={c.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700', color: theme?.color }}>{c.senderProfile?.username || 'Créatif'}</span>
                  <span style={{ fontSize: '11px', color: statusBadge(c.status).color }}>{statusBadge(c.status).label}</span>
                </div>
                <p style={{ color: subText, fontSize: '12px', marginBottom: c.status === 'pending' ? '12px' : c.status === 'accepted' ? '12px' : '0' }}>{c.message || 'Pas de message'}</p>
                {c.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => respondCollab(c.id, 'accepted', c.sender_id)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: '#3DFF8F', color: '#000', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Accepter</button>
                    <button onClick={() => respondCollab(c.id, 'declined', null)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #FF4D4D', background: 'transparent', color: '#FF4D4D', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Refuser</button>
                  </div>
                )}
                {c.status === 'accepted' && (
                  <button onClick={() => setQrCollab(c)} style={{ width: '100%', padding: '10px', borderRadius: '20px', border: 'none', background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme?.color, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                    🔒 Générer mon QR de session
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {sent.length > 0 && (
          <>
            <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px', marginTop: '16px' }}>ENVOYÉES</p>
            {sent.map(c => (
              <div key={c.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700', color: theme?.color }}>{c.receiverProfile?.username || 'Créatif'}</span>
                  <span style={{ fontSize: '11px', color: statusBadge(c.status).color }}>{statusBadge(c.status).label}</span>
                </div>
                <p style={{ color: subText, fontSize: '12px', marginBottom: c.status === 'accepted' ? '12px' : '0' }}>{c.message || 'Pas de message'}</p>
                {c.status === 'accepted' && (
                  <button onClick={() => setQrCollab(c)} style={{ width: '100%', padding: '10px', borderRadius: '20px', border: 'none', background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme?.color, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                    🔒 Générer mon QR de session
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {received.length === 0 && sent.length === 0 && (
          <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
            <p style={{ fontWeight: '700', marginBottom: '4px', color: theme?.color }}>Propose un collab</p>
            <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>Trouve un créatif et lance une session</p>
            <button onClick={() => setScreen('explore')} style={{ background: theme?.color, color: theme?.bg, border: 'none', borderRadius: '24px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' }}>Explorer les créatifs</button>
          </div>
        )}
      </div>
    </div>
  );
}