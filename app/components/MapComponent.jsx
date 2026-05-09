'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';

export default function MapComponent() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (mapInstance.current) return;

    import('leaflet').then(async L => {
      import('leaflet/dist/leaflet.css');

      const map = L.map(mapRef.current).setView([48.8566, 2.3522], 13);
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: '<div style="width:12px;height:12px;background:#3DFF8F;border-radius:50%;border:2px solid white;"></div>',
        iconSize: [12, 12],
      });

      const { data: profiles } = await supabase.from('profiles').select('*');
      if (profiles) {
        profiles.forEach(p => {
          if (p.lat && p.lng) {
            L.marker([p.lat, p.lng], { icon })
              .addTo(map)
              .bindPopup(`<b>${p.username}</b><br>${p.role}`);
          }
        });
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async pos => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 14);

          L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: '',
              html: '<div style="width:14px;height:14px;background:#FF4D4D;border-radius:50%;border:2px solid white;"></div>',
              iconSize: [14, 14],
            })
          }).addTo(map).bindPopup('Toi');

          const { data: { user } } = await supabase.auth.getUser();
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
      <div ref={mapRef} style={{ height: 'calc(100vh - 80px)', width: '100%' }}/>
      <div style={{
        position: 'absolute', bottom: '90px', left: '16px',
        background: 'rgba(10,10,10,0.8)', borderRadius: '10px',
        padding: '8px 12px', fontSize: '12px', color: '#666',
      }}>
        <span style={{ color: '#3DFF8F' }}>●</span> Créatifs · <span style={{ color: '#FF4D4D' }}>●</span> Toi
      </div>
    </div>
  );
}