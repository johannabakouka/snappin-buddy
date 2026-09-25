'use client';
import { useState, useEffect, useRef } from 'react';
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
import NewPasswordScreen from './components/NewPasswordScreen';
import ErrorBoundary from './components/ErrorBoundary';

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
      height: '100dvh', background: '#0A0A0A',
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

const SCREENS = ['map', 'explore', 'match', 'messages', 'profile'];

export default function Home() {
  const [screen, setScreen] = useState('map');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  // Pseudo du compte auquel le mail était adressé (lien ...?for=pseudo)
  const [linkFor, setLinkFor] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('for');
  });
  const [darkMode, setDarkMode] = useState(true);
  const [initialized, setInitialized] = useState(false);
  // Écrans déjà ouverts : ils restent en mémoire (cachés) pour revenir dessus instantanément
  const [visited, setVisited] = useState<string[]>([]);
  // Lien « mot de passe oublié » ouvert : on affiche l'écran de nouveau mot de passe
  const [recovery, setRecovery] = useState(false);
  // Incrémenté pour demander à l'écran Match d'afficher « Mes projets »
  const [myProjectsSignal, setMyProjectsSignal] = useState(0);
  const userIdRef = useRef<string | null>(null);

  async function fetchProfile(userId: string) {
    const { data: p } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    setProfile(p || null);
  }

  async function refreshProfile() {
    if (userIdRef.current) await fetchProfile(userIdRef.current);
  }

  useEffect(() => {
    localStorage.removeItem('sb_user');
    localStorage.removeItem('sb_profile');

    const savedScreen = localStorage.getItem('lastScreen') || 'map';
    const savedDark = localStorage.getItem('darkMode');
    const savedWelcome = !localStorage.getItem('welcomeSeen');
    setScreen(SCREENS.includes(savedScreen) ? savedScreen : 'map');
    setDarkMode(savedDark !== null ? savedDark === 'true' : true);
    setShowWelcome(savedWelcome);
    setInitialized(true);

    // Un seul point d'entrée pour la session. Si c'est le même utilisateur
    // (renouvellement du jeton, retour sur l'onglet), on ne recharge rien :
    // avant, l'app repassait par l'écran de chargement et perdait tous ses écrans.
    function handleUser(u: any) {
      if (!u) {
        userIdRef.current = null;
        setUser(null);
        setProfile(null);
        setProfileChecked(true);
        setLoading(false);
        return;
      }
      if (u.id === userIdRef.current) {
        setUser(u);
        return;
      }
      userIdRef.current = u.id;
      setUser(u);
      setProfileChecked(false);
      // setTimeout : Supabase déconseille d'appeler la base directement dans onAuthStateChange
      setTimeout(async () => {
        await fetchProfile(u.id);
        setProfileChecked(true);
        setLoading(false);
      }, 0);
    }

    supabase.auth.getSession().then(({ data }) => handleUser(data.session?.user ?? null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      handleUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  function forgetLink() {
    setLinkFor(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('for');
    window.history.replaceState({}, '', url.pathname + url.search);
  }

  useEffect(() => {
    if (initialized) localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode, initialized]);

  useEffect(() => {
    if (initialized) localStorage.setItem('lastScreen', screen);
  }, [screen, initialized]);

  // Mémorise les écrans déjà ouverts (mise à jour pendant le rendu, recommandée par React)
  if (!visited.includes(screen)) setVisited([...visited, screen]);

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

  if (recovery && user) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100dvh', background: theme.bg, color: theme.color }}>
      <NewPasswordScreen theme={theme} onDone={() => setRecovery(false)} />
    </div>
  );

  if (!user) {
    if (showWelcome) return (
      <div style={{ maxWidth: '390px', margin: '0 auto', height: '100dvh' }}>
        <WelcomeScreen onStart={() => {
          localStorage.setItem('welcomeSeen', 'true');
          setShowWelcome(false);
        }} />
      </div>
    );
    return (
      <div style={{ maxWidth: '390px', margin: '0 auto', height: '100dvh', background: theme.bg, color: theme.color }}>
        <AuthScreen onLogin={() => {}} theme={theme} />
      </div>
    );
  }

  // User connecté, profil vérifié, pas de profil = onboarding
  if (!profile) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100dvh', background: theme.bg, color: theme.color }}>
      <OnboardingScreen user={user} onComplete={refreshProfile} />
    </div>
  );

  function openMyProjects() {
    setMyProjectsSignal(n => n + 1);
    setScreen('match');
  }

  function renderScreen(name: string) {
    const active = screen === name;
    switch (name) {
      case 'map': return <MapScreen theme={theme} active={active} />;
      case 'explore': return <ExploreScreen theme={theme} active={active} />;
      case 'match': return <MatchScreen theme={theme} setScreen={setScreen} active={active} myProjectsSignal={myProjectsSignal} />;
      case 'messages': return <MessagesScreen theme={theme} active={active} />;
      case 'profile': return <ProfileScreen profile={profile} theme={theme} darkMode={darkMode} setDarkMode={setDarkMode} onProfileUpdate={refreshProfile} onOpenMyProjects={openMyProjects} />;
      default: return null;
    }
  }

  const wrongAccount = !!linkFor && !!profile?.username &&
    profile.username.trim().toLowerCase() !== linkFor.trim().toLowerCase();

  return (
    <div style={{
      maxWidth: '390px', margin: '0 auto', height: '100dvh',
      background: theme.bg, color: theme.color,
      position: 'relative', overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {SCREENS.filter(name => name === screen || visited.includes(name)).map(name => (
        <div key={name} style={{ display: name === screen ? 'block' : 'none', height: '100%' }}>
          <ErrorBoundary theme={theme}>
            {renderScreen(name)}
          </ErrorBoundary>
        </div>
      ))}
      <Navbar screen={screen} setScreen={setScreen} theme={theme} />

      {wrongAccount && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(96px + env(safe-area-inset-bottom))', zIndex: 9000,
          width: 'calc(100% - 32px)', maxWidth: '358px',
          background: darkMode ? '#1A1A1A' : '#FFFFFF',
          border: '1px solid rgba(242,224,80,0.5)', borderRadius: '18px',
          padding: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}>
          <p style={{ fontSize: '13px', fontWeight: '800', color: theme.color, marginBottom: '4px' }}>
            ✉️ Ce mail concerne @{linkFor}
          </p>
          <p style={{ fontSize: '12px', lineHeight: 1.5, color: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
            Tu es connecté·e en tant que @{profile?.username}.<br />
            This email was sent to @{linkFor}, you are signed in as @{profile?.username}.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={async () => { await supabase.auth.signOut(); }}
              style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: '#F2E050', color: '#0A0A0A', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
            >
              Changer de compte · Switch
            </button>
            <button
              onClick={forgetLink}
              style={{ flex: 1, padding: '10px', borderRadius: '20px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`, background: 'transparent', color: theme.color, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
            >
              Rester ici · Stay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
