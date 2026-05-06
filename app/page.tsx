'use client';

import { useState } from 'react';
import Navbar from './components/Navbar';
import MapScreen from './components/MapScreen';
import ExploreScreen from './components/ExploreScreen';
import MatchScreen from './components/MatchScreen';
import MessagesScreen from './components/MessagesScreen';
import ProfileScreen from './components/ProfileScreen';
export default function Home() {
  const [screen, setScreen] = useState('map');

  return (
    <div style={{
      maxWidth: '390px',
      margin: '0 auto',
      height: '100vh',
      background: '#0A0A0A',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {screen === 'map' && <MapScreen />}
{screen === 'explore' && <ExploreScreen />}
     {screen === 'match' && <MatchScreen />}
      {screen === 'messages' && <MessagesScreen />}
      {screen === 'profile' && <ProfileScreen />}
      <Navbar screen={screen} setScreen={setScreen} />
    </div>
  );
}