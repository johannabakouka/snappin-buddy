'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import BuddyProfileScreen from './BuddyProfileScreen';
import Header from './Header';

function getMatchScore(myStyles, theirStyles) {
  if (!myStyles || !theirStyles) return 0;
  const mine = myStyles.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const theirs = theirStyles.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  return mine.filter(s => theirs.includes(s)).length;
}

export default function ExploreScreen({ theme }) {
  const [profiles, setProfiles] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [activeBuddy, setActiveBuddy] = useState(null);
  const [filter, setFilter] = useState('match');
  const darkMode = theme?.dark ?? true;
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const subText = darkMode ? '#666' : '#888';
  const tagColor = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const tagBorder = darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';
  const avatarBg = darkMode ? '#2C2C2C' : '#CCC';

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

  if (activeBuddy) return <BuddyProfileScreen buddy={activeBuddy} onBack={() => setActiveBuddy(null)} theme={theme} />;

  let displayed = profiles.filter(p => myProfile ? p.user_id !== myProfile.user_id : true);
  if (filter === 'dispo') displayed = displayed.filter(p => p.status === 'dispo');
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

  const pillStyle = (active) => ({
    padding: '7px 16px', borderRadius: '20px',
    border: `1px solid ${active ? (darkMode ? 'white' : '#111') : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')}`,
    background: active ? (darkMode ? 'white' : '#111') : 'transparent',
    color: active ? (darkMode ? '#000' : '#fff') : (darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
    fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color }}>
      <Header theme={theme} />
      <div style={{ padding: '24px 16px 100px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', color: theme?.color }}>Explorer</h2>
        <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>Créatifs autour de toi</p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button onClick={() => setFilter('match')} style={pillStyle(filter === 'match')}>⚡ Match</button>
          <button onClick={() => setFilter('dispo')} style={pillStyle(filter === 'dispo')}>🟢 Dispo</button>
          <button onClick={() => setFilter('all')} style={pillStyle(filter === 'all')}>Tous</button>
        </div>

        <p style={{ color: subText, fontSize: '11px', marginBottom: '16px', letterSpacing: '1px' }}>
          {displayed.length} CRÉATIF{displayed.length > 1 ? 'S' : ''}
          {filter === 'match' && myProfile?.styles ? ' · TRIÉS PAR COMPATIBILITÉ' : ''}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayed.map(p => {
            const score = getMatchScore(myProfile?.styles, p.styles);
            const matchStyles = myProfile?.styles
              ? (p.styles || '').split(',').map(s => s.trim()).filter(s => myProfile.styles.toLowerCase().includes(s.toLowerCase()))
              : [];

            return (
              <div key={p.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden' }}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt={p.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '◉'
                    }
                  </div>
                  {score > 0 && (
                    <div style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      background: '#3DFF8F', color: '#000',
                      borderRadius: '10px', padding: '1px 5px',
                      fontSize: '9px', fontWeight: '900',
                    }}>{score}✓</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px', color: theme?.color }}>{p.username}</span>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: p.status === 'dispo' ? '#3DFF8F' : p.status === 'shoot' ? '#FFD700' : '#FF4D4D', display: 'inline-block' }}/>
                    <span style={{ fontSize: '11px', color: p.status === 'dispo' ? '#3DFF8F' : p.status === 'shoot' ? '#FFD700' : '#FF4D4D' }}>
                      {p.status === 'dispo' ? 'Disponible' : p.status === 'shoot' ? 'En shoot' : 'Indispo'}
                    </span>
                  </div>
                  <div style={{ color: subText, fontSize: '12px', marginTop: '2px' }}>{p.handle} · {p.zone}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {(p.styles || '').split(',').map(s => {
                      const isMatch = matchStyles.includes(s.trim());
                      return (
                        <span key={s} style={{
                          fontSize: '11px',
                          color: isMatch ? (darkMode ? 'white' : '#111') : tagColor,
                          border: `1px solid ${isMatch ? (darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)') : tagBorder}`,
                          borderRadius: '20px', padding: '2px 10px',
                          background: isMatch ? (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
                          fontWeight: isMatch ? '700' : '400',
                        }}>{s.trim()}</span>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => setActiveBuddy(p)} style={{ background: theme?.color, color: theme?.bg, border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Voir</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}