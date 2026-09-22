'use client';
import { useEffect, useRef, useState } from 'react';
import { useT, getLang } from '../i18n';

// public/cities.json : [name, countryCode, lat, lng, aliases?][], trié par population décroissante.
// Source : GeoNames (villes de plus de 15 000 habitants), via all-the-cities (MIT).
let citiesPromise = null;

function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadCities() {
  if (!citiesPromise) {
    citiesPromise = fetch('/cities.json')
      .then(r => r.json())
      .then(rows => rows.map(([name, country, lat, lng, aliases]) => ({
        name, country, lat, lng,
        keys: [name, ...(aliases ? aliases.split('|') : [])].map(normalize),
      })))
      .catch(err => {
        citiesPromise = null;
        throw err;
      });
  }
  return citiesPromise;
}

const MAX_RESULTS = 6;

function searchCities(cities, query) {
  const q = normalize(query);
  if (q.length < 2) return [];
  const prefix = [];
  const wordStart = [];
  const wordQ = ' ' + q;
  for (const c of cities) {
    if (c.keys.some(k => k.startsWith(q))) {
      prefix.push(c);
      if (prefix.length >= MAX_RESULTS) break;
    } else if (wordStart.length < MAX_RESULTS && c.keys.some(k => (' ' + k).includes(wordQ))) {
      wordStart.push(c);
    }
  }
  return [...prefix, ...wordStart].slice(0, MAX_RESULTS);
}

function useCountryName() {
  const [fmt] = useState(() => {
    try {
      return new Intl.DisplayNames([getLang()], { type: 'region' });
    } catch {
      return null;
    }
  });
  return code => {
    try {
      return fmt?.of(code) || code;
    } catch {
      return code;
    }
  };
}

export default function CityPicker({ theme, onSelect, autoFocus = true }) {
  const t = useT();
  const darkMode = theme?.dark ?? true;
  const countryName = useCountryName();
  const inputRef = useRef(null);
  const [cities, setCities] = useState(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const results = cities ? searchCities(cities, query) : [];

  useEffect(() => {
    let alive = true;
    loadCities()
      .then(c => { if (alive) setCities(c); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const color = darkMode ? 'white' : '#111';
  const subText = darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  function pick(c) {
    onSelect({ name: c.name, country: c.country, lat: c.lat, lng: c.lng });
  }

  let status = null;
  if (error) status = t.cityNoResult;
  else if (!cities && query.length >= 2) status = t.cityLoading;
  else if (cities && normalize(query).length >= 2 && results.length === 0) status = t.cityNoResult;

  return (
    <div style={{ textAlign: 'left' }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && results[0]) pick(results[0]); }}
        placeholder={t.cityPlaceholder}
        autoComplete="off"
        enterKeyHint="search"
        style={{
          width: '100%', padding: '13px 14px', borderRadius: '12px',
          border: `1px solid ${inputBorder}`, background: inputBg, color,
          fontSize: '16px', boxSizing: 'border-box', outline: 'none',
        }}
      />

      {results.length > 0 && (
        <div style={{
          marginTop: '8px', borderRadius: '12px', overflow: 'hidden',
          border: `1px solid ${inputBorder}`,
        }}>
          {results.map((c, i) => (
            <button
              key={`${c.name}-${c.country}-${c.lat}`}
              onClick={() => pick(c)}
              style={{
                display: 'flex', width: '100%', alignItems: 'baseline', gap: '8px',
                padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: 'transparent', color,
                borderTop: i === 0 ? 'none' : `1px solid ${inputBorder}`,
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '700' }}>📍 {c.name}</span>
              <span style={{ fontSize: '12px', color: subText }}>{countryName(c.country)}</span>
            </button>
          ))}
        </div>
      )}

      {status && (
        <p style={{ marginTop: '10px', fontSize: '12px', color: subText, textAlign: 'center' }}>{status}</p>
      )}
    </div>
  );
}
