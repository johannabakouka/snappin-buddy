'use client';
import { useEffect, useState } from 'react';

export default function MapScreen({ theme }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  if (!loaded) return <div style={{ height: '100vh', background: theme?.dark ? '#0f0f0f' : '#F5F5F5' }}/>;

  const MapComponent = require('./MapComponent').default;
  return <MapComponent theme={theme} />;
}