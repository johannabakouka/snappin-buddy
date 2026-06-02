'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import BuddyProfileScreen from './BuddyProfileScreen';
import { ROLE_FILTERS, UNIVERS } from '../constants';

function fuzzPosition(lat, lng) {
  const r = 0.004;
  const angle = Math.random() * 2 * Math.PI;
  const dist = Math.random() * r;
  return {
    lat: lat + dist * Math.cos(angle),
    lng: lng + dist * Math.sin(angle),
  };
}

const STATUS_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'dispo', label: '🟢 Dispo' },
  { id: 'shoot', label: '🟡 En shoot' },
];

const MAP_ROLE_FILTERS = ROLE_FILTERS.map(r => ({ id: r.id, label: r.icon }));

export default function MapComponent({ theme }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const darkMode = theme?.dark ?? true;
  const [selectedBuddy, setSelectedBuddy] = useState(null);
  const [popupBuddy, setPopupBuddy] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [universFilter, setUniversFilter] = useState(null);
  const [roleFilter, setRoleFilter] = useState(null);
  const [L, setL] = useState(null);
  const [showGeoPrompt, setShowGeoPrompt] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('geoAsked');
  });

  async function initMap(askGeo = false) {
    if (mapInstance.current) return;
    import('leaflet').then(async (LeafletModule) => {
      import('leaflet/dist/leaflet.css');
      const map = LeafletModule.map(mapRef.current, { zoomControl: false }).setView([48.8566, 2.3522], 13);
      mapInstance.current = map;

      LeafletModule.tileLayer(
        darkMode
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap, © CARTO', maxZoom: 20 }
      ).addTo(map);

      LeafletModule.control.zoom({ position: 'bottomright' }).addTo(map);
      setL(LeafletModule);

      const { data: profileData } = await supabase.from('profiles').select('*');
      const { data: { user } } = await supabase.auth.getUser();

      if (profileData) {
        setProfiles(profileData.map(p => ({ ...p, _isMe: user && p.user_id === user.id })));
      }

      if (askGeo && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async pos => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 14);
          if (user) {
            const fuzzed = fuzzPosition(latitude, longitude);
            await supabase.from('profiles').update({ lat: fuzzed.lat, lng: fuzzed.lng }).eq('user_id', user.id);
          }
        });
      }
    });
  }

  useEffect(() => {
    if (!showGeoPrompt) initMap(true);
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  function handleAllow() {
    localStorage.setItem('geoAsked', 'true');
    setShowGeoPrompt(false);
    initMap(true);
  }

  function handleDeny() {
    localStorage.setItem('geoAsked', 'true');
    setShowGeoPrompt(false);
    initMap(false);
  }

  useEffect(() => {
    if (!L || !mapInstance.current || profiles.length === 0) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filtered = profiles.filter(p => {
      if (!p.lat || !p.lng) return false;
      if (p._isMe) return true;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (universFilter && !(p.styles || '').toLowerCase().includes(universFilter.toLowerCase())) return false;
      if (roleFilter && p.role?.toLowerCase() !== roleFilter.toLowerCase()) return false;
      return true;
    });

    filtered.forEach(p => {
      const statusColor = p.status === 'shoot' ? '#FFD700' : p.status === 'indispo' ? '#FF4D4D' : '#2ECC71';

      if (p._isMe) {
        const meIcon = L.divIcon({
          className: '',
          html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:44px;height:44px;border-radius:50%;background:#FFFFFF;border:3px solid #0A0A0A;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#0A0A0A;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;">
              ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />` : 'MOI'}
            </div>
            <span style="font-size:10px;font-weight:700;color:${darkMode ? 'white' : '#111'};background:${darkMode ? 'rgba(10,10,10,0.7)' : 'rgba(245,245,245,0.8)'};padding:1px 6px;border-radius:8px;white-space:nowrap;">Vous</span>
          </div>`,
          iconSize: [44, 60], iconAnchor: [22, 22],
        });
        const m = L.marker([p.lat, p.lng], { icon: meIcon }).addTo(mapInstance.current);
        markersRef.current.push(m);
      } else {
        const fuzzed = fuzzPosition(p.lat, p.lng);
        const buddyIcon = L.divIcon({
          className: '',
          html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;">
            <div style="width:44px;height:44px;border-radius:50%;background:${darkMode ? '#1A1A1A' : '#fff'};border:3px solid ${statusColor};display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,0.25);overflow:hidden;">
              ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />` : '◉'}
            </div>
            <span style="font-size:10px;font-weight:700;color:${darkMode ? 'white' : '#111'};background:${darkMode ? 'rgba(10,10,10,0.7)' : 'rgba(245,245,245,0.8)'};padding:1px 6px;border-radius:8px;white-space:nowrap;">${(p.username || '').toUpperCase()}</span>
          </div>`,
          iconSize: [44, 64], iconAnchor: [22, 22],
        });
        const m = L.marker([fuzzed.lat, fuzzed.lng], { icon: buddyIcon }).addTo(mapInstance.current);
        m.on('click', () => setPopupBuddy(p));
        markersRef.current.push(m);
      }
    });
  }, [L, profiles, statusFilter, universFilter, roleFilter]);

  const statusColor = popupBuddy?.status === 'shoot' ? '#FFD700' : popupBuddy?.status === 'indispo' ? '#FF4D4D' : '#2ECC71';
  const statusLabel = popupBuddy?.status === 'shoot' ? 'En shoot' : popupBuddy?.status === 'indispo' ? 'Indisponible' : 'Disponible';
  const popupStyles = (popupBuddy?.styles || '').split(',').map(s => s.trim()).filter(Boolean);

  const pillStyle = (active) => ({
    padding: '6px 12px', borderRadius: '20px',
    border: `1px solid ${active ? (darkMode ? 'white' : '#111') : (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')}`,
    background: active ? (darkMode ? 'white' : '#111') : 'transparent',
    color: active ? (darkMode ? '#000' : '#fff') : (darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'),
    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
  });

  const sep = <div style={{ width: '1.5px', background: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', margin: '0 4px', flexShrink: 0, borderRadius: '2px' }} />;

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <div ref={mapRef} style={{ height: '100vh', width: '100%' }} />

      {/* Prompt géolocalisation */}
      {showGeoPrompt && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 3000, background: darkMode ? 'rgba(10,10,10,0.96)' : 'rgba(245,245,245,0.96)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: darkMode ? '#1A1A1A' : '#FFFFFF',
            borderRadius: '24px', padding: '32px 24px', maxWidth: '320px', width: '100%',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺</div>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: darkMode ? 'white' : '#111', marginBottom: '12px', fontFamily: 'var(--font-nunito)' }}>
              Trouve les créatifs autour de toi
            </h3>
            <p style={{ fontSize: '13px', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', lineHeight: 1.6, marginBottom: '24px' }}>
              Snappin&apos;Buddy utilise ta position pour afficher les buddies dans ton quartier. Ta position exacte n&apos;est jamais partagée — elle est floutée à ~400m.
            </p>
            <button onClick={handleAllow} style={{
              width: '100%', padding: '14px', borderRadius: '24px', border: 'none',
              background: darkMode ? 'white' : '#111',
              color: darkMode ? 'black' : 'white',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '10px',
            }}>
              📍 Autoriser la localisation
            </button>
            <button onClick={handleDeny} style={{
              width: '100%', padding: '14px', borderRadius: '24px',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
              background: 'transparent',
              color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}>
              Pas maintenant
            </button>
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: darkMode
          ? 'linear-gradient(to bottom, rgba(10,10,10,0.98) 0%, rgba(10,10,10,0.0) 100%)'
          : 'linear-gradient(to bottom, rgba(245,245,245,0.98) 0%, rgba(245,245,245,0.0) 100%)',
        paddingBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0 8px', pointerEvents: 'none' }}>
          <img src={darkMode ? '/logo.png' : '/logo-dark.png'} alt="Snappin'Buddy"
            style={{ height: '36px', objectFit: 'contain', marginRight: '8px' }} />
          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: '22px', fontWeight: '900', color: darkMode ? 'white' : '#111', letterSpacing: '-0.3px' }}>
            Snappin&apos;Buddy
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '0 16px 8px', scrollbarWidth: 'none', alignItems: 'center' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} style={pillStyle(statusFilter === f.id)}>
              {f.label}
            </button>
          ))}
          {sep}
          {MAP_ROLE_FILTERS.map(r => (
            <button key={r.id} onClick={() => setRoleFilter(roleFilter === r.id ? null : r.id)} style={pillStyle(roleFilter === r.id)}>
              {r.label}
            </button>
          ))}
          {sep}
          {UNIVERS.map(s => (
            <button key={s} onClick={() => setUniversFilter(universFilter === s ? null : s)} style={pillStyle(universFilter === s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: '90px', left: '16px',
        background: darkMode ? 'rgba(10,10,10,0.85)' : 'rgba(245,245,245,0.85)',
        borderRadius: '10px', padding: '8px 12px', fontSize: '12px',
        color: darkMode ? '#666' : '#999', zIndex: 1000,
      }}>
        <span style={{ color: '#2ECC71' }}>●</span> Dispo ·{' '}
        <span style={{ color: '#FFD700' }}>●</span> En shoot ·{' '}
        <span style={{ color: '#FF4D4D' }}>●</span> Indispo
      </div>

      {popupBuddy && (
        <div style={{
          position: 'absolute', bottom: '100px', left: '16px', right: '16px',
          zIndex: 2000,
          background: darkMode ? '#1A1A1A' : '#FFFFFF',
          borderRadius: '18px', padding: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: darkMode ? '#2C2C2C' : '#DDD',
              overflow: 'hidden', flexShrink: 0,
              border: `2px solid ${statusColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>
              {popupBuddy.avatar_url
                ? <img src={popupBuddy.avatar_url} alt={popupBuddy.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '◉'
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: '900', fontSize: '17px', color: darkMode ? 'white' : '#111' }}>
                {popupBuddy.username}
              </div>
              <div style={{ fontSize: '11px', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontWeight: '600' }}>
                {popupBuddy.role && <span style={{ marginRight: '6px' }}>{popupBuddy.role}</span>}
                {popupStyles.length > 0 && popupStyles.join(' · ')}
              </div>
            </div>
            <button onClick={() => setPopupBuddy(null)} style={{
              background: 'none', border: 'none',
              color: darkMode ? '#555' : '#999',
              fontSize: '16px', cursor: 'pointer', lineHeight: 1, flexShrink: 0,
            }}>✕</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: '11px', color: statusColor, fontWeight: '700' }}>{statusLabel}</span>
          </div>

          {popupBuddy.bio && (
            <p style={{
              color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              fontSize: '12px', fontStyle: 'italic', lineHeight: 1.5,
              borderLeft: '2.5px solid rgba(128,128,128,0.3)',
              paddingLeft: '8px', marginBottom: '14px',
            }}>
              « {popupBuddy.bio} »
            </p>
          )}

          <button
            onClick={() => { setSelectedBuddy(popupBuddy); setPopupBuddy(null); }}
            style={{
              width: '100%', padding: '11px', borderRadius: '24px', border: 'none',
              background: darkMode ? 'white' : '#111',
              color: darkMode ? 'black' : 'white',
              fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            }}
          >
            Voir le profil →
          </button>
        </div>
      )}

      {selectedBuddy && (
        <BuddyProfileScreen
          buddy={selectedBuddy}
          onBack={() => setSelectedBuddy(null)}
          theme={theme}
        />
      )}
    </div>
  );
}