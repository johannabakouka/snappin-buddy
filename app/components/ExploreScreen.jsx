'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import BuddyProfileScreen from './BuddyProfileScreen';
import Header from './Header';

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState([]);
  const [activeBuddy, setActiveBuddy] = useState(null);

  useEffect(() => {
    async function loadProfiles() {
      const { data } = await supabase.from('profiles').select('*');
      if (data && data.length > 0) setProfiles(data);
    }
    loadProfiles();
  }, []);

  if (activeBuddy) return <BuddyProfileScreen buddy={activeBuddy} onBack={() => setActiveBuddy(null)} />;

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ padding: '24px 16px 100px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>Explorer</h2>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>Créatifs autour de toi</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {profiles.map(p => (
            <div key={p.id} style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#2C2C2C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>◉</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '15px' }}>{p.username}</span>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: p.is_active ? '#3DFF8F' : '#444', display: 'inline-block' }}/>
                </div>
                <div style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>{p.handle} · {p.zone}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {(p.styles || '').split(',').map(s => (
                    <span key={s} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '20px', padding: '2px 10px' }}>{s.trim()}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => setActiveBuddy(p)} style={{ background: 'white', color: 'black', border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Voir</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}