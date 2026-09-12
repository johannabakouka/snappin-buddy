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
import WelcomeScreen from './components/WelcomeScreen';

function LoadingScreen() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{
      height: '100vh', background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '20px',
    }}>
      <img src="/logo.png" alt="Snappin'Buddy" style={{
        width: '100px', height: '100px', borderRadius: '24px', objectFit: 'cover',
        boxShadow: '0 0 40px rgba(255,255,255,0.1)',
        animation: 'pulse 2s ease-in-out infinite',
      }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: '22px', fontWeight: '900', color: 'white', letterSpacing: '-0.3px', marginBottom: '8px' }}>
          Snappin&apos;Buddy
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
          créez quelque chose de beau{dots}
        </p>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState('map');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    localStorage.removeItem('sb_user');
    localStorage.removeItem('sb_profile');

    const savedScreen = localStorage.getItem('lastScreen') || 'map';
    const savedDark = localStorage.getItem('darkMode');
    const savedWelcome = !localStorage.getItem('welcomeSeen');
    setScreen(savedScreen);
    setDarkMode(savedDark !== null ? savedDark === 'true' : true);
    setShowWelcome(savedWelcome);
    setInitialized(true);

    supabase.auth.getSession().then(async ({ data }) => {
      const u: any = data.session?.user ?? null;

      if (!u) {
        setUser(null);
        setProfile(null);
        setProfileChecked(true);
        setLoading(false);
        return;
      }

      setUser(u);
      const { data: p } = await supabase.from('profiles')
        .select('*')
        .eq('user_id', u.id)
        .single();

      setProfile(p || null);
      setProfileChecked(true);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const u: any = session?.user ?? null;
      if (u) {
        setUser(u);
        setProfileChecked(false); // Reset pendant le chargement
        const { data: p } = await supabase.from('profiles')
          .select('*')
          .eq('user_id', u.id)
          .single();
        setProfile(p || null);
        setProfileChecked(true);
        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
        setProfileChecked(true);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (initialized) localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode, initialized]);

  useEffect(() => {
    if (initialized) localStorage.setItem('lastScreen', screen);
  }, [screen, initialized]);

  const theme = {
    bg: darkMode ? '#0A0A0A' : '#F5F5F5',
    color: darkMode ? 'white' : '#111',
    dark: darkMode,
  };

  // Affiche loading tant que Supabase n'a pas répondu
  if (loading || !profileChecked) return (
    <div style={{ maxWidth: '390px', margin: '0 auto' }}>
      <LoadingScreen />
    </div>
  );

  if (!user) {
    if (showWelcome) return (
      <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh' }}>
        <WelcomeScreen onStart={() => {
          localStorage.setItem('welcomeSeen', 'true');
          setShowWelcome(false);
        }} />
      </div>
    );
    return (
      <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', background: theme.bg, color: theme.color }}>
        <AuthScreen onLogin={() => {}} theme={theme} />
      </div>
    );
  }

  // User connecté mais profil pas encore vérifié = loading
  if (!profileChecked) return (
    <div style={{ maxWidth: '390px', margin: '0 auto' }}>
      <LoadingScreen />
    </div>
  );

  // User connecté, profil vérifié, pas de profil = onboarding
  if (!profile) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100vh', background: theme.bg, color: theme.color }}>
      <OnboardingScreen user={user} onComplete={() => window.location.reload()} />
    </div>
  );

  return (
    <div style={{
      maxWidth: '390px', margin: '0 auto', height: '100vh',
      background: theme.bg, color: theme.color,
      position: 'relative', overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {screen === 'map' && <MapScreen theme={theme} />}
      {screen === 'explore' && <ExploreScreen theme={theme} />}
      {screen === 'match' && <MatchScreen theme={theme} setScreen={setScreen} />}
      {screen === 'messages' && <MessagesScreen theme={theme} />}
      {screen === 'profile' && <ProfileScreen profile={profile} theme={theme} darkMode={darkMode} setDarkMode={setDarkMode} onProfileUpdate={() => window.location.reload()} />}
      <Navbar screen={screen} setScreen={setScreen} theme={theme} />
    </div>
  );
}