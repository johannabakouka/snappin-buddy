'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import BuddyProfileScreen from './BuddyProfileScreen';

export default function MapComponent({ theme }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const darkMode = theme?.dark ?? true;
  const [selectedBuddy, setSelectedBuddy] = useState(null);

  useEffect(() => {
    if (mapInstance.current) return;
    import('leaflet').then(async L => {
      import('leaflet/dist/leaflet.css');
      const map = L.map(mapRef.current).setView([48.8566, 2.3522], 13);
      mapInstance.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: { user } } = await supabase.auth.getUser();

      if (profiles) {
        profiles.forEach(p => {
          if (p.lat && p.lng) {
            // Ne pas afficher son propre pin comme buddy cliquable
            const isMe = user && p.user_id === user.id;
            const statusColor = p.status === 'shoot' ? '#FFD700' : p.status === 'indispo' ? '#FF4D4D' : '#3DFF8F';
            
            const icon = L.divIcon({
              className: '',
              html: isMe
                ? `<div style="width:14px;height:14px;background:#FF4D4D;border-radius:50%;border:2px solid white;"></div>`
                : `<div style="width:36px;height:36px;border-radius:50%;background:#1A1A1A;border:2px solid ${statusColor};display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;">◉</div>`,
              iconSize: isMe ? [14, 14] : [36, 36],
            });

            const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);

            if (!isMe) {
              marker.on('click', () => {
                setSelectedBuddy(p);
              });
            } else {
              marker.bindPopup('Toi');
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

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <div ref={mapRef} style={{ height: '100vh', width: '100%' }} />

      {/* Header flottant */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '14px 0 24px',
        background: darkMode
          ? 'linear-gradient(to bottom, rgba(10,10,10,0.92) 0%, transparent 100%)'
          : 'linear-gradient(to bottom, rgba(245,245,245,0.92) 0%, transparent 100%)',
      }}>
        <img src={darkMode ? '/logo.png' : '/logo-dark.png'} alt="Snappin'Buddy" style={{ height: '36px', objectFit: 'contain', marginRight: '8px' }} />
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: '22px', fontWeight: '900', color: darkMode ? 'white' : '#111', letterSpacing: '-0.3px' }}>
          Snappin&apos;Buddy
        </span>
      </div>

      {/* Légende */}
      <div style={{
        position: 'absolute', bottom: '90px', left: '16px',
        background: darkMode ? 'rgba(10,10,10,0.8)' : 'rgba(245,245,245,0.8)',
        borderRadius: '10px', padding: '8px 12px', fontSize: '12px',
        color: darkMode ? '#666' : '#999', zIndex: 1000,
      }}>
        <span style={{ color: '#3DFF8F' }}>●</span> Dispo · <span style={{ color: '#FFD700' }}>●</span> En shoot · <span style={{ color: '#FF4D4D' }}>●</span> Indispo
      </div>

      {/* Profil buddy au clic */}
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