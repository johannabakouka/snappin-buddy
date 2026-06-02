'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Header from './Header';
import QRScreen from './QRScreen';
import { ROLES, UNIVERS } from '../constants';
import { useT } from '../i18n';

export default function MatchScreen({ theme, setScreen }) {
  const t = useT();
  const isEn = t.map === 'Map';
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
  const [myProfile, setMyProfile] = useState(null);
  const [qrCollab, setQrCollab] = useState(null);
  const [offers, setOffers] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [showNewOffer, setShowNewOffer] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerRoles, setOfferRoles] = useState([]);
  const [offerStyles, setOfferStyles] = useState([]);
  const [offerZone, setOfferZone] = useState('');
  const [offerDate, setOfferDate] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);

  // Filtres feed
  const [filterRole, setFilterRole] = useState(null);
  const [filterUnivers, setFilterUnivers] = useState(null);
  const [sortBy, setSortBy] = useState('match');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadCollabs(data.user.id);
        loadOffers(data.user.id);
        supabase.from('profiles').select('*').eq('user_id', data.user.id).single().then(({ data: p }) => setMyProfile(p));
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
    if (!offerTitle || offerRoles.length === 0) return;
    setOfferLoading(true);
    await supabase.from('offers').insert({
      user_id: user.id,
      title: offerTitle,
      description: offerDesc,
      role_needed: offerRoles.join(', '),
      styles_needed: offerStyles.join(', '),
      zone: offerZone,
      date: offerDate,
      status: 'open'
    });
    setOfferTitle(''); setOfferDesc(''); setOfferRoles([]); setOfferStyles([]); setOfferZone(''); setOfferDate('');
    setShowNewOffer(false);
    loadOffers(user.id);
    setOfferLoading(false);
  }

  function toggleOfferRole(roleId) {
    setOfferRoles(prev => prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]);
  }

  function toggleOfferStyle(s) {
    setOfferStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function getMatchScore(offer) {
    if (!myProfile) return 0;
    let score = 0;
    if (offer.role_needed && myProfile.role) {
      const roles = offer.role_needed.split(',').map(r => r.trim());
      if (roles.includes(myProfile.role)) score += 3;
    }
    if (offer.styles_needed && myProfile.styles) {
      const offerStyles = offer.styles_needed.toLowerCase().split(',').map(s => s.trim());
      const myStyles = myProfile.styles.toLowerCase().split(',').map(s => s.trim());
      score += offerStyles.filter(s => myStyles.includes(s)).length;
    }
    return score;
  }

  let displayedOffers = [...offers];
  if (filterRole) displayedOffers = displayedOffers.filter(o => o.role_needed?.includes(filterRole));
  if (filterUnivers) displayedOffers = displayedOffers.filter(o => (o.styles_needed || '').toLowerCase().includes(filterUnivers.toLowerCase()));
  if (sortBy === 'match') displayedOffers = displayedOffers.sort((a, b) => getMatchScore(b) - getMatchScore(a));

  async function respondCollab(id, status, senderId) {
    await supabase.from('collabs').update({ status }).eq('id', id);
    if (status === 'accepted' && user && senderId) {
      await supabase.from('messages').insert({ sender_id: user.id, receiver_id: senderId, content: isEn ? '⚡ Collab accepted! When shall we meet?' : '⚡ Collab acceptée ! On se retrouve quand ?' });
      setScreen('messages');
    }
    loadCollabs(user.id);
  }

  const statusBadge = (status) => {
    if (status === 'accepted') return { label: isEn ? 'Accepted ✓' : 'Accepté ✓', color: '#2ECC71' };
    if (status === 'declined') return { label: isEn ? 'Declined' : 'Refusé', color: '#FF4D4D' };
    return { label: isEn ? 'Pending' : 'En attente', color: '#FFD700' };
  };

  const tabStyle = (active) => ({
    flex: 1, padding: '10px', border: 'none', background: 'transparent',
    color: active ? theme?.color : subText,
    fontWeight: active ? '800' : '600', fontSize: '14px', cursor: 'pointer',
    borderBottom: `2px solid ${active ? theme?.color : 'transparent'}`,
    transition: 'all 0.2s',
  });

  const pillStyle = (active) => ({
    padding: '6px 12px', borderRadius: '20px', flexShrink: 0,
    border: `1px solid ${active ? theme?.color : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')}`,
    background: active ? theme?.color : 'transparent',
    color: active ? theme?.bg : subText,
    fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
  });

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
        {profile.bio && <p style={{ fontSize: '12px', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontStyle: 'italic', marginBottom: '8px', lineHeight: 1.4 }}>« {profile.bio} »</p>}
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
        <button style={tabStyle(tab === 'offres')} onClick={() => setTab('offres')}>{t.offers}</button>
        <button style={tabStyle(tab === 'match')} onClick={() => setTab('match')}>{t.matchTab}</button>
      </div>

      <div style={{ padding: '20px 16px 100px' }}>

        {tab === 'offres' && (
          <>
            <button onClick={() => setShowNewOffer(!showNewOffer)} style={{ width: '100%', padding: '14px', borderRadius: '14px', marginBottom: '16px', border: `1.5px dashed ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: 'transparent', color: theme?.color, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {showNewOffer ? t.cancelOffer : t.postOffer}
            </button>

            {showNewOffer && (
              <div style={{ background: card, borderRadius: '16px', padding: '16px', marginBottom: '20px', border: `1px solid ${cardBorder}` }}>
                <p style={{ color: subText, fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '14px' }}>{isEn ? 'NEW BRIEF' : 'NOUVELLE OFFRE'}</p>
                <input value={offerTitle} onChange={e => setOfferTitle(e.target.value)} placeholder={isEn ? 'Brief title *' : "Titre de l'offre *"} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' }} />
                <textarea value={offerDesc} onChange={e => setOfferDesc(e.target.value)} placeholder={isEn ? 'Project description...' : 'Description du projet...'} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box', resize: 'none' }} />

                <p style={{ color: subText, fontSize: '11px', marginBottom: '8px', fontWeight: '600' }}>
                  {isEn ? 'ROLES NEEDED *' : 'RÔLES RECHERCHÉS *'}
                  {offerRoles.length > 0 && <span style={{ color: theme?.color, marginLeft: '6px' }}>({offerRoles.length})</span>}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {ROLES.map(r => {
                    const active = offerRoles.includes(r.id);
                    return (
                      <button key={r.id} onClick={() => toggleOfferRole(r.id)} style={{
                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                        border: `1px solid ${active ? theme?.color : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')}`,
                        background: active ? theme?.color : 'transparent',
                        color: active ? theme?.bg : subText,
                      }}>{r.icon} {r.label}</button>
                    );
                  })}
                </div>

                <p style={{ color: subText, fontSize: '11px', marginBottom: '8px', fontWeight: '600' }}>
                  {isEn ? 'UNIVERSE / TAGS' : 'UNIVERS / TAGS'}
                  {offerStyles.length > 0 && <span style={{ color: theme?.color, marginLeft: '6px' }}>({offerStyles.length})</span>}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {UNIVERS.map(s => {
                    const active = offerStyles.includes(s);
                    return (
                      <button key={s} onClick={() => toggleOfferStyle(s)} style={{
                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                        border: `1px solid ${active ? theme?.color : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')}`,
                        background: active ? theme?.color : 'transparent',
                        color: active ? theme?.bg : subText,
                      }}>{s}</button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input value={offerZone} onChange={e => setOfferZone(e.target.value)} placeholder={isEn ? 'Area' : 'Zone'} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', boxSizing: 'border-box' }} />
                  <input value={offerDate} onChange={e => setOfferDate(e.target.value)} placeholder={isEn ? 'Date' : 'Date'} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <button onClick={createOffer} disabled={offerLoading || !offerTitle || offerRoles.length === 0} style={{ width: '100%', padding: '12px', borderRadius: '24px', border: 'none', background: theme?.color, color: theme?.bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  {offerLoading ? (isEn ? 'Publishing...' : 'Publication...') : (isEn ? 'Publish brief' : "Publier l'offre")}
                </button>
              </div>
            )}

            {myOffers.length > 0 && (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>{t.myOffers}</p>
                {myOffers.map(o => (
                  <div key={o.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '800', color: theme?.color, marginBottom: '4px' }}>{o.title}</p>
                        {o.role_needed && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {o.role_needed.split(',').map(r => r.trim()).filter(Boolean).map(r => {
                              const role = ROLES.find(x => x.id === r);
                              return <span key={r} style={{ fontSize: '11px', color: subText }}>{role?.icon} {r}</span>;
                            })}
                          </div>
                        )}
                        {o.zone && <span style={{ fontSize: '11px', color: subText }}> · {o.zone}</span>}
                        {o.date && <span style={{ fontSize: '11px', color: subText }}> · {o.date}</span>}
                      </div>
                      <span style={{ fontSize: '11px', color: '#2ECC71', fontWeight: '700' }}>{isEn ? 'Open' : 'Ouverte'}</span>
                    </div>
                  </div>
                ))}
                <div style={{ marginBottom: '16px' }} />
              </>
            )}

            {/* Filtres feed */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                <button onClick={() => setSortBy('match')} style={pillStyle(sortBy === 'match')}>⚡ {isEn ? 'For you' : 'Pour toi'}</button>
                <button onClick={() => setSortBy('recent')} style={pillStyle(sortBy === 'recent')}>🕐 {isEn ? 'Recent' : 'Récent'}</button>
                {ROLES.slice(0, 6).map(r => (
                  <button key={r.id} onClick={() => setFilterRole(filterRole === r.id ? null : r.id)} style={pillStyle(filterRole === r.id)}>
                    {r.icon} {r.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {UNIVERS.map(s => (
                  <button key={s} onClick={() => setFilterUnivers(filterUnivers === s ? null : s)} style={pillStyle(filterUnivers === s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {displayedOffers.length > 0 ? (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>
                  {sortBy === 'match' ? (isEn ? 'MATCHING YOUR PROFILE' : 'CORRESPOND À TON PROFIL') : t.offersNow}
                </p>
                {displayedOffers.map(o => {
                  const score = getMatchScore(o);
                  return (
                    <div key={o.id} style={{ background: card, border: `1px solid ${score > 0 ? (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)') : cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#CCC', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                          {o.authorProfile?.avatar_url ? <img src={o.authorProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: '700', fontSize: '13px', color: theme?.color }}>{o.authorProfile?.username || (isEn ? 'Creative' : 'Créatif')}</p>
                          <p style={{ fontSize: '11px', color: subText }}>{o.authorProfile?.role}</p>
                        </div>
                        {score > 0 && (
                          <div style={{ background: '#2ECC71', color: '#000', borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: '900' }}>
                            {score}✓ match
                          </div>
                        )}
                      </div>
                      <p style={{ fontWeight: '800', fontSize: '15px', color: theme?.color, marginBottom: '6px' }}>{o.title}</p>
                      {o.description && <p style={{ fontSize: '13px', color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', marginBottom: '10px', lineHeight: 1.4 }}>{o.description}</p>}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {o.role_needed && o.role_needed.split(',').map(r => r.trim()).filter(Boolean).map(r => {
                          const role = ROLES.find(x => x.id === r);
                          const isMyRole = myProfile?.role === r;
                          return <span key={r} style={{ fontSize: '11px', color: isMyRole ? '#000' : theme?.color, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px', fontWeight: '700', background: isMyRole ? '#2ECC71' : 'transparent' }}>{role?.icon} {r}</span>;
                        })}
                        {o.styles_needed && o.styles_needed.split(',').map(s => s.trim()).filter(Boolean).map(s => {
                          const isMyStyle = myProfile?.styles?.toLowerCase().includes(s.toLowerCase());
                          return <span key={s} style={{ fontSize: '11px', color: isMyStyle ? theme?.color : subText, border: `1px solid ${isMyStyle ? theme?.color : cardBorder}`, borderRadius: '20px', padding: '3px 10px', fontWeight: isMyStyle ? '700' : '400' }}>{s}</span>;
                        })}
                        {o.zone && <span style={{ fontSize: '11px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px' }}>📍 {o.zone}</span>}
                        {o.date && <span style={{ fontSize: '11px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px' }}>📅 {o.date}</span>}
                      </div>
                      <button onClick={async () => {
                        const { data: { user: u } } = await supabase.auth.getUser();
                        if (u) {
                          await supabase.from('collabs').insert({ sender_id: u.id, receiver_id: o.user_id, message: `${isEn ? 'Application for' : 'Candidature pour'} : ${o.title}`, status: 'pending' });
                          alert(isEn ? 'Application sent!' : 'Candidature envoyée !');
                        }
                      }} style={{ width: '100%', padding: '10px', borderRadius: '20px', border: 'none', background: theme?.color, color: theme?.bg, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                        {t.applyOffer}
                      </button>
                    </div>
                  );
                })}
              </>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>📋</p>
                <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>{t.noOffers}</p>
                <p style={{ color: subText, fontSize: '13px' }}>{t.beFirst}</p>
              </div>
            )}
          </>
        )}

        {tab === 'match' && (
          <>
            {received.length > 0 && (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>{t.received}</p>
                {received.map(c => (
                  <div key={c.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: statusBadge(c.status).color, fontWeight: '700' }}>{statusBadge(c.status).label}</span>
                    </div>
                    <MiniProfile profile={c.senderProfile} />
                    <p style={{ color: subText, fontSize: '12px', fontStyle: 'italic', marginBottom: c.status === 'pending' || c.status === 'accepted' ? '12px' : '0', borderLeft: `2px solid ${cardBorder}`, paddingLeft: '8px' }}>{c.message || (isEn ? 'No message' : 'Pas de message')}</p>
                    {c.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => respondCollab(c.id, 'accepted', c.sender_id)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: '#2ECC71', color: '#000', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t.accept}</button>
                        <button onClick={() => respondCollab(c.id, 'declined', null)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #FF4D4D', background: 'transparent', color: '#FF4D4D', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t.decline}</button>
                      </div>
                    )}
                    {c.status === 'accepted' && (
                      <button onClick={() => setQrCollab(c)} style={{ width: '100%', padding: '10px', borderRadius: '20px', border: 'none', background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme?.color, fontWeight: '700', fontSize: '13px', cursor: 'pointer', marginTop: '12px' }}>
                        {t.generateQR}
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}

            {sent.length > 0 && (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px', marginTop: '16px' }}>{t.sent}</p>
                {sent.map(c => (
                  <div key={c.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: statusBadge(c.status).color, fontWeight: '700' }}>{statusBadge(c.status).label}</span>
                    </div>
                    <MiniProfile profile={c.receiverProfile} />
                    <p style={{ color: subText, fontSize: '12px', fontStyle: 'italic', marginBottom: c.status === 'accepted' ? '12px' : '0', borderLeft: `2px solid ${cardBorder}`, paddingLeft: '8px' }}>{c.message || (isEn ? 'No message' : 'Pas de message')}</p>
                    {c.status === 'accepted' && (
                      <button onClick={() => setQrCollab(c)} style={{ width: '100%', padding: '10px', borderRadius: '20px', border: 'none', background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme?.color, fontWeight: '700', fontSize: '13px', cursor: 'pointer', marginTop: '12px' }}>
                        {t.generateQR}
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}

            {received.length === 0 && sent.length === 0 && (
              <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '20px', textAlign: 'center', marginTop: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤝</div>
                <p style={{ fontWeight: '700', marginBottom: '4px', color: theme?.color }}>{t.noMatch}</p>
                <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>{t.noMatchSub}</p>
                <button onClick={() => setTab('offres')} style={{ background: theme?.color, color: theme?.bg, border: 'none', borderRadius: '24px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' }}>{t.seeOffers}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}