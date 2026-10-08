'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import ChatScreen from './ChatScreen';
import BuddyProfileScreen from './BuddyProfileScreen';
import Header from './Header';
import { useT, useRoles } from '../i18n';
import { tx, isNotFrench } from '../tx';
import Thumb from './Thumb';
import { roleLabels } from '../constants';
import { loadIBlockedIds, onBlocksChanged } from '../blocks';
import { withAt } from '../handles';
import { loadPrefs, pinConversation, muteConversation, hideConversation, markUnread, clearUnread } from '../conversations';
import { usePullToRefresh } from '../pull-refresh';
import PullIndicator from './PullIndicator';
import { SkeletonList } from './Skeleton';
import { tap } from '../haptics';
import { followUser, unfollowUser, onFollowsChanged } from '../follows';

export default function MessagesScreen({ theme, active = true, setScreen, homeSignal = 0 }) {
  const t = useT();
  const isEn = isNotFrench();
  const [activeBuddy, setActiveBuddy] = useState(null);
  // Appui long sur une conversation : épingler, sourdine, non lue, retirer
  const [menuFor, setMenuFor] = useState(null);
  const [confirmHide, setConfirmHide] = useState(false);
  const [actionError, setActionError] = useState('');
  const pressTimer = useRef(null);
  const longPressed = useRef(false);
  // Profil ouvert depuis une conversation ou depuis la liste des buddies
  const [viewingBuddy, setViewingBuddy] = useState(null);
  const [conversations, setConversations] = useState([]);
  // Une liste vide et une liste pas encore chargée se ressemblent à l'écran :
  // sans ce drapeau, on annonçait « aucune conversation » avant d'avoir demandé.
  const [firstLoad, setFirstLoad] = useState(true);
  const [buddies, setBuddies] = useState([]);
  const [following, setFollowing] = useState([]);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('messages');

  // Rappui sur l'onglet Messages : on referme la conversation ouverte et on
  // revient à la liste. Les écrans restent montés en arrière-plan, donc sans ça
  // on retombait toujours sur la conversation laissée ouverte.
  const [seenHome, setSeenHome] = useState(homeSignal);
  if (homeSignal !== seenHome) {
    setSeenHome(homeSignal);
    setActiveBuddy(null);
    setViewingBuddy(null);
    setTab('messages');
  }
  const darkMode = theme?.dark ?? true;
  const subText = darkMode ? '#666' : '#888';
  const avatarBg = darkMode ? '#2C2C2C' : '#CCC';
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadConversations(data.user.id);
        loadBuddies(data.user.id);
        loadFollowing(data.user.id);
      }
    });
  }, []);

  // Un blocage vient d'avoir lieu : on recharge sans attendre le changement d'onglet.
  useEffect(() => onBlocksChanged(() => {
    if (user) { loadConversations(user.id); loadBuddies(user.id); }
  }), [user]);

  // Retour sur l'onglet : mise à jour silencieuse
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current && user) {
      loadConversations(user.id);
      loadBuddies(user.id);
      loadFollowing(user.id);
    }
    wasActive.current = active;
  }, [active]);

  async function loadConversations(userId) {
    const { data: msgs } = await supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false });
    // Le drapeau tombe en même temps que la liste arrive, jamais avant.
    // Posé ici trop tôt, il laissait trois requêtes se dérouler avec une liste
    // encore vide : l'écran affichait « Aucune conversation » pendant une
    // seconde, puis les conversations apparaissaient. C'est le message qui
    // clignotait à l'ouverture de l'onglet.
    if (!msgs || msgs.length === 0) { setConversations([]); setFirstLoad(false); return; }
    const prefs = await loadPrefs(userId);
    // Comme sur Instagram : celui qui bloque perd la conversation, la personne
    // bloquée la garde mais ne pourra plus écrire.
    const blocked = await loadIBlockedIds(userId);
    const buddyIds = [...new Set(msgs.map(m => m.sender_id === userId ? m.receiver_id : m.sender_id))]
      .filter(id => !blocked.has(id));
    const { data: profiles } = await supabase.from('profiles').select('user_id, username, handle, avatar_url').in('user_id', buddyIds);
    const convs = buddyIds.map(buddyId => {
      const profile = profiles?.find(p => p.user_id === buddyId);
      const lastMsg = msgs.find(m => (m.sender_id === userId && m.receiver_id === buddyId) || (m.sender_id === buddyId && m.receiver_id === userId));
      // Pas de profil = la personne a supprimé son compte. On garde la
      // conversation, mais sans nom, sans photo et sans lien vers un profil.
      const gone = !profile;
      const pref = prefs[buddyId] || {};
      const lastAt = lastMsg ? new Date(lastMsg.created_at).getTime() : 0;
      const hiddenAt = pref.hidden_at ? new Date(pref.hidden_at).getTime() : 0;

      // Conversation retirée de ma liste : elle ne revient qu'avec un message
      // plus récent que le moment où je l'ai retirée.
      if (hiddenAt && lastAt <= hiddenAt) return null;

      return {
        id: buddyId, user_id: buddyId,
        deletedAccount: gone,
        username: profile?.username || tx('Deleted account', 'Compte supprimé'),
        handle: profile?.handle || '',
        avatar_url: profile?.avatar_url || null,
        last: lastMsg?.deleted ? tx('Message deleted', 'Message supprimé') : (lastMsg?.content || ''),
        time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString(tx('en-GB', 'fr-FR'), { hour: '2-digit', minute: '2-digit' }) : '',
        lastAt,
        unread: msgs.filter(m => m.sender_id === buddyId && m.receiver_id === userId && m.read === false).length,
        pinned: Boolean(pref.pinned_at),
        pinnedAt: pref.pinned_at ? new Date(pref.pinned_at).getTime() : 0,
        muted: Boolean(pref.muted),
        forcedUnread: Boolean(pref.unread_forced),
      };
    }).filter(Boolean);

    // Épinglées d'abord, puis la plus récente en haut.
    convs.sort((a, b) => (b.pinnedAt - a.pinnedAt) || (b.lastAt - a.lastAt));
    setConversations(convs);
    setFirstLoad(false);
  }

  // Appui long : 450 ms, comme sur Instagram. On annule dès que le doigt
  // bouge, sinon un simple défilement ouvrirait le menu.
  function startPress(c) {
    longPressed.current = false;
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setConfirmHide(false);
      setMenuFor(c);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
    }, 450);
  }

  function cancelPress() {
    clearTimeout(pressTimer.current);
  }

  function openConversation(c) {
    // Un appui long vient d'ouvrir le menu : on n'ouvre pas la conversation derrière.
    if (longPressed.current) { longPressed.current = false; return; }
    if (user) clearUnread(user.id, c.id);
    setActiveBuddy(c);
  }

  // Épingler, mettre en sourdine, marquer non lue, retirer : le menu se
  // fermait et la liste se rechargeait identique quand l'action échouait.
  // « Rien ne s'est passé » est le seul retour que la personne obtenait.
  async function runAction(action) {
    let failed = false;
    try {
      const result = await action();
      // conversations.js renvoie null quand l'enregistrement a été refusé.
      if (result === null) failed = true;
    } catch (e) {
      console.error('conversation', e);
      failed = true;
    }
    setMenuFor(null);
    setConfirmHide(false);
    setActionError(failed ? tx("That didn't work. Try again.", "Ça n’a pas fonctionné. Réessaie.") : '');
    if (user) loadConversations(user.id);
  }

  async function loadBuddies(userId) {
    const { data: collabs } = await supabase.from('collabs').select('*').eq('status', 'accepted').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    if (!collabs || collabs.length === 0) return;
    const blocked = await loadIBlockedIds(userId);
    const buddyIds = [...new Set(collabs.map(c => c.sender_id === userId ? c.receiver_id : c.sender_id))]
      .filter(id => !blocked.has(id));
    const { data: profiles } = await supabase.from('profiles').select('user_id, username, handle, avatar_url, role, role_other, styles').in('user_id', buddyIds);
    setBuddies(profiles || []);
  }

  // Une liste vide et une liste qu'on n'a pas réussi à charger se ressemblent à
  // l'écran. On ne vide donc la liste que si le serveur a vraiment répondu.
  async function loadFollowing(userId) {
    const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
    if (error) { console.error('loadFollowing', error); return; }
    const ids = (data || []).map(f => f.following_id);
    if (ids.length === 0) { setFollowing([]); return; }
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles').select('user_id, username, handle, avatar_url, role, role_other, styles').in('user_id', ids);
    if (profilesError) { console.error('loadFollowing profiles', profilesError); return; }
    setFollowing(profiles || []);
  }

  // Le bouton change d'état avant la réponse du serveur. Sans ce retour en
  // arrière, on afficherait « Suivi » pour quelqu'un qu'on ne suit pas.
  //
  // L'écriture passe par le module partagé : c'est lui qui prévient les autres
  // écrans, et sans ça un suivi fait ici n'apparaissait pas dans Explorer tant
  // qu'on n'avait pas rechargé l'app.
  async function toggleFollow(targetUserId) {
    if (!user) return;
    setActionError('');
    tap();
    const isF = following.some(f => f.user_id === targetUserId);
    const snapshot = following;
    if (isF) {
      setFollowing(prev => prev.filter(f => f.user_id !== targetUserId));
      try {
        await unfollowUser(user.id, targetUserId);
      } catch (e) {
        console.error('unfollow', e);
        setFollowing(snapshot);
        setActionError(tx("Couldn't unfollow. Try again.", "Le retrait du suivi a échoué. Réessaie."));
      }
      return;
    }
    try {
      await followUser(user.id, targetUserId);
    } catch (e) {
      console.error('follow', e);
      setActionError(tx("Couldn't follow. Try again.", "Le suivi a échoué. Réessaie."));
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('user_id, username, handle, avatar_url, role, role_other, styles').eq('user_id', targetUserId).maybeSingle();
    if (profileError) { console.error('follow profile', profileError); return; }
    if (profile) setFollowing(prev => [...prev, profile]);
  }

  const isFollowingUser = (uid) => following.some(f => f.user_id === uid);

  // Un suivi ajouté depuis Explorer doit apparaître dans l'onglet Suivis sans
  // qu'on ait à recharger l'app.
  useEffect(() => onFollowsChanged(() => {
    if (user?.id) loadFollowing(user.id);
  }), [user?.id]);

  // Tirer vers le bas pour voir les nouveaux messages sans rouvrir l'app.
  const scrollRef = useRef(null);
  const { pull, refreshing, trigger } = usePullToRefresh(scrollRef, async () => {
    if (!user) return;
    await Promise.all([loadConversations(user.id), loadBuddies(user.id), loadFollowing(user.id)]);
  });

  const sheetButton = {
    width: '100%', textAlign: 'left', padding: '14px 12px',
    background: 'transparent', border: 'none', borderRadius: '12px',
    color: theme?.color, fontSize: '14px', fontWeight: '700',
    cursor: 'pointer', marginBottom: '4px',
  };

  const tabStyle = (active) => ({
    flex: 1, padding: '10px', border: 'none', background: 'transparent',
    color: active ? theme?.color : subText,
    fontWeight: active ? '800' : '600', fontSize: '14px', cursor: 'pointer',
    borderBottom: `2px solid ${active ? theme?.color : 'transparent'}`,
    transition: 'all 0.2s',
  });

  function ProfileCard({ p, canMessage = false }) {
  const ROLES = useRoles();
    const styles = (p.styles || '').split(',').map(s => s.trim()).filter(Boolean);
    return (
      <div
        onClick={() => setViewingBuddy(p)}
        style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: avatarBg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
          {p.avatar_url ? <Thumb src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: '700', fontSize: '14px', color: theme?.color }}>{p.username}</p>
          <p style={{ color: subText, fontSize: '11px' }}>{roleLabels(p.role, ROLES, p.role_other)}{p.handle ? ` · ${withAt(p.handle)}` : ''}</p>
          {styles.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
              {styles.slice(0, 3).map(s => (
                <span key={s} style={{ fontSize: '10px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '1px 7px' }}>{s}</span>
              ))}
            </div>
          )}
        </div>
        {canMessage && (
          <button onClick={() => setActiveBuddy(p)} aria-label={tx('Message', 'Écrire')} title={tx('Message', 'Écrire')} style={{
            width: '34px', height: '34px', borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
            background: theme?.color, color: theme?.bg, fontSize: '15px',
          }}>💬</button>
        )}
        <button onClick={() => toggleFollow(p.user_id)} style={{
          padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          border: `1px solid ${isFollowingUser(p.user_id) ? cardBorder : theme?.color}`,
          background: isFollowingUser(p.user_id) ? 'transparent' : theme?.color,
          color: isFollowingUser(p.user_id) ? subText : theme?.bg,
          flexShrink: 0,
        }}>
          {isFollowingUser(p.user_id) ? (tx('Following ✓', 'Suivi ✓')) : (tx('Follow', 'Suivre'))}
        </button>
      </div>
    );
  }

  if (viewingBuddy) return (
    <BuddyProfileScreen buddy={viewingBuddy} onBack={() => setViewingBuddy(null)} theme={theme} />
  );

  if (activeBuddy) return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: theme?.bg }}>
      <ChatScreen
        buddy={activeBuddy}
        onBack={() => { setActiveBuddy(null); if (user) loadConversations(user.id); }}
        onOpenProfile={() => setViewingBuddy(activeBuddy)}
        theme={theme}
      />
    </div>
  );

  return (
    <div ref={scrollRef} style={{ height: '100dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color, position: 'relative' }}>
      <PullIndicator pull={pull} refreshing={refreshing} trigger={trigger} darkMode={darkMode} />
      <Header theme={theme} />

      <div style={{ display: 'flex', borderBottom: `1px solid ${cardBorder}`, flexShrink: 0 }}>
        <button style={tabStyle(tab === 'messages')} onClick={() => setTab('messages')}>💬 {t.messages}</button>
        <button style={tabStyle(tab === 'buddies')} onClick={() => setTab('buddies')}>⚡ Buddies</button>
        <button style={tabStyle(tab === 'suivis')} onClick={() => setTab('suivis')}>🔖 {tx('Following', 'Suivis')}</button>
      </div>

      <div style={{ padding: '20px 16px calc(110px + env(safe-area-inset-bottom))' }}>

        {tab === 'messages' && (
          <>
            {firstLoad && conversations.length === 0 && (
              <div style={{ padding: '4px 0' }}><SkeletonList count={4} darkMode={darkMode} /></div>
            )}
            {!firstLoad && conversations.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '48px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>💬</p>
                <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>
                  {tx('No conversations yet', 'Aucune conversation pour l\'instant')}
                </p>
                <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>
                  {tx('A conversation opens once a proposal is accepted.', 'Une conversation s’ouvre dès qu’une proposition est acceptée.')}
                </p>
                <button
                  onClick={() => setScreen?.('explore')}
                  style={{
                    padding: '11px 20px', borderRadius: '22px', border: 'none', cursor: 'pointer',
                    background: theme?.color, color: theme?.bg, fontSize: '13px', fontWeight: '800',
                  }}
                >
                  {tx('Explore creatives', 'Explorer les créatifs')}
                </button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {conversations.map(c => (
                <div
                  key={c.id}
                  onClick={() => openConversation(c)}
                  onTouchStart={() => startPress(c)}
                  onTouchEnd={cancelPress}
                  onTouchMove={cancelPress}
                  onTouchCancel={cancelPress}
                  onMouseDown={() => startPress(c)}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onContextMenu={e => { e.preventDefault(); setConfirmHide(false); setMenuFor(c); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 12px', borderRadius: '12px', cursor: 'pointer',
                    background: c.pinned ? (darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)') : 'transparent',
                    WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: avatarBg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    {c.avatar_url ? <Thumb src={c.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: theme?.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.pinned && '📌 '}{c.username}{c.muted && ' 🔕'}
                      </span>
                      <span style={{ color: subText, fontSize: '11px', flexShrink: 0 }}>{c.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <div style={{ flex: 1, minWidth: 0, color: (c.unread || c.forcedUnread) ? theme?.color : subText, fontWeight: (c.unread || c.forcedUnread) ? '700' : '400', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last}</div>
                      {c.unread > 0 ? (
                        <span style={{ minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px', background: '#F2E050', color: '#0A0A0A', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.unread}</span>
                      ) : c.forcedUnread ? (
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F2E050', flexShrink: 0 }} />
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'buddies' && (
          <>
            <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>
              {tx('Creatives you\'ve already collaborated with', 'Créatifs avec qui tu as déjà collaboré')}
            </p>
            {buddies.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</p>
                <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>{tx('No buddies yet', 'Pas encore de buddies')}</p>
                <p style={{ color: subText, fontSize: '13px' }}>{tx('Your accepted collabs will appear here!', 'Tes collabs acceptées apparaîtront ici !')}</p>
              </div>
            ) : (
              buddies.map(p => <ProfileCard key={p.user_id} p={p} canMessage />)
            )}
          </>
        )}

        {tab === 'suivis' && (
          <>
            <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>
              {tx('Your private list of creatives to follow', 'Ta liste privée de créatifs à suivre')}
            </p>
            {following.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔖</p>
                <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>{tx('Nobody yet', 'Personne encore')}</p>
                <p style={{ color: subText, fontSize: '13px' }}>{tx('Follow creatives from Explore or Buddies!', 'Suis des créatifs depuis Explorer ou Buddies !')}</p>
              </div>
            ) : (
              following.map(p => <ProfileCard key={p.user_id} p={p} />)
            )}
          </>
        )}
      </div>

      {/* Menu d'appui long sur une conversation */}
      {menuFor && (
        <div
          onClick={() => { setMenuFor(null); setConfirmHide(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '390px',
              background: darkMode ? '#141414' : '#FFFFFF',
              borderRadius: '20px 20px 0 0',
              padding: '18px 16px calc(24px + env(safe-area-inset-bottom))',
            }}
          >
            <p style={{ color: subText, fontSize: '12px', fontWeight: '700', marginBottom: '14px', textAlign: 'center' }}>
              {menuFor.username}
            </p>

            {confirmHide ? (
              <>
                <p style={{ color: theme?.color, fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
                  {tx(
                    'This conversation leaves your list. The messages stay with the other person, and it comes back if they write to you again.',
                    'La conversation quitte ta liste. Les messages restent chez l’autre personne, et elle revient si elle t’écrit à nouveau.',
                  )}
                </p>
                <button
                  onClick={() => runAction(() => hideConversation(user.id, menuFor.id))}
                  style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: '#FF4D4D', color: 'white', fontSize: '14px', fontWeight: '800', cursor: 'pointer', marginBottom: '8px' }}
                >
                  {tx('Remove the conversation', 'Retirer la conversation')}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => runAction(() => pinConversation(user.id, menuFor.id, !menuFor.pinned))} style={sheetButton}>
                  📌 {menuFor.pinned ? tx('Unpin', 'Désépingler') : tx('Pin', 'Épingler')}
                </button>

                {menuFor.unread === 0 && !menuFor.forcedUnread && (
                  <button onClick={() => runAction(() => markUnread(user.id, menuFor.id))} style={sheetButton}>
                    🔵 {tx('Mark as unread', 'Marquer comme non lu')}
                  </button>
                )}

                <button onClick={() => runAction(() => muteConversation(user.id, menuFor.id, !menuFor.muted))} style={sheetButton}>
                  {menuFor.muted
                    ? `🔔 ${tx('Turn notifications back on', 'Réactiver les notifications')}`
                    : `🔕 ${tx('Mute', 'Mettre en sourdine')}`}
                </button>

                <button onClick={() => setConfirmHide(true)} style={{ ...sheetButton, color: '#FF4D4D' }}>
                  🗑 {tx('Remove from my list', 'Retirer de ma liste')}
                </button>
              </>
            )}

            <button
              onClick={() => { setMenuFor(null); setConfirmHide(false); }}
              style={{ ...sheetButton, color: subText, marginBottom: 0 }}
            >
              {tx('Cancel', 'Annuler')}
            </button>
          </div>
        </div>
      )}
      {actionError && (
        <div
          onClick={() => setActionError('')}
          style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)',
            bottom: 'calc(100px + env(safe-area-inset-bottom))', zIndex: 9000,
            width: 'calc(100% - 32px)', maxWidth: '358px', cursor: 'pointer',
            background: '#FF4D4D', color: 'white', borderRadius: '14px',
            padding: '12px 16px', fontSize: '13px', fontWeight: '700',
            boxShadow: '0 6px 24px rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: '10px',
          }}
        >
          <span>{actionError}</span>
          <span style={{ flexShrink: 0, opacity: 0.8 }}>✕</span>
        </div>
      )}
    </div>
  );
}