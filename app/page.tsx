'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Navbar from './components/Navbar';
import Header from './components/Header';
import MapScreen from './components/MapScreen';
import ExploreScreen from './components/ExploreScreen';
import MatchScreen from './components/MatchScreen';
import MessagesScreen from './components/MessagesScreen';
import ProfileScreen from './components/ProfileScreen';
import AuthScreen from './components/AuthScreen';
import OnboardingScreen from './components/OnboardingScreen';

export default function Home() {
  const [screen, setScreen] = useState('map');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase.from('profiles').select('*').eq('user_id', u.id).single();
        setProfile(p);
      }
      setLoading(false);
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase.from('profiles').select('*').eq('user_id', u.id).single();
        setProfile(p);
      }
    });
  }, []);

  if (loading) return <div style={{ height: '100vh', background: '#0A0A0A' }}/>;

  if (!user) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', background: '#0A0A0A', color: 'white' }}>
      <AuthScreen onLogin={() => {}} />
    </div>
  );

  if (!profile) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', background: '#0A0A0A', color: 'white' }}>
      <OnboardingScreen user={user} onComplete={() => window.location.reload()} />
    </div>
  );

return (
  <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', background: '#0A0A0A', color: 'white', position: 'relative', overflow: 'hidden' }}>
    {screen === 'map' && <MapScreen />}
    {screen === 'explore' && <ExploreScreen />}
    {screen === 'match' && <MatchScreen />}
    {screen === 'messages' && <MessagesScreen />}
    {screen === 'profile' && <ProfileScreen profile={profile} onProfileUpdate={() => window.location.reload()} />}
    <Navbar screen={screen} setScreen={setScreen} />
  </div>
);
}