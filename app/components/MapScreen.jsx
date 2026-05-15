'use client';
import { useEffect, useState } from 'react';

export default function MapScreen({ theme }) {
  const [loaded, setLoaded] = useState(false);
  const darkMode = theme?.dark ?? true;

  useEffect(() => {
    setLoaded(true);
  }, []);

  if (!loaded) return <div style={{ height: '100vh', background: darkMode ? '#0f0f0f' : '#F5F5F5' }}/>;

  const MapComponent = require('./MapComponent').default;
  return <MapComponent key={darkMode ? 'dark' : 'light'} theme={theme} />;
}