'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Navbar from './components/Navbar';
import MapScreen from './components/MapScreen';
import ExploreScreen from './components/ExploreScreen';
import MatchScreen from './components/MatchScreen';
import MessagesScreen from './components/MessagesScreen';
import ProfileScreen from './components/ProfileScreen';
import AuthScreen from './components/AuthScreen';
import OnboardingScreen from './components/OnboardingScreen';

export default function Home() {
  const [screen, setScreen] = useState('map');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const theme = {
    bg: darkMode ? '#0A0A0A' : '#F5F5F5',
    color: darkMode ? 'white' : '#111',
    dark: darkMode,
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u: any = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase.from('profiles').select('*').eq('user_id', u.id).single();
        setProfile(p);
      }
      setLoading(false);
    });
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const u: any = session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase.from('profiles').select('*').eq('user_id', u.id).single();
        setProfile(p);
      }
    });
  }, []);

  if (loading) return <div style={{ height: '100vh', background: '#0A0A0A' }}/>;

  if (!user) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', background: theme.bg, color: theme.color }}>
      <AuthScreen onLogin={() => {}} theme={theme} />
    </div>
  );

  if (!profile) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', background: theme.bg, color: theme.color }}>
      <OnboardingScreen user={user} onComplete={() => window.location.reload()} />
    </div>
  );

  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', background: theme.bg, color: theme.color, position: 'relative', overflow: 'hidden' }}>
      {screen === 'map' && <MapScreen theme={theme} />}
      {screen === 'explore' && <ExploreScreen theme={theme} />}
      {screen === 'match' && <MatchScreen theme={theme} setScreen={setScreen} />}
      {screen === 'messages' && <MessagesScreen theme={theme} />}
      {screen === 'profile' && <ProfileScreen profile={profile} theme={theme} darkMode={darkMode} setDarkMode={setDarkMode} onProfileUpdate={() => window.location.reload()} />}
      <Navbar screen={screen} setScreen={setScreen} theme={theme} />
    </div>
  );
}