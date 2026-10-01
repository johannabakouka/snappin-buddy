'use client';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import EditProfileScreen from './EditProfileScreen';
import LegalScreen from './LegalScreen';
import AccountScreen from './AccountScreen';
import BuddyProfileScreen from './BuddyProfileScreen';
import ErrorBoundary from './ErrorBoundary';
import ProfileShareCard from './ProfileShareCard';
import { loadMyBlocks, unblockUser, onBlocksChanged } from '../blocks';
import { withAt } from '../handles';
import { useT, useRoles } from '../i18n';
import { tx, isNotFrench } from '../tx';
import { UNIVERS_FR, UNIVERS_EN, roleLabels } from '../constants';
import { uploadProfileImage, removeByPublicUrl, AVATAR_BUCKET } from '../image-upload';

function translateTag(tag, isEn) {
  if (!isEn) return tag;
  const idx = UNIVERS_FR.indexOf(tag.toLowerCase());
  return idx >= 0 ? UNIVERS_EN[idx] : tag;
}

function ProfileScore({ profile, isEn, darkMode, theme, subText, onEdit }) {
  const steps = [
    { key: 'avatar', label: tx('Profile photo', 'Photo de profil'), done: !!profile?.avatar_url, pts: 25 },
    { key: 'role', label: tx('Role', 'Rôle'), done: !!profile?.role, pts: 25 },
    { key: 'bio', label: 'Pitch', done: !!profile?.bio, pts: 20 },
    { key: 'univers', label: tx('Universe', 'Univers'), done: (profile?.styles || '').trim().length > 0, pts: 20 },
    { key: 'zone', label: tx('Area', 'Zone'), done: !!profile?.zone, pts: 10 },
  ];

  const score = steps.filter(s => s.done).reduce((acc, s) => acc + s.pts, 0);
  const missing = steps.filter(s => !s.done);

  let message, messageColor;
  if (score < 50) {
    message = tx('Complete your profile to be found more easily!', 'Complète ton profil pour être trouvé plus facilement !');
    messageColor = '#FF4D4D';
  } else if (score < 80) {
    message = tx('Good start! The more complete, the more you match', 'Bon début ! Plus ton profil est riche, plus tu matches');
    messageColor = '#FFD700';
  } else if (score < 80) {
    message = tx('Almost perfect!', 'Presque parfait !');
    messageColor = '#FFD700';
  } else {
    message = tx('Complete profile 🔥 Ready to create something beautiful!', 'Profil complet 🔥 Prêt à créer quelque chose de beau !');
    messageColor = '#2ECC71';
  }

  const barColor = score < 50 ? '#FF4D4D' : score < 80 ? '#FFD700' : '#2ECC71';
  const scoreLabel = tx('Profile strength', 'Force du profil');

  return (
    <div style={{
      background: darkMode ? '#1A1A1A' : '#E8E8E8',
      borderRadius: '16px', padding: '16px', marginBottom: '16px',
      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: theme.color }}>{scoreLabel}</span>
        <span style={{ fontSize: '13px', fontWeight: '900', color: barColor }}>{score}%</span>
      </div>
      <div style={{ height: '6px', background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: '3px', marginBottom: '10px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: barColor, borderRadius: '3px', transition: 'width 0.5s ease' }} />
      </div>
      <p style={{ fontSize: '12px', color: messageColor, fontWeight: '600', marginBottom: missing.length > 0 ? '10px' : '0' }}>
        {message}
      </p>
      {missing.length > 0 && score < 100 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {missing.map(s => (
            <button key={s.key} onClick={onEdit} style={{
              fontSize: '11px', color: subText,
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
              borderRadius: '20px', padding: '3px 10px',
              background: 'transparent', cursor: 'pointer',
            }}>
              + {s.label}
            </button>
          ))}
        </div>
      )}
      {(profile?.portfolio_urls?.length > 0 || profile?.video_url) && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
          {profile?.portfolio_urls?.length > 0 && (
            <span style={{ fontSize: '10px', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.3)', borderRadius: '20px', padding: '2px 8px', fontWeight: '700' }}>
              🖼 Portfolio
            </span>
          )}
          {profile?.video_url && (
            <span style={{ fontSize: '10px', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.3)', borderRadius: '20px', padding: '2px 8px', fontWeight: '700' }}>
              🎬 {tx('Video', 'Vidéo')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfileScreen({ profile, onProfileUpdate, theme, darkMode, setDarkMode, onOpenMyProjects, onOpenMyApplications }) {
  const t = useT();
  const ROLES = useRoles();
  const [editing, setEditing] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sharingProfile, setSharingProfile] = useState(false);
  // Comptes bloqués et déconnexion de toutes les sessions
  const [blockedList, setBlockedList] = useState(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  // Liste des projets validés, ouverte depuis la carte du compteur
  const [showValidated, setShowValidated] = useState(false);
  const [validatedList, setValidatedList] = useState(null);
  const [status, setStatus] = useState(profile?.status || 'dispo');
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [avatarError, setAvatarError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const fileInputRef = useRef(null);
  const [openProjects, setOpenProjects] = useState(null);

  const [sentCount, setSentCount] = useState(null);
  useEffect(() => {
    if (!profile?.user_id) return;
    supabase.from('collabs').select('id', { count: 'exact', head: true })
      .eq('sender_id', profile.user_id)
      .then(({ count }) => setSentCount(count ?? 0));
  }, [profile?.user_id]);

  // Le titre du projet est dans le message de candidature : « Je me propose pour : X ».
  function projectTitle(message) {
    const m = String(message || '');
    const i = m.indexOf(':');
    const title = (i >= 0 ? m.slice(i + 1) : m).trim();
    return title || tx('Project', 'Projet');
  }

  // Un compteur sans la liste derrière ne veut rien dire : on veut revoir avec
  // qui, et sur quoi. Rechargé à chaque ouverture, jamais mis en cache.
  async function openValidated() {
    setShowValidated(true);
    if (!profile?.user_id) return;
    setValidatedList(null);
    try {
      const { data } = await supabase
        .from('collabs')
        .select('id, sender_id, receiver_id, message, validated_at')
        .or(`sender_id.eq.${profile.user_id},receiver_id.eq.${profile.user_id}`)
        .not('validated_at', 'is', null)
        .order('validated_at', { ascending: false });

      const rows = data || [];
      const otherId = c => (c.sender_id === profile.user_id ? c.receiver_id : c.sender_id);
      const others = [...new Set(rows.map(otherId))];

      let people = [];
      if (others.length) {
        const { data: ps } = await supabase
          .from('profiles')
          .select('user_id, username, handle, avatar_url')
          .in('user_id', others);
        people = ps || [];
      }

      setValidatedList(rows.map(c => ({ ...c, buddy: people.find(p => p.user_id === otherId(c)) || null })));
    } catch (e) {
      console.error('projets validés', e);
      setValidatedList([]);
    }
  }

  // Nombre de projets en cours, affiché sur le bouton « Mes projets »
  useEffect(() => {
    if (!profile?.user_id) return;
    supabase.from('offers').select('id', { count: 'exact', head: true })
      .eq('user_id', profile.user_id).eq('status', 'open')
      .then(({ count }) => setOpenProjects(count ?? 0));
  }, [profile?.user_id]);

  const isEn = isNotFrench();

  const STATUTS = [
    { id: 'dispo', label: tx('Available', 'Disponible'), color: '#2ECC71' },
    { id: 'shoot', label: tx('On shoot', 'En shoot'), color: '#FFD700' },
    { id: 'indispo', label: tx('Unavailable', 'Indisponible'), color: '#FF4D4D' },
  ];

  const styles = (profile?.styles || '').split(',').map(s => s.trim()).filter(Boolean);
  const zones = (profile?.zone || '').split(',').map(z => z.trim()).filter(Boolean);
  const [receipts, setReceipts] = useState(profile?.read_receipts !== false);

  async function toggleReceipts() {
    const next = !receipts;
    setReceipts(next);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ read_receipts: next }).eq('user_id', user.id);
  }

  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardText = darkMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.78)';
  const tagColor = darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)';
  const tagBorder = darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
  const subText = darkMode ? '#666' : '#888';

  const roleLabel = roleLabels(profile?.role, ROLES);

  async function updateStatus(newStatus) {
    setStatus(newStatus);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ status: newStatus }).eq('user_id', user.id);
      await onProfileUpdate();
    }
  }

  // La photo de profil ne changeait pas, et sans jamais rien dire. Trois causes,
  // toutes corrigées ici :
  //   1. le champ de fichier gardait la photo choisie, donc re-choisir la même
  //      ne déclenchait plus rien — on le vide maintenant à chaque fois ;
  //   2. l'envoi réutilisait un nom de fichier fixe, ce qui exige un droit de
  //      remplacement que le stockage n'accorde pas (voir uploadProfileImage) ;
  //   3. l'erreur d'envoi était ignorée : il ne se passait rien, et on ne
  //      pouvait pas deviner pourquoi.
  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarError('');
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('session expirée');

      const previous = avatarUrl;
      const url = await uploadProfileImage(file, user.id, AVATAR_BUCKET);
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      if (error) throw error;

      setAvatarUrl(url);
      await onProfileUpdate();
      if (previous) removeByPublicUrl(previous, AVATAR_BUCKET);
    } catch (err) {
      console.error('avatar', err);
      setAvatarError(tx(
        'The photo could not be saved. Try another one.',
        'La photo n’a pas pu être enregistrée. Essaie une autre photo.',
      ));
    }
    setUploading(false);
  }

  // La liste était chargée une seule fois : si on l'avait ouverte avant de
  // bloquer quelqu'un, elle restait vide pour toujours. On recharge à chaque
  // ouverture, et aussi dès qu'un blocage change ailleurs dans l'app.
  async function openBlocked() {
    setShowBlocked(true);
    if (profile?.user_id) setBlockedList(await loadMyBlocks(profile.user_id));
  }

  useEffect(() => onBlocksChanged(async () => {
    if (profile?.user_id) setBlockedList(await loadMyBlocks(profile.user_id));
  }), [profile?.user_id]);

  async function removeBlock(targetId) {
    try {
      await unblockUser(profile.user_id, targetId);
      setBlockedList(prev => (prev || []).filter(p => p.user_id !== targetId));
    } catch (e) {
      console.error('unblock', e);
    }
  }

  // La déconnexion ne doit JAMAIS rester bloquée. Si Supabase ne répond pas,
  // on n'attend pas indéfiniment : on efface la session gardée sur l'appareil
  // et on repart à l'écran de connexion. Rester coincé sur un bouton qui
  // tourne, en croyant être encore connecté, est le pire des deux mondes.
  async function signOutSafely(options) {
    try {
      await Promise.race([
        options ? supabase.auth.signOut(options) : supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 4000)),
      ]);
    } catch (e) {
      console.error('signOut', e);
    }
    try { localStorage.clear(); } catch { /* navigation privée */ }
    window.location.href = '/';
  }

  // Déconnecte toutes les sessions, sur tous les appareils. C'est le geste à
  // faire quand on pense que quelqu'un d'autre a eu accès à son compte.
  async function signOutEverywhere() {
    setSigningOutAll(true);
    await signOutSafely({ scope: 'global' });
  }

  async function handleLogout() {
    setLoggingOut(true);
    await signOutSafely();
  }

  if (editing) return (
    <EditProfileScreen
      key={profile?.user_id || 'edit'}
      profile={{ ...profile, avatar_url: avatarUrl }}
      onBack={() => setEditing(false)}
      onSave={() => { setEditing(false); onProfileUpdate(); }}
      onAvatarChange={(url) => { setAvatarUrl(url); onProfileUpdate(); }}
      theme={theme}
    />
  );

  if (showLegal) return <LegalScreen theme={theme} onBack={() => setShowLegal(false)} />;
  if (showAccount) return <AccountScreen theme={theme} onBack={() => setShowAccount(false)} />;

  // Enveloppé dans ErrorBoundary : l'aperçu est une nouveauté, et si jamais il
  // plante il doit planter SEUL. Le reste de l'app continue de tourner, avec un
  // message et un bouton pour recharger — pas une page blanche.
  if (previewing) return (
    <ErrorBoundary theme={theme}>
      <BuddyProfileScreen
        buddy={{ ...profile, avatar_url: avatarUrl }}
        preview
        theme={theme}
        onBack={() => setPreviewing(false)}
      />
    </ErrorBoundary>
  );
  if (sharingProfile) return (
    <ProfileShareCard
      profile={{ ...profile, avatar_url: avatarUrl }}
      onClose={() => setSharingProfile(false)}
    />
  );

  return (
    <div style={{ height: '100dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme.bg, color: theme.color }}>
      {/* La marge de l'encoche était absente ici (et en double plus bas) :
          le bouton de thème passait sous la barre d'état de l'iPhone. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top) + 16px) 16px 16px',
        borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        position: 'relative', flexShrink: 0,
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontFamily: 'var(--font-nunito)', fontSize: '22px', fontWeight: '900', color: theme.color }}>
          <img src="/logo.png" alt="" width={26} height={26} style={{ borderRadius: '7px', display: 'block', flexShrink: 0 }} />
          Snappin&apos;Buddy
        </span>
        <div onClick={() => setDarkMode(!darkMode)} style={{
          position: 'absolute', right: '16px', bottom: '16px',
          width: '52px', height: '28px', borderRadius: '14px',
          background: darkMode ? '#333' : '#DDD',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          padding: '3px', transition: 'background 0.3s', boxSizing: 'border-box',
        }}>
          <span style={{ position: 'absolute', left: darkMode ? '6px' : 'auto', right: darkMode ? 'auto' : '6px', fontSize: '11px', opacity: 0.6 }}>
            {darkMode ? '🌙' : '☀️'}
          </span>
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%', background: 'white',
            transform: darkMode ? 'translateX(0px)' : 'translateX(24px)',
            transition: 'transform 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', flexShrink: 0,
          }}/>
        </div>
      </div>

      <div style={{ padding: `24px 16px calc(110px + env(safe-area-inset-bottom))` }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div onClick={() => fileInputRef.current?.click()} style={{
            width: '88px', height: '88px', borderRadius: '50%',
            background: darkMode ? '#2C2C2C' : '#DDD',
            margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', border: `2px solid ${tagBorder}`,
            cursor: 'pointer', overflow: 'hidden', position: 'relative',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (uploading ? '⏳' : '◉')}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', padding: '4px 0', fontSize: '10px', color: 'white', fontWeight: '700' }}>
              {uploading ? '...' : '✏️'}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          {avatarError && (
            <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginBottom: '8px' }}>{avatarError}</p>
          )}

          <h2 style={{ fontSize: '20px', fontWeight: '800', color: theme.color }}>{profile?.username}</h2>
          {profile?.is_early_adopter && (
            <span style={{ display: 'inline-block', margin: '6px 0 4px', padding: '3px 10px', borderRadius: '12px', background: 'rgba(242,224,80,0.14)', border: '1px solid rgba(242,224,80,0.5)', color: '#F2E050', fontSize: '11px', fontWeight: '800', letterSpacing: '0.3px' }}>
              ✨ Early Adopter
            </span>
          )}
          <p style={{ color: subText, fontSize: '13px' }}>{withAt(profile?.handle)}</p>
          {roleLabel && <p style={{ color: subText, fontSize: '12px', marginTop: '4px' }}>{roleLabel}</p>}

          <button onClick={() => setPreviewing(true)} style={{
            marginTop: '10px', padding: '6px 14px', borderRadius: '20px',
            border: `1px solid ${tagBorder}`, background: 'transparent',
            color: theme.color, fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          }}>
            👁 {tx('See how others see me', 'Voir comme les autres')}
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
            {STATUTS.map(s => (
              <button key={s.id} onClick={() => updateStatus(s.id)} style={{
                padding: '5px 12px', borderRadius: '20px',
                border: `1.5px solid ${s.color}`,
                background: status === s.id ? s.color : 'transparent',
                color: status === s.id ? '#000' : s.color,
                fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projets validés. Affiché même à zéro, avec l'explication : c'est ce
            qui donne une raison de scanner le QR lors des rencontres. */}
        <div
          onClick={(profile?.validated_projects || 0) > 0 ? openValidated : undefined}
          style={{
            background: profile?.validated_projects > 0 ? 'rgba(46,204,113,0.08)' : card,
            border: `1px solid ${profile?.validated_projects > 0 ? 'rgba(46,204,113,0.25)' : tagBorder}`,
            borderRadius: '16px', padding: '14px 16px',
            marginBottom: showValidated ? '8px' : '16px',
            display: 'flex', alignItems: 'center', gap: '12px',
            cursor: (profile?.validated_projects || 0) > 0 ? 'pointer' : 'default',
          }}
        >
          <span style={{ fontSize: '22px' }}>🤝</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: profile?.validated_projects > 0 ? '#2ECC71' : theme.color, fontSize: '15px', fontWeight: '900' }}>
              {profile?.validated_projects || 0}{' '}
              {(profile?.validated_projects || 0) > 1
                ? tx('validated projects', 'projets validés')
                : tx('validated project', 'projet validé')}
            </p>
            <p style={{ color: subText, fontSize: '11px', lineHeight: 1.4 }}>
              {(profile?.validated_projects || 0) > 0
                ? tx('Visible on your profile · tap to see them', 'Visible sur ton profil · touche pour les voir')
                : tx('Scan your buddy’s QR when you meet to validate a project', 'Scanne le QR de ton buddy quand vous vous rencontrez pour valider un projet')}
            </p>
          </div>
          {(profile?.validated_projects || 0) > 0 && (
            <span style={{ fontSize: '12px', color: '#2ECC71', fontWeight: '700' }}>{showValidated ? '▴' : '→'}</span>
          )}
        </div>

        {showValidated && (
          <div style={{ background: card, border: `1px solid ${tagBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            {validatedList === null ? (
              <p style={{ color: subText, fontSize: '13px' }}>{tx('Loading…', 'Chargement…')}</p>
            ) : validatedList.length === 0 ? (
              <p style={{ color: subText, fontSize: '13px', lineHeight: 1.5 }}>
                {tx('No validated project yet.', 'Aucun projet validé pour le moment.')}
              </p>
            ) : (
              validatedList.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#CCC', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    {c.buddy?.avatar_url
                      ? <img src={c.buddy.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '◉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: theme.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {projectTitle(c.message)}
                    </p>
                    <p style={{ fontSize: '11px', color: subText }}>
                      {tx('with', 'avec')} {c.buddy?.username || tx('a creative', 'un créatif')}
                      {c.buddy?.handle ? ` ${withAt(c.buddy.handle)}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: '11px', color: subText, flexShrink: 0 }}>
                    {c.validated_at ? new Date(c.validated_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            )}
            <button onClick={() => setShowValidated(false)} style={{
              background: 'none', border: 'none', color: subText, fontSize: '12px',
              textDecoration: 'underline', cursor: 'pointer', marginTop: '4px',
            }}>
              {tx('Close', 'Fermer')}
            </button>
          </div>
        )}

        {/* Partager son profil : chaque inscrit devient une affiche pour l'app. */}
        <button onClick={() => setSharingProfile(true)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: card, border: `1px solid ${tagBorder}`, borderRadius: '16px',
          padding: '14px 16px', marginBottom: '16px', cursor: 'pointer', color: theme.color,
        }}>
          <span style={{ fontSize: '15px', fontWeight: '800' }}>📸 {tx('Share my profile', 'Partager mon profil')}</span>
          <span style={{ fontSize: '12px', color: subText, fontWeight: '600' }}>→</span>
        </button>

        {onOpenMyProjects && (
          <button onClick={onOpenMyProjects} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: card, border: `1px solid ${tagBorder}`, borderRadius: '16px',
            padding: '14px 16px', marginBottom: '16px', cursor: 'pointer', color: theme.color,
          }}>
            <span style={{ fontSize: '15px', fontWeight: '800' }}>⚡ {tx('My projects', 'Mes projets')}</span>
            <span style={{ fontSize: '12px', color: subText, fontWeight: '600' }}>
              {openProjects === null ? '' : `${openProjects} ${tx('active', 'en cours')}`} →
            </span>
          </button>
        )}

        {onOpenMyApplications && (
          <button onClick={onOpenMyApplications} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: card, border: `1px solid ${tagBorder}`, borderRadius: '16px',
            padding: '14px 16px', marginBottom: '16px', cursor: 'pointer', color: theme.color,
          }}>
            <span style={{ fontSize: '15px', fontWeight: '800' }}>🤝 {tx('My applications', 'Mes candidatures')}</span>
            <span style={{ fontSize: '12px', color: subText, fontWeight: '600' }}>
              {sentCount === null ? '' : `${sentCount} ${tx('sent', 'envoyées')}`} →
            </span>
          </button>
        )}

        <ProfileScore
          profile={{ ...profile, avatar_url: avatarUrl }}
          isEn={isEn}
          darkMode={darkMode}
          theme={theme}
          subText={subText}
          onEdit={() => setEditing(true)}
        />

        {profile?.bio && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '8px' }}>{t.currentProject}</p>
            <p style={{ fontSize: '14px', color: cardText }}>{profile.bio}</p>
          </div>
        )}

        {styles.length > 0 && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '12px' }}>{tx('UNIVERSE', 'UNIVERS')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {styles.map(s => (
                <span key={s} style={{ fontSize: '12px', color: tagColor, border: `1px solid ${tagBorder}`, borderRadius: '20px', padding: '4px 12px' }}>
                  {translateTag(s, isEn)}
                </span>
              ))}
            </div>
          </div>
        )}

        {zones.length > 0 && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '12px' }}>{t.shootZones}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {zones.map(z => (
                <span key={z} style={{ fontSize: '12px', color: tagColor, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: '20px', padding: '4px 12px' }}>{z}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: card, borderRadius: '14px', padding: '14px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: theme.color }}>
              ✓✓ {tx('Read receipts', 'Accusés de lecture')}
            </p>
            <p style={{ fontSize: '11px', color: subText, lineHeight: 1.4, marginTop: '2px' }}>
              {tx('Let others see when you read their messages.', 'Laisse les autres voir quand tu as lu leurs messages.')}
            </p>
          </div>
          <div
            onClick={toggleReceipts}
            style={{
              width: '46px', height: '26px', borderRadius: '20px', flexShrink: 0, cursor: 'pointer',
              background: receipts ? '#2ECC71' : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%', background: 'white',
              position: 'absolute', top: '3px', left: receipts ? '23px' : '3px', transition: 'left 0.2s',
            }} />
          </div>
        </div>

        <button onClick={() => setEditing(true)} style={{ width: '100%', background: theme.color, color: theme.bg, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
          {t.editProfile}
        </button>

        {/* Compte & sécurité : adresse email et mot de passe */}
        <button onClick={() => setShowAccount(true)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: card, border: `1px solid ${tagBorder}`, borderRadius: '16px',
          padding: '14px 16px', marginTop: '8px', marginBottom: '12px', cursor: 'pointer', color: theme.color,
        }}>
          <span style={{ fontSize: '14px', fontWeight: '700' }}>🔐 {tx('Account & security', 'Compte & sécurité')}</span>
          <span style={{ fontSize: '12px', color: subText, fontWeight: '600' }}>→</span>
        </button>

        <button onClick={() => setShowLegal(true)} style={{ width: '100%', background: 'transparent', color: subText, border: `1px solid ${tagBorder}`, borderRadius: '24px', padding: '14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>
          {t.legal}
        </button>

        {/* Comptes bloqués */}
        <button onClick={openBlocked} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: card, border: `1px solid ${tagBorder}`, borderRadius: '16px',
          padding: '14px 16px', marginBottom: '12px', cursor: 'pointer', color: theme.color,
        }}>
          <span style={{ fontSize: '14px', fontWeight: '700' }}>🚫 {tx('Blocked accounts', 'Comptes bloqués')}</span>
          <span style={{ fontSize: '12px', color: subText, fontWeight: '600' }}>→</span>
        </button>

        {showBlocked && (
          <div style={{ background: card, border: `1px solid ${tagBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
            {blockedList === null ? (
              <p style={{ color: subText, fontSize: '13px' }}>{tx('Loading…', 'Chargement…')}</p>
            ) : blockedList.length === 0 ? (
              <p style={{ color: subText, fontSize: '13px', lineHeight: 1.5 }}>
                {tx('You haven’t blocked anyone.', 'Tu n’as bloqué personne.')}
              </p>
            ) : (
              blockedList.map(p => (
                <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#CCC', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: theme.color }}>{p.username || tx('Creative', 'Créatif')}</p>
                    <p style={{ fontSize: '11px', color: subText }}>{withAt(p.handle)}</p>
                  </div>
                  <button onClick={() => removeBlock(p.user_id)} style={{
                    background: 'none', border: `1px solid ${tagBorder}`, borderRadius: '16px',
                    padding: '6px 12px', color: subText, fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  }}>
                    {tx('Unblock', 'Débloquer')}
                  </button>
                </div>
              ))
            )}
            <button onClick={() => setShowBlocked(false)} style={{
              background: 'none', border: 'none', color: subText, fontSize: '12px',
              textDecoration: 'underline', cursor: 'pointer', marginTop: '4px',
            }}>
              {tx('Close', 'Fermer')}
            </button>
          </div>
        )}

        {/* Déconnexion de toutes les sessions */}
        <button
          onClick={signOutEverywhere}
          disabled={signingOutAll}
          style={{
            width: '100%', background: 'transparent', color: subText,
            border: `1px solid ${tagBorder}`, borderRadius: '24px', padding: '13px',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginBottom: '8px',
          }}
        >
          {signingOutAll ? '…' : tx('Sign out on all devices', 'Se déconnecter partout')}
        </button>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{ width: '100%', background: 'transparent', color: '#FF4D4D', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px', opacity: loggingOut ? 0.6 : 1 }}
        >
          {loggingOut ? '...' : t.logout}
        </button>
      </div>
    </div>
  );
}