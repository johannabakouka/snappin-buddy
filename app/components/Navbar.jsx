'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { useT } from '../i18n';

export default function Navbar({ screen, setScreen, theme }) {
  const t = useT();
  const darkMode = theme?.dark ?? true;
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingCollabs, setPendingCollabs] = useState(0);
  const refreshRef = useRef(null);

  // Les pastilles sont toujours recomptées dans la base, jamais devinées.
  //
  // Avant, elles étaient chargées une seule fois au démarrage puis incrémentées
  // par le temps réel, et remises à zéro dès qu'on ouvrait l'onglet. Résultat :
  // si le temps réel ne passait pas — ce qui arrive dès que la connexion
  // hoquette — plus aucune pastille n'apparaissait de la session. Maintenant on
  // recompte à l'ouverture, à chaque changement d'écran, au retour sur l'app et
  // toutes les minutes. Deux comptages, rien n'est téléchargé.
  useEffect(() => {
    let alive = true;
    let msgChannel, collabChannel;

    async function refresh() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive || !user) return;

      const [{ count: unread }, { count: pending }] = await Promise.all([
        // read.is.null couvre les messages d'avant la colonne : sans ça ils ne
        // sont ni lus ni non lus, et la pastille les oublie.
        supabase.from('messages').select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id).or('read.is.null,read.eq.false'),
        supabase.from('collabs').select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id).eq('status', 'pending'),
      ]);
      if (!alive) return;
      setUnreadMessages(unread || 0);
      setPendingCollabs(pending || 0);
    }
    refreshRef.current = refresh;

    refresh();

    // Le temps réel n'est qu'un bonus : quand il passe, la pastille arrive tout
    // de suite au lieu d'attendre le prochain recomptage.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!alive || !user) return;
      msgChannel = supabase.channel('navbar-messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, refresh)
        .subscribe();
      collabChannel = supabase.channel('navbar-collabs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'collabs', filter: `receiver_id=eq.${user.id}` }, refresh)
        .subscribe();
    });

    const onWake = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onWake);
    const timer = setInterval(refresh, 60000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => refresh());

    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onWake);
      subscription?.unsubscribe();
      if (msgChannel) supabase.removeChannel(msgChannel);
      if (collabChannel) supabase.removeChannel(collabChannel);
    };
  }, []);

  // On recompte en changeant d'écran : une proposition à laquelle on vient de
  // répondre, un message qu'on vient de lire, et la pastille tombe d'elle-même.
  useEffect(() => {
    const id = setTimeout(() => refreshRef.current?.(), 400);
    return () => clearTimeout(id);
  }, [screen]);

  const tabs = [
    { id: 'map', label: t.map, icon: '◎' },
    { id: 'explore', label: t.explore, icon: '⊞' },
    { id: 'match', label: t.match, icon: '⚡', badge: pendingCollabs },
    { id: 'messages', label: t.messages, icon: '◻', badge: unreadMessages },
    { id: 'profile', label: t.profile, icon: '◉' },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '390px',
      background: darkMode ? 'rgba(10,10,10,0.97)' : 'rgba(245,245,245,0.97)',
      borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      display: 'flex', justifyContent: 'space-around',
      padding: '12px 0 calc(24px + env(safe-area-inset-bottom))', zIndex: 9999,
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setScreen(tab.id)} style={{
          background: 'none', border: 'none',
          color: screen === tab.id ? (darkMode ? '#FFFFFF' : '#000000') : '#888',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '4px', cursor: 'pointer', fontSize: '20px', position: 'relative',
        }}>
          <span style={{ position: 'relative' }}>
            {tab.icon}
            {tab.badge > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-8px',
                background: '#FF4D4D', color: 'white', borderRadius: '10px',
                minWidth: '16px', height: '16px', fontSize: '9px', fontWeight: '900',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
                border: `2px solid ${darkMode ? 'rgba(10,10,10,0.97)' : 'rgba(245,245,245,0.97)'}`,
              }}>
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            )}
          </span>
          <span style={{ fontSize: '10px' }}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}