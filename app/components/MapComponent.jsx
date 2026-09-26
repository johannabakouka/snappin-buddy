'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { loadBlockedIds } from '../blocks';
import BuddyProfileScreen from './BuddyProfileScreen';
import CityPicker from './CityPicker';
import { ROLE_FILTERS, ROLES_EN, ROLES_FR, UNIVERS, hasRole, roleLabels } from '../constants';
import { useT } from '../i18n';
import { tx, isNotFrench } from '../tx';

// ~400 m pour une position GPS, ~2 km pour une ville choisie (répartit les pins dans la ville)
const GPS_FUZZ = 0.004;
const CITY_FUZZ = 0.02;
// Zoom d'ouverture quand on ne connaît personne autour : vue régionale (on peut zoomer à la main)
const MAP_ZOOM = 8;

// Fond de carte : MapTiler si la clé est configurée (style sombre soigné),
// sinon OpenStreetMap, qui reste le filet de sécurité gratuit et sans clé.
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || '';
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIB = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MAPTILER_ATTRIB = '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const maptilerUrl = (dark) =>
  `https://api.maptiler.com/maps/${dark ? 'dataviz-dark' : 'dataviz-light'}/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;
// À l'ouverture, la carte s'élargit jusqu'à montrer les NEAREST créatifs les plus proches,
// sans descendre sous MIN_OPEN_ZOOM (≈ un pays) ni zoomer plus que MAX_OPEN_ZOOM (≈ toute l’Île-de-France).
const NEAREST = 8;
const MIN_OPEN_ZOOM = 5;
const MAX_OPEN_ZOOM = 9;

function openingZoom(Lf, map, lat, lng, all) {
  const others = (all || []).filter(p => !p._isMe && p.lat && p.lng);
  if (!Lf || !map || others.length === 0) return MAP_ZOOM;
  const dists = others.map(p => map.distance([lat, lng], [p.lat, p.lng])).sort((a, b) => a - b);
  const radius = dists[Math.min(NEAREST, dists.length) - 1] * 1.15 + 3000;
  const bounds = Lf.latLng(lat, lng).toBounds(radius * 2);
  // Marge pour les filtres en haut et la barre du bas, qui cachent une partie de la carte
  const z = map.getBoundsZoom(bounds, false, Lf.point(40, 260));
  return Math.max(MIN_OPEN_ZOOM, Math.min(MAX_OPEN_ZOOM, z));
}

// localStorage 'geoMode' : 'gps' | 'city' | 'none'
function getGeoMode() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('geoMode');
}

function fuzzPosition(lat, lng, r = GPS_FUZZ) {
  const angle = Math.random() * 2 * Math.PI;
  const dist = Math.random() * r;
  return {
    lat: lat + dist * Math.cos(angle),
    lng: lng + dist * Math.sin(angle),
  };
}

// Même flou d'affichage à chaque rendu pour un même utilisateur : les pins ne sautent plus
// quand on change de filtre (avant, la position était retirée au hasard à chaque fois).
function stableFuzz(lat, lng, seed, r = GPS_FUZZ) {
  let h = 2166136261;
  for (const ch of String(seed || '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const a = ((h >>> 0) % 3600) / 3600;
  const b = ((Math.imul(h, 2654435761) >>> 0) % 1000) / 1000;
  const angle = a * 2 * Math.PI;
  const dist = b * r;
  return { lat: lat + dist * Math.cos(angle), lng: lng + dist * Math.sin(angle) };
}

const MAP_ROLE_FILTERS = ROLE_FILTERS.map(r => ({ id: r.id, label: r.icon }));

export default function MapComponent({ theme, active = true }) {
  const t = useT();
  const isEn = isNotFrench();
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
  // null | 'choose' | 'denied' : panneau de choix de ville
  const [cityOverlay, setCityOverlay] = useState(null);
  // Repli sur OpenStreetMap : on remet alors le filtre qui assombrit la carte
  const [useFilter, setUseFilter] = useState(false);
  const fallbackRef = useRef(false);
  const tilesRef = useRef(null);
  const [savingCity, setSavingCity] = useState(false);

  const STATUS_FILTERS = [
    { id: 'all', label: tx('All', 'Tous') },
    { id: 'dispo', label: `🟢 ${tx('Available', 'Dispo')}` },
    { id: 'shoot', label: `🟡 ${tx('On shoot', 'En shoot')}` },
    { id: 'indispo', label: `🔴 ${tx('Unavailable', 'Indispo')}` },
  ];

  async function initMap(askGeo = false, onGeoError = null) {
    if (mapInstance.current) return;
    import('leaflet').then(async (LeafletModule) => {
      import('leaflet/dist/leaflet.css');
      const map = LeafletModule.map(mapRef.current, { zoomControl: false }).setView([48.8566, 2.3522], MAP_ZOOM);
      mapInstance.current = map;

      const useMaptiler = !!MAPTILER_KEY;
      // MapTiler sert des tuiles de 512 px : sans le préciser, Leaflet les réduit de moitié
      // et les noms de villes deviennent illisibles.
      const tiles = LeafletModule.tileLayer(
        useMaptiler ? maptilerUrl(darkMode) : OSM_URL,
        useMaptiler
          ? { attribution: MAPTILER_ATTRIB, maxZoom: 20, tileSize: 512, zoomOffset: -1 }
          : { attribution: OSM_ATTRIB, maxZoom: 20 }
      ).addTo(map);
      tilesRef.current = tiles;
      if (!useMaptiler) {
        fallbackRef.current = true;
        setUseFilter(true);
      }

      // Si MapTiler ne répond pas (clé absente, quota, coupure), on repasse sur OpenStreetMap
      let tileErrors = 0;
      tiles.on('tileerror', () => {
        tileErrors += 1;
        if (tileErrors >= 6 && !fallbackRef.current) {
          fallbackRef.current = true;
          setUseFilter(true);
          map.removeLayer(tiles);
          const osm = LeafletModule.tileLayer(OSM_URL, { attribution: OSM_ATTRIB, maxZoom: 20 }).addTo(map);
          tilesRef.current = osm;
        }
      });

      LeafletModule.control.zoom({ position: 'bottomright' }).addTo(map);
      setL(LeafletModule);

      const { data: profileData } = await supabase.from('profiles').select('*');
      const { data: { user } } = await supabase.auth.getUser();
      // Les personnes bloquées, dans un sens comme dans l'autre, n'apparaissent pas.
      const blocked = await loadBlockedIds(user?.id);

      const allProfiles = (profileData || [])
        .filter(p => !blocked.has(p.user_id))
        .map(p => ({ ...p, _isMe: !!user && p.user_id === user.id }));
      if (profileData) {
        setProfiles(allProfiles);
        // Centre la carte sur sa propre position enregistrée, assez large pour voir les créatifs proches
        const me = allProfiles.find(p => p._isMe);
        if (me?.lat && me?.lng) map.setView([me.lat, me.lng], openingZoom(LeafletModule, map, me.lat, me.lng, allProfiles));
        else map.setView([48.8566, 2.3522], openingZoom(LeafletModule, map, 48.8566, 2.3522, allProfiles));
      }

      if (askGeo) {
        if (!navigator.geolocation) {
          onGeoError?.();
          return;
        }
        navigator.geolocation.getCurrentPosition(async pos => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], openingZoom(LeafletModule, map, latitude, longitude, allProfiles));
          if (user) {
            const fuzzed = fuzzPosition(latitude, longitude);
            await supabase.from('profiles').update({ lat: fuzzed.lat, lng: fuzzed.lng }).eq('user_id', user.id);
            setProfiles(prev => prev.map(p => p._isMe ? { ...p, lat: fuzzed.lat, lng: fuzzed.lng } : p));
          }
        }, () => onGeoError?.(), { timeout: 15000 });
      }
    });
  }

  // Bascule clair / sombre : on change le fond sans recharger la carte
  useEffect(() => {
    if (!tilesRef.current || fallbackRef.current || !MAPTILER_KEY) return;
    tilesRef.current.setUrl(maptilerUrl(darkMode));
  }, [darkMode]);

  useEffect(() => {
    // Ceux qui ont choisi une ville ou refusé ne se voient plus redemander le GPS à chaque visite.
    // Sans geoMode enregistré (anciens utilisateurs), on garde le comportement d'avant.
    const mode = getGeoMode();
    if (!showGeoPrompt) initMap(mode === 'city' || mode === 'none' ? false : true);
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Retour sur l'onglet Carte : la carte est restée en mémoire, on la redimensionne
  // et on met à jour les créatifs en arrière-plan, sans tout recharger.
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current && mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 60);
      (async () => {
        const [{ data: profileData }, { data: { user } }] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.auth.getUser(),
        ]);
        const blocked = await loadBlockedIds(user?.id);
        if (profileData) setProfiles(profileData
          .filter(p => !blocked.has(p.user_id))
          .map(p => ({ ...p, _isMe: user && p.user_id === user.id })));
      })();
    }
    wasActive.current = active;
  }, [active]);

  function handleAllow() {
    localStorage.setItem('geoAsked', 'true');
    localStorage.setItem('geoMode', 'gps');
    setShowGeoPrompt(false);
    // Si le navigateur refuse ou échoue, on propose directement de choisir sa ville
    initMap(true, () => setCityOverlay('denied'));
  }

  function handleDeny() {
    localStorage.setItem('geoAsked', 'true');
    localStorage.setItem('geoMode', 'none');
    setShowGeoPrompt(false);
    initMap(false);
  }

  function handleChooseCity() {
    localStorage.setItem('geoAsked', 'true');
    setShowGeoPrompt(false);
    setCityOverlay('choose');
    initMap(false);
  }

  async function handleCitySelected(city) {
    if (savingCity) return;
    setSavingCity(true);
    const fuzzed = fuzzPosition(city.lat, city.lng, CITY_FUZZ);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('profiles')
        .update({ lat: fuzzed.lat, lng: fuzzed.lng })
        .eq('user_id', user.id);
      if (error) {
        console.error('City save failed', error);
        setSavingCity(false);
        return;
      }
      setProfiles(prev => prev.map(p => p._isMe ? { ...p, lat: fuzzed.lat, lng: fuzzed.lng } : p));
    }
    localStorage.setItem('geoMode', 'city');
    mapInstance.current?.setView([city.lat, city.lng], openingZoom(L, mapInstance.current, city.lat, city.lng, profiles));
    setCityOverlay(null);
    setSavingCity(false);
  }

  const me = profiles.find(p => p._isMe);
  const notOnMap = !!L && !!me && (!me.lat || !me.lng);

  useEffect(() => {
    if (!L || !mapInstance.current || profiles.length === 0) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filtered = profiles.filter(p => {
      if (!p.lat || !p.lng) return false;
      if (p._isMe) return true;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (universFilter && !(p.styles || '').toLowerCase().includes(universFilter.toLowerCase())) return false;
      if (roleFilter && !hasRole(p.role, roleFilter)) return false;
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
            <span style="font-size:10px;font-weight:700;color:white;background:rgba(10,10,10,0.7);padding:1px 6px;border-radius:8px;white-space:nowrap;">${tx('Me', 'Moi')}</span>
          </div>`,
          iconSize: [44, 60], iconAnchor: [22, 22],
        });
        const m = L.marker([p.lat, p.lng], { icon: meIcon }).addTo(mapInstance.current);
        markersRef.current.push(m);
      } else {
        const fuzzed = stableFuzz(p.lat, p.lng, p.user_id);
        const buddyIcon = L.divIcon({
          className: '',
          html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;">
            <div style="width:44px;height:44px;border-radius:50%;background:#1A1A1A;border:3px solid ${statusColor};display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,0.25);overflow:hidden;">
              ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />` : '◉'}
            </div>
            <span style="font-size:10px;font-weight:700;color:white;background:rgba(10,10,10,0.7);padding:1px 6px;border-radius:8px;white-space:nowrap;">${(p.username || '').toUpperCase()}</span>
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
  const statusLabel = popupBuddy?.status === 'shoot'
    ? (tx('On shoot', 'En shoot'))
    : popupBuddy?.status === 'indispo'
    ? (tx('Unavailable', 'Indisponible'))
    : (tx('Available', 'Disponible'));

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
    <div style={{ position: 'relative', height: '100dvh' }}>
      {/* Filtre CSS pour rendre la carte sombre */}
      <style>{`
        .leaflet-tile-pane {
          filter: ${useFilter && darkMode ? 'invert(100%) hue-rotate(180deg) brightness(0.85) contrast(0.9)' : 'none'};
        }
        .leaflet-control-attribution {
          background: ${darkMode ? 'rgba(10,10,10,0.6)' : 'rgba(255,255,255,0.7)'} !important;
          color: ${darkMode ? '#666' : '#777'} !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: ${darkMode ? '#8a8a8a' : '#555'} !important; }
      `}</style>

      <div ref={mapRef} style={{ height: '100dvh', width: '100%' }} />

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
              {t.geoTitle}
            </h3>
            <p style={{ fontSize: '13px', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', lineHeight: 1.6, marginBottom: '24px' }}>
              {t.geoText}
            </p>
            <button onClick={handleAllow} style={{
              width: '100%', padding: '14px', borderRadius: '24px', border: 'none',
              background: darkMode ? 'white' : '#111', color: darkMode ? 'black' : 'white',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '10px',
            }}>
              {t.geoAllow}
            </button>
            <button onClick={handleChooseCity} style={{
              width: '100%', padding: '14px', borderRadius: '24px',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'}`,
              background: 'transparent', color: darkMode ? 'white' : '#111',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '10px',
            }}>
              {t.geoChooseCity}
            </button>
            <button onClick={handleDeny} style={{
              width: '100%', padding: '10px', borderRadius: '24px', border: 'none',
              background: 'transparent',
              color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            }}>
              {t.geoNotNow}
            </button>
          </div>
        </div>
      )}

      {cityOverlay && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 3000, background: darkMode ? 'rgba(10,10,10,0.96)' : 'rgba(245,245,245,0.96)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: 'calc(env(safe-area-inset-top) + 72px) 24px 24px',
        }}>
          <div style={{
            background: darkMode ? '#1A1A1A' : '#FFFFFF',
            borderRadius: '24px', padding: '28px 20px 20px', maxWidth: '340px', width: '100%',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
            textAlign: 'center', opacity: savingCity ? 0.6 : 1,
            pointerEvents: savingCity ? 'none' : 'auto',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏙️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: darkMode ? 'white' : '#111', marginBottom: '8px', fontFamily: 'var(--font-nunito)' }}>
              {t.cityTitle}
            </h3>
            <p style={{ fontSize: '13px', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', lineHeight: 1.5, marginBottom: '18px' }}>
              {cityOverlay === 'denied' ? t.geoDenied : t.cityHint}
            </p>
            <CityPicker theme={theme} onSelect={handleCitySelected} />
            <button onClick={() => setCityOverlay(null)} style={{
              marginTop: '14px', padding: '8px 12px', border: 'none', background: 'transparent',
              color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            }}>
              {t.cityBack}
            </button>
          </div>
        </div>
      )}

      {notOnMap && !showGeoPrompt && !cityOverlay && !popupBuddy && (
        <button onClick={() => setCityOverlay('choose')} style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: '140px',
          zIndex: 450, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          width: 'max-content', maxWidth: 'calc(100% - 32px)',
          padding: '10px 18px', borderRadius: '18px', border: 'none', cursor: 'pointer',
          background: darkMode ? 'white' : '#111', color: darkMode ? '#111' : 'white',
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)', textAlign: 'center',
          fontSize: '13px', fontWeight: '600',
        }}>
          <span>{t.notOnMap}</span>
          <span style={{ fontWeight: '800', textDecoration: 'underline' }}>{t.notOnMapCta} →</span>
        </button>
      )}

      {!!L && !showGeoPrompt && !cityOverlay && (
        <button
          onClick={() => setCityOverlay('choose')}
          aria-label={t.changeCity}
          title={t.changeCity}
          style={{
            position: 'absolute', right: '12px', bottom: '150px', zIndex: 450,
            width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
            background: darkMode ? 'rgba(26,26,26,0.92)' : 'rgba(255,255,255,0.95)',
            fontSize: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          🏙️
        </button>
      )}

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 400,
        background: darkMode
          ? 'linear-gradient(to bottom, rgba(10,10,10,0.98) 0%, rgba(10,10,10,0.0) 100%)'
          : 'linear-gradient(to bottom, rgba(245,245,245,0.98) 0%, rgba(245,245,245,0.0) 100%)',
        paddingBottom: '12px',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0 8px', pointerEvents: 'none' }}>
          <img src="/logo.png" alt="Snappin'Buddy"
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
        color: darkMode ? '#666' : '#999', zIndex: 400,
      }}>
        <span style={{ color: '#2ECC71' }}>●</span> {tx('Available', 'Dispo')} ·{' '}
        <span style={{ color: '#FFD700' }}>●</span> {tx('On shoot', 'En shoot')} ·{' '}
        <span style={{ color: '#FF4D4D' }}>●</span> {tx('Unavailable', 'Indispo')}
      </div>

      {popupBuddy && (
        <div style={{
          position: 'absolute', bottom: '100px', left: '16px', right: '16px',
          zIndex: 500,
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
                {popupBuddy.role && <span style={{ marginRight: '6px' }}>{roleLabels(popupBuddy.role, isEn ? ROLES_EN : ROLES_FR)}</span>}
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
            {tx('See profile & create together →', 'Voir le profil & créer ensemble →')}
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