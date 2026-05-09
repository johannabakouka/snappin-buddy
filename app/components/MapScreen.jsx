'use client';

import { useEffect, useState } from 'react';

export default function MapScreen() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  if (!loaded) return <div style={{ height: '100vh', background: '#0f0f0f' }}/>;

  const MapComponent = require('./MapComponent').default;
  return <MapComponent />;
}