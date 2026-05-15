'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import BuddyProfileScreen from './BuddyProfileScreen';

export default function MapComponent({ theme }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const darkMode = theme?.dark ?? true;
  const [selectedBuddy, setSelectedBuddy] = useState(null);
  const [popupBuddy, setPopupBuddy] = useState(null);

  useEffect(() => {
    if (mapInstance.current) return;
    import('leaflet').then(async L => {
      import('leaflet/dist/leaflet.css');
      const map = L.map(mapRef.current, { zoomControl: false }).setView([48.8566, 2.3522], 13);
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      // Zoom control en bas à droite
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: { user } } = await supabase.auth.getUser();

      if (profiles) {
        profiles.forEach(p => {
          if (p.lat && p.lng) {
            const isMe = user && p.user_id === user.id;
            const statusColor = p.status === 'shoot' ? '#FFD700' : p.status === 'indispo' ? '#FF4D4D' : '#3DFF8F';
            const styles = (p.styles || '').split(',').map(s => s.trim()).filter(Boolean);

            if (isMe) {
              const meIcon = L.divIcon({
                className: '',
                html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                  <div style="width:44px;height:44px;border-radius:50%;background:#FFFFFF;border:3px solid #0A0A0A;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#0A0A0A;box-shadow:0 2px 8px rgba(0,0,0,0.3);">MOI</div>
                  <span style="font-size:10px;font-weight:700;color:${darkMode ? 'white' : '#111'};background:${darkMode ? 'rgba(10,10,10,0.7)' : 'rgba(245,245,245,0.7)'};padding:1px 6px;border-radius:8px;white-space:nowrap;">Vous</span>
                </div>`,
                iconSize: [44, 60],
                iconAnchor: [22, 22],
              });
              L.marker([p.lat, p.lng], { icon: meIcon }).addTo(map);
            } else {
              const buddyIcon = L.divIcon({
                className: '',
                html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;">
                  <div style="width:44px;height:44px;border-radius:50%;background:${darkMode ? '#1A1A1A' : '#fff'};border:3px solid ${statusColor};display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,0.25);">◉</div>
                  <span style="font-size:10px;font-weight:700;color:${darkMode ? 'white' : '#111'};background:${darkMode ? 'rgba(10,10,10,0.7)' : 'rgba(245,245,245,0.7)'};padding:1px 6px;border-radius:8px;white-space:nowrap;">${(p.username || '').toUpperCase()}</span>
                </div>`,
                iconSize: [44, 64],
                iconAnchor: [22, 22],
              });

              const marker = L.marker([p.lat, p.lng], { icon: buddyIcon }).addTo(map);
              marker.on('click', () => setPopupBuddy(p));
            }
          }
        });
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async pos => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 14);
          if (user) {
            await supabase.from('profiles').update({ lat: latitude, lng: longitude }).eq('user_id', user.id);
          }
        });
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const statusColor = popupBuddy?.status === 'shoot' ? '#FFD700' : popupBuddy?.status === 'indispo' ? '#FF4D4D' : '#3DFF8F';
  const statusLabel = popupBuddy?.status === 'shoot' ? 'En shoot' : popupBuddy?.status === 'indispo' ? 'Indisponible' : 'Disponible';
  const popupStyles = (popupBuddy?.styles || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <div ref={mapRef} style={{ height: '100vh', width: '100%' }} />

      {/* Header flottant */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '14px 0 20px',
        background: darkMode
          ? 'linear-gradient(to bottom, rgba(10,10,10,0.92) 0%, transparent 100%)'
          : 'linear-gradient(to bottom, rgba(245,245,245,0.92) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <img src={darkMode ? '/logo.png' : '/logo-dark.png'} alt="Snappin'Buddy"
          style={{ height: '36px', objectFit: 'contain', marginRight: '8px' }} />
        <span style={{
          fontFamily: 'var(--font-nunito)', fontSize: '22px', fontWeight: '900',
          color: darkMode ? 'white' : '#111', letterSpacing: '-0.3px',
        }}>
          Snappin&apos;Buddy
        </span>
      </div>

      {/* Légende */}
      <div style={{
        position: 'absolute', bottom: '90px', left: '16px',
        background: darkMode ? 'rgba(10,10,10,0.85)' : 'rgba(245,245,245,0.85)',
        borderRadius: '10px', padding: '8px 12px', fontSize: '12px',
        color: darkMode ? '#666' : '#999', zIndex: 1000,
      }}>
        <span style={{ color: '#3DFF8F' }}>●</span> Dispo ·{' '}
        <span style={{ color: '#FFD700' }}>●</span> En shoot ·{' '}
        <span style={{ color: '#FF4D4D' }}>●</span> Indispo
      </div>

      {/* Popup buddy — style maquette */}
      {popupBuddy && (
        <div style={{
          position: 'absolute',
          bottom: '100px', left: '16px', right: '16px',
          zIndex: 2000,
          background: darkMode ? '#1A1A1A' : '#FFFFFF',
          borderRadius: '18px',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        }}>
          {/* Fermer */}
          <button onClick={() => setPopupBuddy(null)} style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'none', border: 'none',
            color: darkMode ? '#555' : '#999',
            fontSize: '16px', cursor: 'pointer', lineHeight: 1,
          }}>✕</button>

          {/* Nom */}
          <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: '900', fontSize: '17px', color: darkMode ? 'white' : '#111', marginBottom: '2px' }}>
            {popupBuddy.username}
          </div>

          {/* Styles */}
          {popupStyles.length > 0 && (
            <div style={{ fontSize: '11px', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', marginBottom: '8px', fontWeight: '600' }}>
              {popupStyles.join(' · ')}
            </div>
          )}

          {/* Statut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: '11px', color: statusColor, fontWeight: '700' }}>{statusLabel}</span>
          </div>

          {/* Pitch */}
          {popupBuddy.bio && (
            <p style={{
              color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              fontSize: '12px',
              fontStyle: 'italic',
              lineHeight: 1.5,
              borderLeft: `2.5px solid rgba(128,128,128,0.3)`,
              paddingLeft: '8px',
              marginBottom: '14px',
            }}>
              « {popupBuddy.bio} »
            </p>
          )}

          {/* Bouton */}
          <button
            onClick={() => { setSelectedBuddy(popupBuddy); setPopupBuddy(null); }}
            style={{
              width: '100%', padding: '11px', borderRadius: '24px',
              border: 'none',
              background: darkMode ? 'white' : '#111',
              color: darkMode ? 'black' : 'white',
              fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            }}
          >
            Voir le profil →
          </button>
        </div>
      )}

      {/* Profil complet */}
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