'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Header from './Header';
import QRScreen from './QRScreen';
import OfferForm from './OfferForm';
import BuddyProfileScreen from './BuddyProfileScreen';
import { useT, useRoles, useUnivers } from '../i18n';

export default function MatchScreen({ theme, setScreen }) {
  const t = useT();
  const isEn = t.map === 'Map';
  const ROLES = useRoles();
  const UNIVERS = useUnivers();
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
  const [editingOffer, setEditingOffer] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [offerCandidates, setOfferCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [appliedOffers, setAppliedOffers] = useState(new Set());
  const [viewingBuddy, setViewingBuddy] = useState(null);

  const [filterRole, setFilterRole] = useState(null);
  const [filterUnivers, setFilterUnivers] = useState(null);
  const [filterZone, setFilterZone] = useState('');
  const [sortBy, setSortBy] = useState('match');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadCollabs(data.user.id);
        loadOffers(data.user.id);
        loadApplied(data.user.id);
        supabase.from('profiles').select('*').eq('user_id', data.user.id).single().then(({ data: p }) => setMyProfile(p));
      }
    });
  }, []);

  async function loadApplied(userId) {
    const { data } = await supabase.from('collabs').select('message').eq('sender_id', userId);
    if (data) {
      const titles = data.map(c => {
        const match = c.message?.match(/: (.+)$/);
        return match ? match[1] : null;
      }).filter(Boolean);
      setAppliedOffers(new Set(titles));
    }
  }

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
    const { data: all } = await supabase.from('offers').select('*').neq('user_id', userId).order('created_at', { ascending: false });
    const { data: mine } = await supabase.from('offers').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (all) {
      const userIds = all.map(o => o.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url, role').in('user_id', userIds);
      setOffers(all.map(o => ({ ...o, authorProfile: profiles?.find(p => p.user_id === o.user_id) })));
    }
    if (mine) setMyOffers(mine);
  }

  async function openOfferCandidates(offer) {
    setSelectedOffer(offer);
    setLoadingCandidates(true);
    const { data: collabs } = await supabase.from('collabs').select('*').eq('receiver_id', user.id).ilike('message', `%${offer.title}%`).order('created_at', { ascending: false });
    if (collabs && collabs.length > 0) {
      const senderIds = collabs.map(c => c.sender_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, handle, role, avatar_url, styles, zone, bio, portfolio_urls').in('user_id', senderIds);
      setOfferCandidates(collabs.map(c => ({ ...c, senderProfile: profiles?.find(p => p.user_id === c.sender_id) })));
    } else setOfferCandidates([]);
    setLoadingCandidates(false);
  }

  async function closeOffer(offerId) {
    await supabase.from('offers').update({ status: 'closed' }).eq('id', offerId);
    loadOffers(user.id);
  }

  async function boostOffer(offer, days, priceInCents) {
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: offer.id, offerTitle: offer.title, boostDays: days, price: priceInCents }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert(isEn ? 'Payment error, try again.' : 'Erreur de paiement, réessaie.');
    }
  }

  async function handleSaveOffer(fields) {
    if (editingOffer) {
      await supabase.from('offers').update(fields).eq('id', editingOffer.id);
      setEditingOffer(null);
    } else {
      await supabase.from('offers').insert({ user_id: user.id, ...fields, status: 'open' });
      setShowNewOffer(false);
    }
    loadOffers(user.id);
  }

  async function applyToOffer(o) {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    await supabase.from('collabs').insert({
      sender_id: u.id,
      receiver_id: o.user_id,
      message: `${isEn ? 'Application for' : 'Candidature pour'} : ${o.title}`,
      status: 'pending'
    });
    setAppliedOffers(prev => new Set([...prev, o.title]));
  }

  function getMatchScore(offer) {
    if (!myProfile) return 0;
    let score = 0;
    if (offer.role_needed && myProfile.role) {
      const roles = offer.role_needed.split(',').map(r => r.trim());
      if (roles.includes(myProfile.role)) score += 3;
    }
    if (offer.styles_needed && myProfile.styles) {
      const os = offer.styles_needed.toLowerCase().split(',').map(s => s.trim());
      const ms = myProfile.styles.toLowerCase().split(',').map(s => s.trim());
      score += os.filter(s => ms.includes(s)).length;
    }
    return score;
  }

  let displayedOffers = [...offers];
  if (filterRole) displayedOffers = displayedOffers.filter(o => o.role_needed?.includes(filterRole));
  if (filterUnivers) {
    const filterFR = isEn ? (() => { try { const { UNIVERS_FR: fr, UNIVERS_EN: en } = require('../constants'); const i = en.indexOf(filterUnivers); return i >= 0 ? fr[i] : filterUnivers; } catch { return filterUnivers; } })() : filterUnivers;
    displayedOffers = displayedOffers.filter(o => (o.styles_needed || '').toLowerCase().includes(filterFR.toLowerCase()));
  }
  if (filterZone) displayedOffers = displayedOffers.filter(o => (o.zone || '').toLowerCase().includes(filterZone.toLowerCase()));
  if (sortBy === 'match') displayedOffers = displayedOffers.sort((a, b) => {
    const boostedA = a.boosted_until && new Date(a.boosted_until) > new Date() ? 1 : 0;
    const boostedB = b.boosted_until && new Date(b.boosted_until) > new Date() ? 1 : 0;
    if (boostedB !== boostedA) return boostedB - boostedA;
    return getMatchScore(b) - getMatchScore(a);
  });

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

  function MiniProfile({ profile, onViewFull }) {
    if (!profile) return null;
    const portfolio = profile.portfolio_urls || [];
    return (
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            onClick={onViewFull ? () => onViewFull(profile) : undefined}
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#CCC', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: onViewFull ? 'pointer' : 'default' }}>
            {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: '700', fontSize: '14px', color: theme?.color }}>{profile.username}</p>
            <p style={{ fontSize: '11px', color: subText }}>{profile.role}{profile.zone ? ` · ${profile.zone}` : ''}</p>
          </div>
          {onViewFull && (
            <button onClick={() => onViewFull(profile)} style={{ background: 'none', border: `1px solid ${cardBorder}`, color: subText, borderRadius: '12px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer', flexShrink: 0 }}>
              {isEn ? 'View profile' : 'Voir profil'}
            </button>
          )}
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

  if (viewingBuddy) return (
    <BuddyProfileScreen
      buddy={viewingBuddy}
      onBack={() => setViewingBuddy(null)}
      theme={theme}
    />
  );

  if (qrCollab) return <QRScreen collab={qrCollab} user={user} myProfile={received.find(c => c.id === qrCollab.id)?.senderProfile || sent.find(c => c.id === qrCollab.id)?.receiverProfile} theme={theme} onBack={() => setQrCollab(null)} />;

  if (showNewOffer) return (
    <OfferForm theme={theme} isEdit={false} editingOffer={null} onClose={() => setShowNewOffer(false)} onSave={handleSaveOffer} onCloseOffer={null} />
  );

  if (editingOffer) return (
    <OfferForm theme={theme} isEdit={true} editingOffer={editingOffer} onClose={() => setEditingOffer(null)} onSave={handleSaveOffer} onCloseOffer={async () => { await closeOffer(editingOffer.id); setEditingOffer(null); }} />
  );

  if (selectedOffer) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color }}>
      <div style={{ padding: '16px', borderBottom: `1px solid ${cardBorder}`, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => setSelectedOffer(null)} style={{ background: 'none', border: 'none', color: theme?.color, fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: '800', fontSize: '15px', color: theme?.color }}>{selectedOffer.title}</p>
          <p style={{ fontSize: '11px', color: subText }}>{offerCandidates.length} {isEn ? 'application(s)' : 'candidature(s)'}</p>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>
        {loadingCandidates ? (
          <p style={{ color: subText, textAlign: 'center', marginTop: '40px' }}>...</p>
        ) : offerCandidates.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>📭</p>
            <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>{isEn ? 'No applications yet' : 'Pas encore de candidatures'}</p>
            <p style={{ color: subText, fontSize: '13px' }}>{isEn ? 'Share your offer to get applications!' : 'Partage ton offre pour recevoir des candidatures !'}</p>
          </div>
        ) : (
          offerCandidates.map(c => (
            <div key={c.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: statusBadge(c.status).color, fontWeight: '700' }}>{statusBadge(c.status).label}</span>
                <span style={{ fontSize: '10px', color: subText }}>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <MiniProfile profile={c.senderProfile} onViewFull={(p) => setViewingBuddy(p)} />
              {c.message && (
                <p style={{ color: subText, fontSize: '12px', fontStyle: 'italic', borderLeft: `2px solid ${cardBorder}`, paddingLeft: '8px', marginBottom: '12px' }}>{c.message}</p>
              )}
              {c.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { respondCollab(c.id, 'accepted', c.sender_id); setSelectedOffer(null); }} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: '#2ECC71', color: '#000', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t.accept}</button>
                  <button onClick={() => { respondCollab(c.id, 'declined', null); openOfferCandidates(selectedOffer); }} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #FF4D4D', background: 'transparent', color: '#FF4D4D', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t.decline}</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color, position: 'relative' }}>
      <Header theme={theme} />

      <div style={{ display: 'flex', borderBottom: `1px solid ${cardBorder}`, flexShrink: 0 }}>
        <button style={tabStyle(tab === 'offres')} onClick={() => setTab('offres')}>{t.offers}</button>
        <button style={tabStyle(tab === 'match')} onClick={() => setTab('match')}>{t.matchTab}</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 100px' }}>

        {tab === 'offres' && (
          <>
            <button onClick={() => setShowNewOffer(true)} style={{ width: '100%', padding: '14px', borderRadius: '14px', marginBottom: '16px', border: `1.5px dashed ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: 'transparent', color: theme?.color, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {t.postOffer}
            </button>

            {myOffers.length > 0 && (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>{t.myOffers}</p>
                {myOffers.map(o => {
                  const isBoosted = o.boosted_until && new Date(o.boosted_until) > new Date();
                  return (
                    <div key={o.id} onClick={() => openOfferCandidates(o)} style={{ background: card, border: `1px solid ${isBoosted ? '#F0B429' : cardBorder}`, borderRadius: '14px', padding: '14px', marginBottom: '10px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            {isBoosted && <span style={{ fontSize: '10px', background: 'linear-gradient(135deg, #F0B429, #FF6B35)', color: '#000', borderRadius: '8px', padding: '1px 6px', fontWeight: '700' }}>🚀 Boostée</span>}
                            <p style={{ fontWeight: '800', color: theme?.color }}>{o.title}</p>
                          </div>
                          {o.role_needed && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                              {o.role_needed.split(',').map(r => r.trim()).filter(Boolean).map(r => {
                                const role = ROLES.find(x => x.id === r);
                                return <span key={r} style={{ fontSize: '11px', color: subText }}>{role?.icon} {role?.label || r}</span>;
                              })}
                            </div>
                          )}
                          {o.zone && <span style={{ fontSize: '11px', color: subText }}> · {o.zone}</span>}
                          {o.date && <span style={{ fontSize: '11px', color: subText }}> · {o.date}</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: o.status === 'open' ? '#2ECC71' : subText, fontWeight: '700' }}>
                            {o.status === 'open' ? (isEn ? 'Open' : 'Ouverte') : (isEn ? 'Closed' : 'Fermée')}
                          </span>
                          <span style={{ fontSize: '10px', color: subText }}>
                            {isEn ? 'See applications →' : 'Voir candidatures →'}
                          </span>
                          <button onClick={e => { e.stopPropagation(); setEditingOffer(o); }} style={{ background: 'none', border: `1px solid ${cardBorder}`, color: theme?.color, borderRadius: '12px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                            ✏️ {isEn ? 'Edit' : 'Modifier'}
                          </button>
                          {o.status === 'open' && !isBoosted && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={e => { e.stopPropagation(); boostOffer(o, 1, 199); }} style={{ background: 'linear-gradient(135deg, #F0B429, #FF6B35)', border: 'none', color: '#000', borderRadius: '12px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                                🚀 1j 1,99€
                              </button>
                              <button onClick={e => { e.stopPropagation(); boostOffer(o, 7, 499); }} style={{ background: 'linear-gradient(135deg, #F0B429, #FF6B35)', border: 'none', color: '#000', borderRadius: '12px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                                🚀 7j 4,99€
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginBottom: '16px' }} />
              </>
            )}

            <div style={{ marginBottom: '12px' }}>
              <input value={filterZone} onChange={e => setFilterZone(e.target.value)}
                placeholder={isEn ? '📍 City or country...' : '📍 Ville ou pays...'}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '20px', border: `1px solid ${cardBorder}`, background: inputBg, color: theme?.color, fontSize: '12px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                <button onClick={() => setSortBy('match')} style={pillStyle(sortBy === 'match')}>⚡ {isEn ? 'For you' : 'Pour toi'}</button>
                <button onClick={() => setSortBy('recent')} style={pillStyle(sortBy === 'recent')}>🕐 {isEn ? 'Recent' : 'Récent'}</button>
                {ROLES.slice(0, 6).map(r => (
                  <button key={r.id} onClick={() => setFilterRole(filterRole === r.id ? null : r.id)} style={pillStyle(filterRole === r.id)}>{r.icon} {r.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {UNIVERS.map(s => (
                  <button key={s} onClick={() => setFilterUnivers(filterUnivers === s ? null : s)} style={pillStyle(filterUnivers === s)}>{s}</button>
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
                  const isBoosted = o.boosted_until && new Date(o.boosted_until) > new Date();
                  const hasApplied = appliedOffers.has(o.title);
                  return (
                    <div key={o.id} style={{ background: card, border: `1px solid ${isBoosted ? '#F0B429' : score > 0 && o.status === 'open' ? (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)') : cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '12px', opacity: o.status === 'closed' ? 0.7 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#CCC', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                          {o.authorProfile?.avatar_url ? <img src={o.authorProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: '700', fontSize: '13px', color: theme?.color }}>{o.authorProfile?.username || (isEn ? 'Creative' : 'Créatif')}</p>
                          <p style={{ fontSize: '11px', color: subText }}>{o.authorProfile?.role}</p>
                        </div>
                        {isBoosted && <span style={{ fontSize: '10px', background: 'linear-gradient(135deg, #F0B429, #FF6B35)', color: '#000', borderRadius: '8px', padding: '2px 8px', fontWeight: '700' }}>🚀 Boost</span>}
                        {score > 0 && o.status === 'open' && !isBoosted && (
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
                          return <span key={r} style={{ fontSize: '11px', color: isMyRole ? '#000' : theme?.color, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px', fontWeight: '700', background: isMyRole ? '#2ECC71' : 'transparent' }}>{role?.icon} {role?.label || r}</span>;
                        })}
                        {o.styles_needed && o.styles_needed.split(',').map(s => s.trim()).filter(Boolean).map(s => {
                          const isMyStyle = myProfile?.styles?.toLowerCase().includes(s.toLowerCase());
                          return <span key={s} style={{ fontSize: '11px', color: isMyStyle ? theme?.color : subText, border: `1px solid ${isMyStyle ? theme?.color : cardBorder}`, borderRadius: '20px', padding: '3px 10px', fontWeight: isMyStyle ? '700' : '400' }}>{s}</span>;
                        })}
                        {o.zone && <span style={{ fontSize: '11px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px' }}>📍 {o.zone}</span>}
                        {o.date && <span style={{ fontSize: '11px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px' }}>📅 {o.date}</span>}
                      </div>
                      {o.status === 'open' ? (
                        hasApplied ? (
                          <div style={{ width: '100%', padding: '10px', borderRadius: '20px', background: darkMode ? 'rgba(46,204,113,0.1)' : 'rgba(46,204,113,0.1)', color: '#2ECC71', fontSize: '13px', fontWeight: '700', textAlign: 'center', border: '1px solid rgba(46,204,113,0.3)' }}>
                            ✓ {isEn ? 'Applied' : 'Déjà postulé'}
                          </div>
                        ) : (
                          <button onClick={() => applyToOffer(o)} style={{ width: '100%', padding: '10px', borderRadius: '20px', border: 'none', background: theme?.color, color: theme?.bg, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                            {t.applyOffer}
                          </button>
                        )
                      ) : (
                        <div style={{ width: '100%', padding: '10px', borderRadius: '20px', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: subText, fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
                          🔒 {isEn ? 'No longer accepting applications' : "N'accepte plus de candidatures"}
                        </div>
                      )}
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
                    <MiniProfile profile={c.senderProfile} onViewFull={(p) => setViewingBuddy(p)} />
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