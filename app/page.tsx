'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { getLang } from './i18n';
import { tx } from './tx';
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
import BuddyProfileScreen from './components/BuddyProfileScreen';
import ScanResultScreen from './components/ScanResultScreen';

function LoadingScreen() {
  const [dots, setDots] = useState('');
  // Les couleurs viennent des variables posées par le petit script de
  // layout.tsx, avant le premier pixel. Les lire ici en JavaScript ne marchait
  // pas : la page est fabriquée par le serveur, et React garde la valeur du
  // serveur au moment de reprendre la main. L'app s'ouvrait donc en sombre
  // puis basculait en clair d'un coup.
  const bg = 'var(--sb-bg, #0A0A0A)';
  const fg = 'var(--sb-color, #FFFFFF)';
  // C'est le seul écran fabriqué par le serveur, qui n'a aucun moyen de
  // connaître la langue du visiteur. On écrit donc la phrase une fois dans le
  // navigateur : sinon elle s'affiche en français une fraction de seconde chez
  // tout le monde avant de basculer.
  const taglineRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    document.documentElement.lang = getLang();
    if (taglineRef.current) {
      taglineRef.current.textContent = tx('create something beautiful', 'créez quelque chose de beau');
    }
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return (
    // Fixé sur tout l'écran, et pas dans la colonne de 390 px où vivent les
    // autres écrans : sur un téléphone plus large, l'écran de démarrage
    // laissait des bandes de chaque côté, et elles étaient claires le temps que
    // le thème enregistré soit lu.
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
      background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '20px',
    }}>
      <img src="/logo.png" alt="Snappin'Buddy" style={{
        width: '100px', height: '100px', borderRadius: '24px', objectFit: 'cover',
        boxShadow: '0 0 40px rgba(128,128,128,0.12)',
        animation: 'pulse 2s ease-in-out infinite',
      }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: '22px', fontWeight: '900', color: fg, letterSpacing: '-0.3px', marginBottom: '8px' }}>
          Snappin&apos;Buddy
        </p>
        <p style={{ color: fg, opacity: 0.35, fontSize: '13px', minHeight: '18px' }}>
          <span ref={taglineRef} />{dots}
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
  const [screen, setScreen] = useState(() => {
    if (typeof window === 'undefined') return 'map';
    return new URLSearchParams(window.location.search).get('offer') ? 'match' : 'map';
  });
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  // Pseudo du compte auquel le mail était adressé (lien ...?for=pseudo)
  // Lien partagé en story : snappinbuddy.com/?offer=123 ouvre directement le projet
  const [sharedOfferId, setSharedOfferId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('offer');
  });

  // QR de rencontre scanné avec l'appareil photo : snappinbuddy.com/?scan=<id>
  const [scanSession, setScanSession] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('scan');
  });

  // Lien de profil partagé en story : snappinbuddy.com/?buddy=sofia
  const [sharedBuddyHandle, setSharedBuddyHandle] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('buddy');
  });
  const [sharedBuddy, setSharedBuddy] = useState<Record<string, unknown> | null>(null);

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
  // Même mécanique pour « Mes candidatures », qui ouvre l'onglet Match
  const [myApplicationsSignal, setMyApplicationsSignal] = useState(0);
  const userIdRef = useRef<string | null>(null);

  // Le pseudo est unique : il suffit à retrouver la personne.
  useEffect(() => {
    if (!sharedBuddyHandle) return;
    let alive = true;
    supabase
      .from('profiles')
      .select('*')
      .ilike('handle', `@${sharedBuddyHandle}`)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        if (data) setSharedBuddy(data);
        setSharedBuddyHandle(null);
        const url = new URL(window.location.href);
        url.searchParams.delete('buddy');
        window.history.replaceState({}, '', url.pathname + url.search);
      });
    return () => { alive = false; };
  }, [sharedBuddyHandle]);

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

    // On ne déconnecte QUE sur une vraie déconnexion.
    //
    // Avant, n'importe quelle notification sans session sortait la personne de
    // l'app — y compris un renouvellement de jeton qui rate une fois, ce qui
    // arrive quand deux onglets se réveillent en même temps. Résultat :
    // déconnexions spontanées au bout de quelques minutes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (!session && event !== 'SIGNED_OUT') return;
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

  // Le fond de la page suit le thème. Sans ça, globals.css gardait un noir dur
  // et les marges de part et d'autre de la colonne restaient noires en mode
  // clair, sur tout écran plus large que 390 px.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sb-bg', darkMode ? '#0A0A0A' : '#F5F5F5');
    root.style.setProperty('--sb-color', darkMode ? '#FFFFFF' : '#111111');
  }, [darkMode]);

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
  if (loading || !profileChecked) return <LoadingScreen />;

  if (recovery && user) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100dvh', background: theme.bg, color: theme.color }}>
      <NewPasswordScreen theme={theme} onDone={() => setRecovery(false)} />
    </div>
  );

  if (!user) {
    if (showWelcome) return (
      <div style={{ maxWidth: '390px', margin: '0 auto', height: '100dvh' }}>
        <WelcomeScreen theme={theme} onStart={() => {
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

  // Compte suspendu : l'app s'arrête ici. Les CGU annoncent la suspension
  // comme sanction, mais rien ne l'appliquait : un compte sanctionné continuait
  // d'écrire et d'apparaître partout.
  if (profile?.suspended_at) return (
    <div style={{
      maxWidth: '390px', margin: '0 auto', height: '100dvh',
      background: theme.bg, color: theme.color,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 24px', textAlign: 'center', gap: '14px',
    }}>
      <p style={{ fontSize: '36px' }}>⏸</p>
      <p style={{ fontSize: '18px', fontWeight: '800' }}>
        {tx('Your account is suspended', 'Ton compte est suspendu')}
      </p>
      <p style={{ fontSize: '14px', lineHeight: 1.6, opacity: 0.7 }}>
        {profile.suspended_reason
          ? tx('Reason: ', 'Motif : ') + profile.suspended_reason
          : tx('Following a report about your account.', 'À la suite d’un signalement concernant ton compte.')}
      </p>
      <p style={{ fontSize: '13px', lineHeight: 1.6, opacity: 0.55 }}>
        {tx(
          'You can contest this decision by writing to contact@snappinbuddy.com.',
          'Tu peux contester cette décision en écrivant à contact@snappinbuddy.com.',
        )}
      </p>
      <button
        onClick={() => supabase.auth.signOut()}
        style={{
          marginTop: '8px', padding: '12px 22px', borderRadius: '22px', border: 'none',
          background: theme.color, color: theme.bg, fontSize: '14px', fontWeight: '800', cursor: 'pointer',
        }}
      >
        {tx('Sign out', 'Se déconnecter')}
      </button>
    </div>
  );

  // User connecté, profil vérifié, pas de profil = onboarding
  if (!profile) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', height: '100dvh', background: theme.bg, color: theme.color }}>
      <OnboardingScreen user={user} onComplete={refreshProfile} theme={theme} />
    </div>
  );

  function openMyProjects() {
    setMyProjectsSignal(n => n + 1);
    setScreen('match');
  }

  function openMyApplications() {
    setMyApplicationsSignal(n => n + 1);
    setScreen('match');
  }

  function renderScreen(name: string) {
    const active = screen === name;
    switch (name) {
      case 'map': return <MapScreen theme={theme} active={active} />;
      case 'explore': return <ExploreScreen theme={theme} active={active} />;
      case 'match': return (
        <MatchScreen
          theme={theme}
          setScreen={setScreen}
          active={active}
          myProjectsSignal={myProjectsSignal}
          myApplicationsSignal={myApplicationsSignal}
          sharedOfferId={sharedOfferId || ''}
          onSharedOfferSeen={() => {
            setSharedOfferId(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('offer');
            window.history.replaceState({}, '', url.pathname + url.search);
          }}
        />
      );
      case 'messages': return <MessagesScreen theme={theme} active={active} setScreen={setScreen} />;
      case 'profile': return <ProfileScreen profile={profile} theme={theme} darkMode={darkMode} setDarkMode={setDarkMode} onProfileUpdate={refreshProfile} onOpenMyProjects={openMyProjects} onOpenMyApplications={openMyApplications} />;
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

      {/* Rencontre validée par scan du QR */}
      {scanSession && (
        <ScanResultScreen
          sessionId={scanSession}
          theme={theme}
          onDone={() => {
            setScanSession(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('scan');
            window.history.replaceState({}, '', url.pathname + url.search);
            refreshProfile();
          }}
        />
      )}

      {/* Profil ouvert depuis un lien partagé en story */}
      {sharedBuddy && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: theme.bg }}>
          <BuddyProfileScreen buddy={sharedBuddy} theme={theme} onBack={() => setSharedBuddy(null)} />
        </div>
      )}

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
