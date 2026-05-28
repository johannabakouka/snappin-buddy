'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Header from './Header';
import QRScreen from './QRScreen';

const ROLE_OPTIONS = [
  { id: 'photographe', label: 'Photographe', icon: '📷' },
  { id: 'vidéaste', label: 'Vidéaste', icon: '🎬' },
  { id: 'directeur artistique', label: 'Dir. Artistique', icon: '🎨' },
  { id: 'styliste', label: 'Styliste', icon: '👗' },
  { id: 'maquilleur', label: 'Maquilleur·se', icon: '💄' },
  { id: 'modèle', label: 'Modèle', icon: '🧍' },
  { id: 'directeur casting', label: 'Dir. Casting', icon: '🎭' },
  { id: 'brand owner', label: 'Brand Owner', icon: '🏷️' },
];

export default function MatchScreen({ theme, setScreen }) {
  const darkMode = theme?.dark ?? true;
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const subText = darkMode ? '#666' : '#888';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const [tab, setTab] = useState('offres');
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [user, setUser] = useState(null);
  const [qrCollab, setQrCollab] = useState(null);
  const [offers, setOffers] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [showNewOffer, setShowNewOffer] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerRole, setOfferRole] = useState('');
  const [offerZone, setOfferZone] = useState('');
  const [offerDate, setOfferDate] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadCollabs(data.user.id);
        loadOffers(data.user.id);
      }
    });
  }, []);

  async function loadCollabs(userId) {
    const { data: recv } = await supabase.from('collabs').select('*').eq('receiver_id', userId).order('created_at', { ascending: false });
    const { data: snt } = await supabase.from('collabs').select('*').eq('sender_id', userId).order('created_at', { ascending: false });

    if (recv && recv.length > 0) {
      const senderIds = recv.map(c => c.sender_id);
      const { data: senderProfiles } = await supabase.from('profiles').select('user_id, username, handle, role, avatar_url, styles, zone, bio, portfolio_urls').in('user_id', senderIds);
      setReceived(recv.map(c => ({ ...c, senderProfile: senderProfiles?.find(p => p.user_id === c.sender_id) })));
    } else setReceived([]);

    if (snt && snt.length > 0) {
      const receiverIds = snt.map(c => c.receiver_id);
      const { data: receiverProfiles } = await supabase.from('profiles').select('user_id, username, handle, role, avatar_url, styles, zone, bio, portfolio_urls').in('user_id', receiverIds);
      setSent(snt.map(c => ({ ...c, receiverProfile: receiverProfiles?.find(p => p.user_id === c.receiver_id) })));
    } else setSent([]);
  }

  async function loadOffers(userId) {
    const { data: all } = await supabase.from('offers').select('*').eq('status', 'open').neq('user_id', userId).order('created_at', { ascending: false });
    const { data: mine } = await supabase.from('offers').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (all) {
      const userIds = all.map(o => o.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url, role').in('user_id', userIds);
      setOffers(all.map(o => ({ ...o, authorProfile: profiles?.find(p => p.user_id === o.user_id) })));
    }
    if (mine) setMyOffers(mine);
  }

  async function createOffer() {
    if (!offerTitle || !offerRole) return;
    setOfferLoading(true);
    await supabase.from('offers').insert({ user_id: user.id, title: offerTitle, description: offerDesc, role_needed: offerRole, zone: offerZone, date: offerDate, status: 'open' });
    setOfferTitle(''); setOfferDesc(''); setOfferRole(''); setOfferZone(''); setOfferDate('');
    setShowNewOffer(false);
    loadOffers(user.id);
    setOfferLoading(false);
  }

  async function respondCollab(id, status, senderId) {
    await supabase.from('collabs').update({ status }).eq('id', id);
    if (status === 'accepted' && user && senderId) {
      await supabase.from('messages').insert({ sender_id: user.id, receiver_id: senderId, content: '⚡ Collab acceptée ! On se retrouve quand ?' });
      setScreen('messages');
    }
    loadCollabs(user.id);
  }

  const statusBadge = (status) => {
    if (status === 'accepted') return { label: 'Accepté ✓', color: '#3DFF8F' };
    if (status === 'declined') return { label: 'Refusé', color: '#FF4D4D' };
    return { label: 'En attente', color: '#FFD700' };
  };

  const tabStyle = (active) => ({
    flex: 1, padding: '10px', border: 'none', background: 'transparent',
    color: active ? theme?.color : subText,
    fontWeight: active ? '800' : '600', fontSize: '14px', cursor: 'pointer',
    borderBottom: `2px solid ${active ? theme?.color : 'transparent'}`,
    transition: 'all 0.2s',
  });

  // Composant mini profil pour les collabs
  function MiniProfile({ profile }) {
    if (!profile) return null;
    const portfolio = profile.portfolio_urls || [];
    return (
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#CCC', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
            {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
          </div>
          <div>
            <p style={{ fontWeight: '700', fontSize: '14px', color: theme?.color }}>{profile.username}</p>
            <p style={{ fontSize: '11px', color: subText }}>{profile.role}{profile.zone ? ` · ${profile.zone}` : ''}</p>
          </div>
        </div>
        {profile.bio && (
          <p style={{ fontSize: '12px', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontStyle: 'italic', marginBottom: '8px', lineHeight: 1.4 }}>« {profile.bio} »</p>
        )}
        {profile.styles && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {profile.styles.split(',').map(s => s.trim()).filter(Boolean).map(s => (
              <span key={s} style={{ fontSize: '10px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '2px 8px' }}>{s}</span>
            ))}
          </div>
        )}
        {portfolio.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {portfolio.map((url, i) => (
              <img key={i} src={url} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (qrCollab) return <QRScreen collab={qrCollab} user={user} myProfile={received.find(c => c.id === qrCollab.id)?.senderProfile || sent.find(c => c.id === qrCollab.id)?.receiverProfile} theme={theme} onBack={() => setQrCollab(null)} />;

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color }}>
      <Header theme={theme} />

      <div style={{ display: 'flex', borderBottom: `1px solid ${cardBorder}`, flexShrink: 0 }}>
        <button style={tabStyle(tab === 'offres')} onClick={() => setTab('offres')}>⚡ Offres</button>
        <button style={tabStyle(tab === 'match')} onClick={() => setTab('match')}>🤝 Match</button>
      </div>

      <div style={{ padding: '20px 16px 100px' }}>

        {tab === 'offres' && (
          <>
            <button onClick={() => setShowNewOffer(!showNewOffer)} style={{ width: '100%', padding: '14px', borderRadius: '14px', marginBottom: '20px', border: `1.5px dashed ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: 'transparent', color: theme?.color, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {showNewOffer ? '✕ Annuler' : '+ Poster une offre'}
            </button>

            {showNewOffer && (
              <div style={{ background: card, borderRadius: '16px', padding: '16px', marginBottom: '20px', border: `1px solid ${cardBorder}` }}>
                <p style={{ color: subText, fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '14px' }}>NOUVELLE OFFRE</p>
                <input value={offerTitle} onChange={e => setOfferTitle(e.target.value)} placeholder="Titre de l'offre *" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' }} />
                <textarea value={offerDesc} onChange={e => setOfferDesc(e.target.value)} placeholder="Description du projet..." rows={3} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box', resize: 'none' }} />
                <p style={{ color: subText, fontSize: '11px', marginBottom: '8px', fontWeight: '600' }}>RÔLE RECHERCHÉ *</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {ROLE_OPTIONS.map(r => (
                    <button key={r.id} onClick={() => setOfferRole(offerRole === r.id ? '' : r.id)} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: `1px solid ${offerRole === r.id ? theme?.color : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')}`, background: offerRole === r.id ? theme?.color : 'transparent', color: offerRole === r.id ? theme?.bg : subText }}>{r.icon} {r.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input value={offerZone} onChange={e => setOfferZone(e.target.value)} placeholder="Zone" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', boxSizing: 'border-box' }} />
                  <input value={offerDate} onChange={e => setOfferDate(e.target.value)} placeholder="Date" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <button onClick={createOffer} disabled={offerLoading || !offerTitle || !offerRole} style={{ width: '100%', padding: '12px', borderRadius: '24px', border: 'none', background: theme?.color, color: theme?.bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  {offerLoading ? 'Publication...' : "Publier l'offre"}
                </button>
              </div>
            )}

            {myOffers.length > 0 && (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>MES OFFRES</p>
                {myOffers.map(o => (
                  <div key={o.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '800', color: theme?.color, marginBottom: '4px' }}>{o.title}</p>
                        {o.role_needed && <span style={{ fontSize: '11px', color: subText }}>{ROLE_OPTIONS.find(r => r.id === o.role_needed)?.icon} {o.role_needed}</span>}
                        {o.zone && <span style={{ fontSize: '11px', color: subText }}> · {o.zone}</span>}
                        {o.date && <span style={{ fontSize: '11px', color: subText }}> · {o.date}</span>}
                      </div>
                      <span style={{ fontSize: '11px', color: '#3DFF8F', fontWeight: '700' }}>Ouverte</span>
                    </div>
                  </div>
                ))}
                <div style={{ marginBottom: '20px' }} />
              </>
            )}

            {offers.length > 0 ? (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>OFFRES DU MOMENT</p>
                {offers.map(o => (
                  <div key={o.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#CCC', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                        {o.authorProfile?.avatar_url ? <img src={o.authorProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
                      </div>
                      <div>
                        <p style={{ fontWeight: '700', fontSize: '13px', color: theme?.color }}>{o.authorProfile?.username || 'Créatif'}</p>
                        <p style={{ fontSize: '11px', color: subText }}>{o.authorProfile?.role}</p>
                      </div>
                    </div>
                    <p style={{ fontWeight: '800', fontSize: '15px', color: theme?.color, marginBottom: '6px' }}>{o.title}</p>
                    {o.description && <p style={{ fontSize: '13px', color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', marginBottom: '10px', lineHeight: 1.4 }}>{o.description}</p>}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {o.role_needed && <span style={{ fontSize: '11px', color: theme?.color, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px', fontWeight: '700' }}>{ROLE_OPTIONS.find(r => r.id === o.role_needed)?.icon} {o.role_needed}</span>}
                      {o.zone && <span style={{ fontSize: '11px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px' }}>📍 {o.zone}</span>}
                      {o.date && <span style={{ fontSize: '11px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px' }}>📅 {o.date}</span>}
                    </div>
                    <button onClick={async () => { const { data: { user: u } } = await supabase.auth.getUser(); if (u) { await supabase.from('collabs').insert({ sender_id: u.id, receiver_id: o.user_id, message: `Candidature pour : ${o.title}`, status: 'pending' }); alert('Candidature envoyée !'); } }} style={{ width: '100%', padding: '10px', borderRadius: '20px', border: 'none', background: theme?.color, color: theme?.bg, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                      ⚡ Candidater
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>📋</p>
                <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>Aucune offre pour l'instant</p>
                <p style={{ color: subText, fontSize: '13px' }}>Sois le premier à poster une offre !</p>
              </div>
            )}
          </>
        )}

        {tab === 'match' && (
          <>
            {received.length > 0 && (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>REÇUES</p>
                {received.map(c => (
                  <div key={c.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: statusBadge(c.status).color, fontWeight: '700' }}>{statusBadge(c.status).label}</span>
                    </div>
                    <MiniProfile profile={c.senderProfile} />
                    <p style={{ color: subText, fontSize: '12px', fontStyle: 'italic', marginBottom: c.status === 'pending' || c.status === 'accepted' ? '12px' : '0', borderLeft: `2px solid ${cardBorder}`, paddingLeft: '8px' }}>{c.message || 'Pas de message'}</p>
                    {c.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => respondCollab(c.id, 'accepted', c.sender_id)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: '#3DFF8F', color: '#000', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Accepter</button>
                        <button onClick={() => respondCollab(c.id, 'declined', null)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #FF4D4D', background: 'transparent', color: '#FF4D4D', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Refuser</button>
                      </div>
                    )}
                    {c.status === 'accepted' && (
                      <button onClick={() => setQrCollab(c)} style={{ width: '100%', padding: '10px', borderRadius: '20px', border: 'none', background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme?.color, fontWeight: '700', fontSize: '13px', cursor: 'pointer', marginTop: '12px' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: statusBadge(c.status).color, fontWeight: '700' }}>{statusBadge(c.status).label}</span>
                    </div>
                    <MiniProfile profile={c.receiverProfile} />
                    <p style={{ color: subText, fontSize: '12px', fontStyle: 'italic', marginBottom: c.status === 'accepted' ? '12px' : '0', borderLeft: `2px solid ${cardBorder}`, paddingLeft: '8px' }}>{c.message || 'Pas de message'}</p>
                    {c.status === 'accepted' && (
                      <button onClick={() => setQrCollab(c)} style={{ width: '100%', padding: '10px', borderRadius: '20px', border: 'none', background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme?.color, fontWeight: '700', fontSize: '13px', cursor: 'pointer', marginTop: '12px' }}>
                        🔒 Générer mon QR de session
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}

            {received.length === 0 && sent.length === 0 && (
              <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '20px', textAlign: 'center', marginTop: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤝</div>
                <p style={{ fontWeight: '700', marginBottom: '4px', color: theme?.color }}>Pas encore de match</p>
                <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>Poste une offre ou explore les créatifs</p>
                <button onClick={() => setTab('offres')} style={{ background: theme?.color, color: theme?.bg, border: 'none', borderRadius: '24px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' }}>Voir les offres</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}