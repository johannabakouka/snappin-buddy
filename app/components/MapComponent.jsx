'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { loadBlockedIds, onBlocksChanged } from '../blocks';
import BuddyProfileScreen from './BuddyProfileScreen';
import CityPicker from './CityPicker';
import { loadCities, nearestCity } from '../cities';
import MapPreviewCard from './MapPreviewCard';
import {
  ROLE_FILTERS, ROLES_EN, ROLES_FR, UNIVERS, hasRole, roleLabels,
  daysSinceLaunch, distanceKm, COUNT_VISIBLE_FROM, NEARBY_KM, NEARBY_SPARSE_BELOW,
} from '../constants';
import { useT } from '../i18n';
import { tx, isNotFrench } from '../tx';
import { loadMyWatch, watchNearby, unwatchNearby } from '../city-watch';
import { tap } from '../haptics';
import { thumbUrl } from '../image-upload';

// ~400 m pour une position GPS, ~2 km pour une ville choisie (répartit les pins dans la ville)
const GPS_FUZZ = 0.004;
const CITY_FUZZ = 0.02;
// Zoom d'ouverture quand on ne connaît personne autour : vue régionale (on peut zoomer à la main)
const MAP_ZOOM = 8;
// Durée du sommeil du bandeau « tu es parmi les premiers » après un clic sur la croix.
const PIONEER_SNOOZE_DAYS = 7;

// Les colonnes dont la carte a besoin. Elle prenait tout, y compris les bios,
// les portfolios et les tableaux de liens, pour dessiner des pastilles.
// country est indispensable ici, pas seulement pour l'affichage : c'est lui qui
// dit au rattrapage ci-dessous que le profil est déjà complet. Sans la colonne,
// mine.country vaut toujours undefined, le rattrapage se relance à chaque
// ouverture de la carte, retélécharge les 765 Ko de la liste des villes et
// réécrit la même ville en base. C'est exactement le gaspillage qu'on vient de
// corriger ailleurs.
const MAP_COLUMNS = 'user_id, username, handle, avatar_url, role, role_other, styles, zone, city, country, status, lat, lng, hidden, is_early_adopter, validated_projects, bio, portfolio_urls, portfolio_url, looking_for';

// Temps minimum entre deux relectures des profils quand on revient sur l'onglet.
const MIN_RELOAD_MS = 60000;

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
// Zoom du bouton « Moi ». On ne descend pas plus bas volontairement : les
// positions sont volontairement floutées de ~400 m, et zoomer à fond ferait
// croire à une précision à la rue près qui n'existe pas.
const ME_ZOOM = 13;

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
  // Dernier chargement des profils, pour ne pas tout relire à chaque retour.
  const lastLoad = useRef(0);
  const [cityOverlay, setCityOverlay] = useState(null);
  // Repli sur OpenStreetMap : on remet alors le filtre qui assombrit la carte
  const [useFilter, setUseFilter] = useState(false);
  const fallbackRef = useRef(false);
  const tilesRef = useRef(null);
  const [savingCity, setSavingCity] = useState(false);
  const [cityError, setCityError] = useState('');
  // Le message « tu es parmi les premiers » se met en sommeil quand on le
  // ferme : pénible à chaque ouverture, mais il porte maintenant le bouton
  // « préviens-moi ». S'il disparaissait pour toujours, un clic sur la croix
  // le premier jour fermait la porte définitivement.
  const [pioneerDismissed, setPioneerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const at = Date.parse(localStorage.getItem('pioneerSeen') || '');
      if (!at) return false;
      return Date.now() - at < PIONEER_SNOOZE_DAYS * 86400000;
    } catch { return false; }
  });

  function dismissPioneer() {
    setPioneerDismissed(true);
    try { localStorage.setItem('pioneerSeen', new Date().toISOString()); } catch { /* navigation privée */ }
  }

  // Veille « préviens-moi quand quelqu'un arrive » : 'off' | 'saving' | 'on'
  const [watchState, setWatchState] = useState('off');
  const [watchError, setWatchError] = useState('');
  const myId = profiles.find(p => p._isMe)?.user_id || null;

  useEffect(() => {
    if (!myId) return;
    let alive = true;
    (async () => {
      const row = await loadMyWatch(myId);
      // Une veille déjà déclenchée ne se réaffiche pas comme active : le mail
      // est parti, la personne n'attend plus rien.
      if (alive && row && !row.notified_at) setWatchState('on');
    })();
    return () => { alive = false; };
  }, [myId]);

  async function startWatch() {
    const mine = profiles.find(p => p._isMe);
    if (!mine?.lat || !mine?.lng) {
      setWatchError(tx('Pick your city first.', 'Choisis d’abord ta ville.'));
      return;
    }
    // Le nombre de créatifs déjà là. Sans ce repère, le serveur enverrait un
    // mail pour annoncer des gens qui étaient présents avant l'inscription.
    const baseline = profiles.filter(p => (
      !p._isMe && p.lat && p.lng && distanceKm(mine.lat, mine.lng, p.lat, p.lng) <= NEARBY_KM
    )).length;
    setWatchError('');
    setWatchState('saving');
    const ok = await watchNearby(mine.user_id, mine.lat, mine.lng, baseline);
    if (ok) {
      tap();
      setWatchState('on');
    } else {
      setWatchState('off');
      setWatchError(tx("Couldn't save. Try again.", 'L’enregistrement a échoué. Réessaie.'));
    }
  }

  async function stopWatch() {
    if (!myId) return;
    setWatchError('');
    const ok = await unwatchNearby(myId);
    if (ok) setWatchState('off');
    else setWatchError(tx("Couldn't cancel. Try again.", 'L’annulation a échoué. Réessaie.'));
  }

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

      lastLoad.current = Date.now();
      const { data: profileData } = await supabase.from('profiles').select(MAP_COLUMNS);
      const { data: { user } } = await supabase.auth.getUser();
      // Les personnes bloquées, dans un sens comme dans l'autre, n'apparaissent pas.
      const blocked = await loadBlockedIds(user?.id);

      const allProfiles = (profileData || [])
        .filter(p => !blocked.has(p.user_id))
        // Mode invisible : le profil disparaît de la carte, mais on reste
        // visible pour soi-même, sinon on croirait son compte cassé.
        .filter(p => !p.hidden || (!!user && p.user_id === user.id))
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
            // La ville la plus proche, pour qu'Explorer puisse écrire un lieu.
            // Le téléchargement de la liste n'arrive qu'ici, une fois, au
            // moment où la position est posée.
            const { city, country } = await cityNameFor(latitude, longitude);
            await supabase.from('profiles')
              .update({ lat: fuzzed.lat, lng: fuzzed.lng, city, country })
              .eq('user_id', user.id);
            setProfiles(prev => prev.map(p => p._isMe ? { ...p, lat: fuzzed.lat, lng: fuzzed.lng, city, country } : p));
          }
        }, () => onGeoError?.(), { timeout: 15000 });
      }
    });
  }

  // La ville la plus proche et son pays, ou deux fois null. Une coupure réseau
  // ne doit pas faire échouer l'enregistrement de la position, qui est
  // l'essentiel.
  //
  // Le pays vient de la même liste, qui porte déjà son code : on ne demande
  // donc rien de plus à personne pour qu'une recherche « Brésil » fonctionne.
  async function cityNameFor(lat, lng) {
    try {
      const cities = await loadCities();
      const found = nearestCity(cities, lat, lng);
      return { city: found?.name || null, country: found?.country || null };
    } catch (e) {
      console.error('cityNameFor', e);
      return { city: null, country: null };
    }
  }

  // Rattrapage : les comptes créés avant ce réglage ont une position mais pas
  // de ville. Plutôt qu'une migration, chacun répare le sien en ouvrant la
  // carte, une seule fois.
  useEffect(() => {
    const mine = profiles.find(p => p._isMe);
    // On repasse aussi pour ceux qui ont déjà une ville mais pas de pays : le
    // pays est arrivé après, et sans ce test ils resteraient introuvables par
    // une recherche de pays pour toujours.
    if (!mine || (mine.city && mine.country) || !mine.lat || !mine.lng) return;
    let alive = true;
    (async () => {
      const { city, country } = await cityNameFor(mine.lat, mine.lng);
      if (!alive || !city) return;
      await supabase.from('profiles').update({ city, country }).eq('user_id', mine.user_id);
      setProfiles(prev => prev.map(p => p._isMe ? { ...p, city, country } : p));
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.find(p => p._isMe)?.user_id, profiles.find(p => p._isMe)?.lat]);

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
      // Revenir sur l'onglet rechargeait tous les profils entiers, à chaque
      // fois. Les pins ne changent pas d'une seconde à l'autre : on ne relit
      // qu'au-delà d'une minute, et seulement les colonnes affichées.
      const depuis = Date.now() - lastLoad.current;
      if (depuis < MIN_RELOAD_MS) { wasActive.current = active; return; }
      lastLoad.current = Date.now();
      (async () => {
        const [{ data: profileData }, { data: { user } }] = await Promise.all([
          supabase.from('profiles').select(MAP_COLUMNS),
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

  // Blocage : la personne doit disparaître de la carte tout de suite.
  useEffect(() => onBlocksChanged(async () => {
    lastLoad.current = Date.now();
    const [{ data: profileData }, { data: { user } }] = await Promise.all([
      supabase.from('profiles').select(MAP_COLUMNS),
      supabase.auth.getUser(),
    ]);
    const blocked = await loadBlockedIds(user?.id);
    if (profileData) setProfiles(profileData
      .filter(p => !blocked.has(p.user_id))
      .map(p => ({ ...p, _isMe: user && p.user_id === user.id })));
  }), []);

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
    setCityError('');
    if (savingCity) return;
    setSavingCity(true);
    const fuzzed = fuzzPosition(city.lat, city.lng, CITY_FUZZ);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('profiles')
        // Le nom de la ville était perdu : seules les coordonnées étaient
        // gardées, donc Explorer ne pouvait afficher aucun lieu.
        .update({ lat: fuzzed.lat, lng: fuzzed.lng, city: city.name || null, country: city.country || null })
        .eq('user_id', user.id);
      if (error) {
        // L'erreur n'était que dans la console : la personne choisissait sa
        // ville et le panneau restait là, sans explication.
        console.error('City save failed', error);
        setCityError(tx("Couldn't save your city. Try again.", 'L’enregistrement de ta ville a échoué. Réessaie.'));
        setSavingCity(false);
        return;
      }
      setProfiles(prev => prev.map(p => p._isMe ? { ...p, lat: fuzzed.lat, lng: fuzzed.lng, city: city.name || null, country: city.country || null } : p));
    }
    localStorage.setItem('geoMode', 'city');
    mapInstance.current?.setView([city.lat, city.lng], openingZoom(L, mapInstance.current, city.lat, city.lng, profiles));
    setCityOverlay(null);
    setSavingCity(false);
  }

  const me = profiles.find(p => p._isMe);
  const notOnMap = !!L && !!me && (!me.lat || !me.lng);

  // Une carte vide autour de soi ressemble exactement à une app abandonnée.
  // Comme on connaît déjà tous les profils chargés, on compte sans requête en
  // plus, et on dit ce qu'il en est : l'app est jeune, pas morte.
  const placedProfiles = profiles.filter(p => p.lat && p.lng);
  const totalCreatives = placedProfiles.length;
  const nearbyCount = (me?.lat && me?.lng)
    ? placedProfiles.filter(p => !p._isMe && distanceKm(me.lat, me.lng, p.lat, p.lng) <= NEARBY_KM).length
    : null;
  // Le total n'est montré qu'à partir du moment où il joue en notre faveur :
  // un petit nombre écrit noir sur blanc donne l'argument à ceux qui comptent.
  const showTotal = totalCreatives >= COUNT_VISIBLE_FROM;
  const sparseNearby = nearbyCount !== null && nearbyCount < NEARBY_SPARSE_BELOW;
  const showPioneer = !!L && !notOnMap && sparseNearby && !pioneerDismissed;
  const openDays = daysSinceLaunch();

  // Bouton « Moi » : on revient sur sa position après avoir fait défiler la
  // carte. Si on n'est pas encore placé, le bouton ouvre le choix de la ville
  // plutôt que de ne rien faire.
  function centerOnMe() {
    const map = mapInstance.current;
    if (!map) return;
    if (me?.lat && me?.lng) {
      map.setView([me.lat, me.lng], Math.max(map.getZoom(), ME_ZOOM), { animate: true });
      return;
    }
    setCityOverlay('choose');
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
              ${p.avatar_url ? `<img src="${thumbUrl(p.avatar_url) || p.avatar_url}" onerror="this.onerror=null;this.src='${p.avatar_url}'" style="width:100%;height:100%;object-fit:cover;" />` : 'MOI'}
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
              ${p.avatar_url ? `<img src="${thumbUrl(p.avatar_url) || p.avatar_url}" onerror="this.onerror=null;this.src='${p.avatar_url}'" style="width:100%;height:100%;object-fit:cover;" />` : '◉'}
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
            {cityError && (
              <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginBottom: '12px', fontWeight: '700' }}>{cityError}</p>
            )}
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

      {showPioneer && !showGeoPrompt && !cityOverlay && !popupBuddy && (
        <div style={{
          position: 'absolute', left: '16px', right: '16px', bottom: '140px', zIndex: 450,
          padding: '14px 16px', borderRadius: '18px',
          background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.97)',
          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <span style={{ fontSize: '20px', lineHeight: 1.2 }}>✨</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              color: darkMode ? 'white' : '#111', fontSize: '14px',
              fontWeight: '800', marginBottom: '4px', lineHeight: 1.35,
            }}>
              {tx("You're one of the first here", 'Tu es parmi les premiers par ici')}
            </p>
            <p style={{
              color: darkMode ? 'rgba(255,255,255,0.6)' : '#666',
              fontSize: '12px', lineHeight: 1.5,
            }}>
              {/* Le nombre est mis APRÈS la traduction : sinon chaque valeur
                  créerait une clé différente et le dictionnaire ne suivrait pas. */}
              {openDays > 0
                ? tx(
                  "Snappin'Buddy opened {n} days ago and fills up city by city.",
                  'Snappin’Buddy a ouvert il y a {n} jours et se remplit ville par ville.'
                ).replace('{n}', String(openDays))
                : tx(
                  "Snappin'Buddy just opened and fills up city by city.",
                  'Snappin’Buddy vient d’ouvrir et se remplit ville par ville.'
                )}
              {showTotal && ' '}
              {showTotal && tx(
                '{n} creatives are already on the map.',
                '{n} créatifs sont déjà sur la carte.'
              ).replace('{n}', String(totalCreatives))}
            </p>

            {/* La sortie du bandeau. Avant, il n'y avait que la croix : la
                personne arrivée la première dans sa ville n'avait aucun moyen
                de laisser une trace, donc l'app perdait exactement les gens
                qui ouvrent une ville. */}
            {watchState === 'on' ? (
              <p style={{
                color: darkMode ? 'rgba(255,255,255,0.75)' : '#444',
                fontSize: '12px', lineHeight: 1.5, marginTop: '10px',
              }}>
                ✓ {tx(
                  "We'll email you as soon as a creative shows up around you.",
                  'On t’écrit dès qu’un créatif apparaît autour de toi.'
                )}{' '}
                <button
                  onClick={stopWatch}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: darkMode ? 'rgba(255,255,255,0.5)' : '#888',
                    fontSize: '12px', textDecoration: 'underline', fontFamily: 'inherit',
                  }}
                >
                  {tx('Cancel', 'Annuler')}
                </button>
              </p>
            ) : (
              <button
                onClick={startWatch}
                disabled={watchState === 'saving'}
                style={{
                  marginTop: '10px', padding: '9px 16px', borderRadius: '20px', border: 'none',
                  cursor: watchState === 'saving' ? 'default' : 'pointer',
                  background: darkMode ? 'white' : '#111', color: darkMode ? '#111' : 'white',
                  fontSize: '12px', fontWeight: '800', opacity: watchState === 'saving' ? 0.6 : 1,
                }}
              >
                🔔 {watchState === 'saving'
                  ? tx('Saving...', 'Enregistrement...')
                  : tx('Notify me when someone arrives', 'Préviens-moi quand quelqu’un arrive')}
              </button>
            )}
            {watchError && (
              <p style={{ color: '#FF6B6B', fontSize: '11px', marginTop: '6px', lineHeight: 1.4 }}>
                {watchError}
              </p>
            )}
          </div>
          <button
            onClick={dismissPioneer}
            aria-label={tx('Close', 'Fermer')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
              color: darkMode ? 'rgba(255,255,255,0.45)' : '#999', fontSize: '18px', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Retour sur ma position, juste au-dessus du bouton de ville */}
      {!!L && !showGeoPrompt && !cityOverlay && (
        <button
          onClick={centerOnMe}
          aria-label={tx('Center on me', 'Centrer sur moi')}
          title={tx('Center on me', 'Centrer sur moi')}
          style={{
            position: 'absolute', right: '12px', bottom: '202px', zIndex: 450,
            width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
            background: darkMode ? 'rgba(26,26,26,0.92)' : 'rgba(255,255,255,0.95)',
            fontSize: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          🎯
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

        {/* Le total ne s'affiche qu'une fois assez grand pour parler en notre
            faveur : zéro point autour de soi ne veut pas dire une app vide. */}
        {showTotal && (
          <p style={{
            textAlign: 'center', margin: '-4px 0 8px', pointerEvents: 'none',
            fontSize: '12px', fontWeight: '700',
            color: darkMode ? 'rgba(255,255,255,0.5)' : '#777',
          }}>
            🌍 {tx('{n} creatives on the map', '{n} créatifs sur la carte').replace('{n}', String(totalCreatives))}
          </p>
        )}

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

      <MapPreviewCard
        buddy={popupBuddy}
        darkMode={darkMode}
        onClose={() => setPopupBuddy(null)}
        onOpen={() => { setSelectedBuddy(popupBuddy); setPopupBuddy(null); }}
      />

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