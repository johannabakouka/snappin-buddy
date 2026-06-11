'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import BuddyProfileScreen from './BuddyProfileScreen';
import Header from './Header';
import { ROLE_ICONS } from '../constants';
import { useT, useRoles, useUnivers } from '../i18n';

function getMatchScore(myStyles, theirStyles) {
  if (!myStyles || !theirStyles) return 0;
  const mine = myStyles.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const theirs = theirStyles.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  return mine.filter(s => theirs.includes(s)).length;
}

export default function ExploreScreen({ theme }) {
  const t = useT();
  const ROLES = useRoles();
  const UNIVERS = useUnivers();
  const [profiles, setProfiles] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [activeBuddy, setActiveBuddy] = useState(null);
  const [filter, setFilter] = useState('match');
  const [roleFilter, setRoleFilter] = useState(null);
  const [universFilter, setUniversFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const scrollRef = useRef(null);
  const searchRef = useRef(null);
  const darkMode = theme?.dark ?? true;
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const subText = darkMode ? '#666' : '#888';
  const tagColor = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const tagBorder = darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';
  const avatarBg = darkMode ? '#2C2C2C' : '#CCC';
  const isEn = t.map === 'Map';

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: me } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
        setMyProfile(me);
      }
      const { data } = await supabase.from('profiles').select('*');
      if (data) setProfiles(data);
    }
    loadData();
  }, []);

  function handleSearchChange(val) {
    setSearch(val);
    if (val.length >= 1) {
      const q = val.toLowerCase();
      const filtered = profiles
        .filter(p => myProfile ? p.user_id !== myProfile.user_id : true)
        .filter(p =>
          (p.username || '').toLowerCase().startsWith(q) ||
          (p.handle || '').toLowerCase().startsWith(q)
        )
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function selectSuggestion(p) {
    setSearch(p.username);
    setShowSuggestions(false);
    setActiveBuddy(p);
  }

  if (activeBuddy) return <BuddyProfileScreen buddy={activeBuddy} onBack={() => setActiveBuddy(null)} theme={theme} />;

  let displayed = profiles.filter(p => myProfile ? p.user_id !== myProfile.user_id : true);

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    displayed = displayed.filter(p =>
      (p.username || '').toLowerCase().includes(q) ||
      (p.handle || '').toLowerCase().includes(q) ||
      (p.role || '').toLowerCase().includes(q)
    );
  } else {
    if (filter === 'dispo') displayed = displayed.filter(p => p.status === 'dispo');
    if (roleFilter) displayed = displayed.filter(p => p.role?.toLowerCase() === roleFilter.toLowerCase());
    if (universFilter) {
      const { UNIVERS_FR, UNIVERS_EN } = require('../constants');
      const filterFR = isEn ? (() => { const i = UNIVERS_EN.indexOf(universFilter); return i >= 0 ? UNIVERS_FR[i] : universFilter; })() : universFilter;
      displayed = displayed.filter(p => (p.styles || '').toLowerCase().includes(filterFR.toLowerCase()));
    }
    if (filter === 'match') {
      displayed = [...displayed].sort((a, b) => {
        const scoreB = getMatchScore(myProfile?.styles, b.styles);
        const scoreA = getMatchScore(myProfile?.styles, a.styles);
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (a.status === 'dispo' && b.status !== 'dispo') return -1;
        if (b.status === 'dispo' && a.status !== 'dispo') return 1;
        return 0;
      });
    }
  }

  const pillStyle = (active) => ({
    padding: '7px 14px', borderRadius: '20px',
    border: `1px solid ${active ? (darkMode ? 'white' : '#111') : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')}`,
    background: active ? (darkMode ? 'white' : '#111') : 'transparent',
    color: active ? (darkMode ? '#000' : '#fff') : (darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
    fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  });

  const statusLabel = (status) => {
    if (status === 'dispo') return isEn ? 'Available' : 'Dispo';
    if (status === 'shoot') return isEn ? 'On shoot' : 'En shoot';
    return isEn ? 'Unavailable' : 'Indispo';
  };

  return (
    <div ref={scrollRef} style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color }}>
      <Header theme={theme} onLogoClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} />
      <div style={{ padding: '24px 16px 100px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', color: theme?.color }}>{t.exploreTitle}</h2>
        <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>{t.exploreSubtitle}</p>

        <div style={{ position: 'relative', marginBottom: '14px' }} ref={searchRef}>
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onFocus={() => search.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={isEn ? '🔍 Search by username, role...' : '🔍 Rechercher par username, rôle...'}
            style={{
              width: '100%', padding: '11px 16px', borderRadius: '24px',
              border: `1px solid ${cardBorder}`,
              background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              color: theme?.color, fontSize: '13px',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
          {showSuggestions && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: darkMode ? '#1A1A1A' : '#fff',
              border: `1px solid ${cardBorder}`,
              borderRadius: '16px', marginTop: '6px',
              overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {suggestions.map(p => (
                <div
                  key={p.user_id}
                  onMouseDown={() => selectSuggestion(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: `1px solid ${cardBorder}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: avatarBg, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
                  </div>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '13px', color: theme?.color }}>{p.username}</p>
                    <p style={{ fontSize: '11px', color: subText }}>{p.role}{p.zone ? ` · ${p.zone}` : ''}</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.status === 'dispo' ? '#2ECC71' : p.status === 'shoot' ? '#FFD700' : '#FF4D4D', display: 'inline-block' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!search.trim() && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              <button onClick={() => setFilter('match')} style={pillStyle(filter === 'match')}>⚡ Match</button>
              <button onClick={() => setFilter('dispo')} style={pillStyle(filter === 'dispo')}>🟢 {isEn ? 'Available' : 'Dispo'}</button>
              <button onClick={() => setFilter('all')} style={pillStyle(filter === 'all')}>{isEn ? 'All' : 'Tous'}</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {ROLES.map(r => (
                <button key={r.id} onClick={() => setRoleFilter(roleFilter === r.id ? null : r.id)} style={pillStyle(roleFilter === r.id)}>
                  {r.icon} {r.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {UNIVERS.map(s => (
                <button key={s} onClick={() => setUniversFilter(universFilter === s ? null : s)} style={pillStyle(universFilter === s)}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        <p style={{ color: subText, fontSize: '11px', marginBottom: '16px', letterSpacing: '1px' }}>
          {displayed.length} {isEn ? 'CREATIVE' : 'CRÉATIF'}{displayed.length > 1 ? 'S' : ''}
          {!search.trim() && filter === 'match' && myProfile?.styles ? t.sortedByMatch : ''}
          {!search.trim() && roleFilter ? ` · ${roleFilter.toUpperCase()}` : ''}
          {!search.trim() && universFilter ? ` · ${universFilter.toUpperCase()}` : ''}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayed.map(p => {
            const score = getMatchScore(myProfile?.styles, p.styles);
            const matchStyles = myProfile?.styles
              ? (p.styles || '').split(',').map(s => s.trim()).filter(s => myProfile.styles.toLowerCase().includes(s.toLowerCase()))
              : [];
            const roleIcon = ROLE_ICONS[p.role?.toLowerCase()] || '✨';
            const portfolio = p.portfolio_urls || [];
            const roleObj = ROLES.find(r => r.id === p.role?.toLowerCase());
            const roleLabel = roleObj?.label || p.role || '';

            return (
              <div key={p.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden' }}>
                      {p.avatar_url ? <img src={p.avatar_url} alt={p.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
                    </div>
                    {score > 0 && !search.trim() && (
                      <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#2ECC71', color: '#000', borderRadius: '10px', padding: '1px 5px', fontSize: '9px', fontWeight: '900' }}>{score}✓</div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: theme?.color }}>{p.username}</span>
                      <span style={{ fontSize: '13px' }}>{roleIcon}</span>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.status === 'dispo' ? '#2ECC71' : p.status === 'shoot' ? '#FFD700' : '#FF4D4D', display: 'inline-block' }}/>
                      <span style={{ fontSize: '11px', color: p.status === 'dispo' ? '#2ECC71' : p.status === 'shoot' ? '#FFD700' : '#FF4D4D' }}>
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    <div style={{ color: subText, fontSize: '12px', marginTop: '2px' }}>
                      {roleLabel && <span style={{ marginRight: '6px' }}>{roleLabel}</span>}
                      {p.zone && <span>· {p.zone}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {(p.styles || '').split(',').map(s => {
                        const sClean = s.trim();
                        if (!sClean) return null;
                        const isMatch = matchStyles.includes(sClean);
                        let displayTag = sClean;
                        if (isEn) {
                          const { UNIVERS_FR, UNIVERS_EN } = require('../constants');
                          const idx = UNIVERS_FR.indexOf(sClean);
                          if (idx >= 0) displayTag = UNIVERS_EN[idx];
                        }
                        return (
                          <span key={s} style={{
                            fontSize: '11px',
                            color: isMatch ? (darkMode ? 'white' : '#111') : tagColor,
                            border: `1px solid ${isMatch ? (darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)') : tagBorder}`,
                            borderRadius: '20px', padding: '2px 10px',
                            background: isMatch ? (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
                            fontWeight: isMatch ? '700' : '400',
                          }}>{displayTag}</span>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={() => setActiveBuddy(p)} style={{ background: theme?.color, color: theme?.bg, border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                    {isEn ? 'View' : 'Voir'}
                  </button>
                </div>

                {portfolio.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', scrollbarWidth: 'none', padding: '0 16px 12px' }}>
                    {portfolio.map((url, i) => (
                      <img key={i} src={url} alt={`portfolio-${i}`}
                        style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                        onClick={() => setActiveBuddy(p)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {displayed.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</p>
              <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>
                {isEn ? 'No results' : 'Aucun résultat'}
              </p>
              <p style={{ color: subText, fontSize: '13px' }}>
                {isEn ? 'Try a different search' : 'Essaie une autre recherche'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}