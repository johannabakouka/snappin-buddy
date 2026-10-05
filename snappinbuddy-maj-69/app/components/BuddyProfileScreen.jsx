'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useT, useRoles } from '../i18n';
import MapPreviewCard from './MapPreviewCard';
import { tx, isNotFrench } from '../tx';
import { lookingChips } from '../looking-for';
import { UNIVERS_FR, UNIVERS_EN, roleLabels } from '../constants';
import ChatScreen from './ChatScreen';
import PhotoViewer from './PhotoViewer';
import ProfileShareCard from './ProfileShareCard';
import { blockUser, unblockUser } from '../blocks';
import { cleanUrl, prettyUrl } from '../links';
import { uploadProfileImage, AVATAR_BUCKET } from '../image-upload';
import { withAt } from '../handles';

function getVideoEmbed(url) {
  if (!url) return null;
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v');
    return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
  }
  if (url.includes('vimeo.com/')) {
    const id = url.split('vimeo.com/')[1]?.split('?')[0];
    return { type: 'iframe', src: `https://player.vimeo.com/video/${id}` };
  }
  if (url.includes('tiktok.com/')) {
    const id = url.split('/video/')[1]?.split('?')[0];
    return { type: 'iframe', src: `https://www.tiktok.com/embed/v2/${id}` };
  }
  if (url.includes('instagram.com/')) {
    return { type: 'link', src: url };
  }
  return null;
}

function translateTag(tag, isEn) {
  if (!isEn) return tag;
  const idx = UNIVERS_FR.indexOf(tag.toLowerCase());
  return idx >= 0 ? UNIVERS_EN[idx] : tag;
}

// preview : on affiche SON PROPRE profil, tel que les autres le voient.
// C'est volontairement le même composant, pas une copie : un aperçu recopié à
// la main divergerait du vrai écran au premier changement, et finirait par
// montrer un profil impeccable pendant que les autres en voient un cassé.
// Le mode aperçu masque seulement ce qui n'a aucun sens sur soi-même.
export default function BuddyProfileScreen({ buddy, onBack, theme, preview = false }) {
  const t = useT();
  const isEn = isNotFrench();
  const ROLES = useRoles();
  const darkMode = theme?.dark ?? true;
  const bg = theme?.bg ?? '#0A0A0A';
  const color = theme?.color ?? 'white';
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const subText = darkMode ? '#666' : '#888';
  const tagColor = darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)';
  const tagBorder = darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
  const avatarBg = darkMode ? '#2C2C2C' : '#CCC';
  const avatarBorder = darkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';

  // Photo de portfolio ouverte en plein écran : son rang, ou null
  const [viewerAt, setViewerAt] = useState(null);
  // Ma propre photo de profil : null tant qu'on ne sait pas, '' si je n'en ai pas.
  const [myAvatar, setMyAvatar] = useState(null);
  const [nudgeHidden, setNudgeHidden] = useState(false);
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [nudgeError, setNudgeError] = useState('');
  const [sendError, setSendError] = useState('');
  // Partage du profil de quelqu'un d'autre : « regarde ce photographe » est la
  // recommandation la plus naturelle, et le bouton n'existait que sur son
  // propre profil.
  const [sharing, setSharing] = useState(false);
  const [photoJustAdded, setPhotoJustAdded] = useState(false);
  const nudgeInputRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState('');
  const [blockError, setBlockError] = useState('');
  // Blocage : coupe le contact dans les deux sens.
  const [blocked, setBlocked] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);
  // Lien déjà existant avec ce créatif : 'loading' | 'none' | 'pending' | 'incoming' | 'buddies' | 'self'
  const [relation, setRelation] = useState('loading');
  const [chatOpen, setChatOpen] = useState(false);
  const [me, setMe] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!alive) return;
      setMe(user || null);
      if (!user || !buddy?.user_id) { setRelation('none'); return; }
      if (user.id === buddy.user_id) { setRelation('self'); return; }

      // Cette personne est-elle déjà bloquée par moi ?
      const { data: blockRows } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', buddy.user_id)
        .limit(1);
      if (alive && blockRows?.length) setBlocked(true);
      const { data } = await supabase.from('collabs')
        .select('sender_id, status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${buddy.user_id}),and(sender_id.eq.${buddy.user_id},receiver_id.eq.${user.id})`);
      if (!alive) return;
      if (data?.some(c => c.status === 'accepted')) setRelation('buddies');
      else if (data?.some(c => c.status === 'pending' && c.sender_id === user.id)) setRelation('pending');
      else if (data?.some(c => c.status === 'pending')) setRelation('incoming');
      else setRelation('none');
    });
    return () => { alive = false; };
  }, [buddy?.user_id]);

  const styles = (buddy?.styles || '').split(',').map(s => s.trim()).filter(Boolean);
  const lookingFor = lookingChips(buddy?.looking_for);
  const zones = (buddy?.zone || '').split(',').map(z => z.trim()).filter(Boolean);
  const portfolio = buddy?.portfolio_urls || [];
  const statusColor = buddy?.status === 'shoot' ? '#FFD700' : buddy?.status === 'indispo' ? '#FF4D4D' : '#2ECC71';
  const statusLabel = buddy?.status === 'shoot'
    ? (tx('On shoot', 'En shoot'))
    : buddy?.status === 'indispo'
    ? (tx('Unavailable', 'Indisponible'))
    : (tx('Available', 'Disponible'));
  const embedUrl = getVideoEmbed(buddy?.video_url);
  // On revalide à l'affichage, pas seulement à la saisie : une adresse
  // enregistrée avant cette validation, ou écrite directement dans la base,
  // ne doit pas se retrouver cliquable telle quelle.
  const buddyLink = cleanUrl(buddy?.portfolio_url) || '';

  const roleLabel = roleLabels(buddy?.role, ROLES, buddy?.role_other);
  // Troisième visage du profil : la page publique, lue par des gens qui n'ont
  // pas l'app. Elle n'affiche pas la même chose que cet écran, donc l'aperçu y
  // renvoie plutôt que de laisser croire qu'il n'y en a qu'un.
  const publicSlug = String(buddy?.handle || '').replace(/^@+/, '').trim();
  const publicLink = preview && publicSlug
    ? `https://snappinbuddy.com/u/${encodeURIComponent(publicSlug)}`
    : '';

  // On a besoin de savoir si J'AI une photo de profil, pour le rappel affiché
  // au moment d'envoyer une proposition.
  useEffect(() => {
    if (preview) return;   // en aperçu, aucune requête : l'écran est en lecture seule
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const { data } = await supabase.from('profiles').select('avatar_url').eq('user_id', user.id).maybeSingle();
      if (alive) setMyAvatar(data?.avatar_url || '');
    })();
    return () => { alive = false; };
  }, [preview]);

  // Ajouter sa photo sans quitter l'envoi de la proposition : le rappel porte
  // sa propre solution, sinon il ne sert qu'à culpabiliser les gens.
  async function addMyPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNudgeError('');
    setNudgeBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('session expirée');
      const url = await uploadProfileImage(file, user.id, AVATAR_BUCKET);
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      if (error) throw error;
      setMyAvatar(url);
      setPhotoJustAdded(true);
    } catch (err) {
      console.error('avatar', err);
      setNudgeError(tx(
        'The photo could not be saved. Try another one.',
        'La photo n’a pas pu être enregistrée. Essaie une autre photo.',
      ));
    }
    setNudgeBusy(false);
  }

  async function sendCollab() {
    setSending(true);
    setSendError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSendError(tx('Your session expired. Sign in again.', 'Ta session a expiré. Reconnecte-toi.'));
      setSending(false);
      return;
    }
    {
      const { data: collab, error } = await supabase.from('collabs').insert({
        sender_id: user.id,
        receiver_id: buddy.user_id,
        message,
        status: 'pending',
      }).select('id').single();

      // L'erreur n'était pas lue : l'écran annonçait « proposition envoyée »
      // alors que rien n'était enregistré. Une fausse confirmation est pire
      // qu'un silence — la personne attend une réponse qui ne viendra jamais.
      if (error) {
        console.error('sendCollab', error);
        setSendError(tx("Couldn't send the proposal. Try again.", "Envoi de la proposition impossible. Réessaie."));
        setSending(false);
        return;
      }

      setSent(true);
      setRelation('pending');
      // Prévient la personne par email (le serveur retrouve son adresse)
      if (collab?.id) {
        const { data: { session } } = await supabase.auth.getSession();
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({ type: 'new_proposal', collabId: collab.id }),
        }).catch(e => console.error('Email error:', e));
      }
    }
    setSending(false);
  }

  async function toggleBlock() {
    if (!me?.id || !buddy?.user_id) return;
    setBlocking(true);
    setBlockError('');
    try {
      if (blocked) {
        await unblockUser(me.id, buddy.user_id);
        setBlocked(false);
      } else {
        await blockUser(me.id, buddy.user_id);
        setBlocked(true);
        setConfirmBlock(false);
      }
    } catch (e) {
      // Bloquer est un geste de sécurité : si ça rate, il faut le dire, sinon
      // la personne croit s'être protégée.
      console.error('block', e);
      setBlockError(blocked
        ? tx("Couldn't unblock. Try again.", 'Le déblocage a échoué. Réessaie.')
        : tx("Couldn't block. Try again.", 'Le blocage a échoué. Réessaie.'));
    }
    setBlocking(false);
  }

  async function sendReport() {
    if (!reportReason.trim()) return;
    setReportError('');
    try {
      // Le serveur envoie le signalement à l'adresse admin ; l'app ne choisit plus le destinataire
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          type: 'report',
          reportedUserId: buddy?.user_id,
          reason: reportReason,
        }),
      });
      if (!res.ok) throw new Error('report failed');
      setReportSent(true);
    } catch (e) {
      // Un signalement d'abus qui échoue en silence est le pire silence de
      // l'app : la personne croit avoir alerté la modération, et personne n'a
      // rien reçu. On le dit, et on donne l'adresse de secours.
      console.error('sendReport', e);
      setReportError(tx(
        "Couldn't send the report. Write to contact@snappinbuddy.com and it will be handled.",
        "L’envoi du signalement a échoué. Écris à contact@snappinbuddy.com, il sera traité.",
      ));
    }
  }

  if (sharing) return (
    <ProfileShareCard profile={buddy} mine={false} onClose={() => setSharing(false)} />
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, background: bg, overflowY: 'auto' }}>
      <div style={{ padding: `calc(env(safe-area-inset-top) + 24px) 16px calc(110px + env(safe-area-inset-bottom))` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: preview ? '14px' : '24px' }}>
          <button onClick={onBack} aria-label={tx('Back', 'Retour')} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
          <button
            onClick={() => setSharing(true)}
            aria-label={tx('Share this profile', 'Partager ce profil')}
            title={tx('Share this profile', 'Partager ce profil')}
            style={{
              background: 'none', border: `1px solid ${tagBorder}`, borderRadius: '20px',
              padding: '6px 14px', color, fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            }}
          >
            ↗ {tx('Share', 'Partager')}
          </button>
        </div>

        {preview && (
          <div style={{
            background: darkMode ? 'rgba(242,224,80,0.08)' : 'rgba(242,224,80,0.18)',
            border: `1px solid ${darkMode ? 'rgba(242,224,80,0.3)' : 'rgba(180,150,0,0.3)'}`,
            borderRadius: '14px', padding: '12px 14px', marginBottom: '20px',
          }}>
            <p style={{ fontSize: '13px', fontWeight: '800', color, marginBottom: '4px' }}>
              👁 {tx('This is how others see you', 'Voici comment les autres te voient')}
            </p>
            <p style={{ fontSize: '11px', color: subText, lineHeight: 1.5 }}>
              {tx('Your card on the map, then the screen that opens when someone taps it.',
                  'Ta carte sur la carte du monde, puis l’écran qui s’ouvre quand on appuie dessus.')}
            </p>
            {publicLink && (
              <a
                href={publicLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block', marginTop: '10px', fontSize: '12px', fontWeight: '700',
                  color, textDecoration: 'underline',
                }}
              >
                {tx('See my public page', 'Voir ma page publique')} ↗
              </a>
            )}
          </div>
        )}

        {/* La petite carte est le vrai premier contact : sur la carte du monde,
            c'est tout ce qu'on voit avant de décider d'ouvrir un profil. */}
        {preview && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: subText, letterSpacing: '0.08em', marginBottom: '8px' }}>
              {tx('ON THE MAP', 'SUR LA CARTE')}
            </p>
            <MapPreviewCard buddy={buddy} darkMode={darkMode} floating={false} />
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: avatarBg, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: `2px solid ${avatarBorder}`, overflow: 'hidden' }}>
            {buddy?.avatar_url ? <img src={buddy.avatar_url} alt={buddy.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>{buddy?.username}</h2>
          {buddy?.is_early_adopter && (
            <span style={{ display: 'inline-block', margin: '6px 0 4px', padding: '3px 10px', borderRadius: '12px', background: 'rgba(242,224,80,0.14)', border: '1px solid rgba(242,224,80,0.5)', color: '#F2E050', fontSize: '11px', fontWeight: '800', letterSpacing: '0.3px' }}>
              ✨ Early Adopter
            </span>
          )}
          <p style={{ color: subText, fontSize: '13px' }}>{withAt(buddy?.handle)}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor }}/>
            <span style={{ color: statusColor, fontSize: '12px' }}>{statusLabel}</span>
          </div>
        </div>

        {portfolio.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '10px', letterSpacing: '1px' }}>
              PORTFOLIO <span style={{ letterSpacing: 0, textTransform: 'none' }}>· {tx('tap to enlarge', 'appuie pour agrandir')}</span>
            </p>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
              {portfolio.map((url, i) => (
                <img
                  key={i} src={url} alt={`portfolio-${i}`}
                  onClick={() => setViewerAt(i)}
                  style={{ width: '120px', height: '120px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Lien portfolio. rel="noopener noreferrer" : le lien est écrit par
            quelqu'un d'autre, le site ouvert ne doit pas pouvoir reprendre la
            main sur l'onglet de l'app. */}
        {buddyLink && (
          <a
            href={buddyLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              marginBottom: '16px', padding: '13px 16px', borderRadius: '14px',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
              color, textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🔗 {prettyUrl(buddyLink)}
            </span>
            <span style={{ fontSize: '12px', color: subText, fontWeight: '700', flexShrink: 0 }}>↗</span>
          </a>
        )}

        {embedUrl && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '10px', letterSpacing: '1px' }}>🎬 {tx('VIDEO', 'VIDÉO')}</p>
            {embedUrl.type === 'iframe' ? (
              <div style={{ borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9' }}>
                <iframe src={embedUrl.src} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
              </div>
            ) : (
              <a href={embedUrl.src} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '12px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)', color: 'white', fontWeight: '700', fontSize: '13px', textAlign: 'center', textDecoration: 'none' }}>
                📸 {tx('View on Instagram →', 'Voir sur Instagram →')}
              </a>
            )}
          </div>
        )}

        {/* Projets validés : le seul signal de confiance de l'app qui ne dépende
            pas du nombre d'abonnés. Il ne monte qu'après une vraie rencontre
            confirmée par un scan de QR, donc il ne se triche pas. */}
        {buddy?.validated_projects > 0 && (
          <div style={{
            background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.25)',
            borderRadius: '14px', padding: '14px 16px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '22px' }}>🤝</span>
            <div>
              <p style={{ color: '#2ECC71', fontSize: '15px', fontWeight: '900' }}>
                {buddy.validated_projects} {buddy.validated_projects > 1
                  ? tx('validated projects', 'projets validés')
                  : tx('validated project', 'projet validé')}
              </p>
              <p style={{ color: subText, fontSize: '11px' }}>
                {tx('Real meetings, confirmed on the spot', 'Rencontres réelles, confirmées sur place')}
              </p>
            </div>
          </div>
        )}

        {buddy?.bio && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '8px' }}>{tx('CURRENT PROJECT', 'PROJET EN COURS')}</p>
            <p style={{ fontSize: '14px', color }}>{buddy.bio}</p>
          </div>
        )}

        {roleLabel && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '8px' }}>{tx('ROLE', 'RÔLE')}</p>
            <p style={{ fontSize: '14px', color }}>{roleLabel}</p>
          </div>
        )}

        {lookingFor.length > 0 && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '12px' }}>
              {tx('LOOKING FOR', 'CHERCHE')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {lookingFor.map(item => (
                <span key={item.id} style={{ fontSize: '12px', color: tagColor, border: `1px solid ${tagBorder}`, borderRadius: '20px', padding: '4px 12px' }}>
                  {item.icon} {item.label}
                </span>
              ))}
            </div>
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
            <p style={{ color: subText, fontSize: '11px', marginBottom: '12px' }}>{tx('AREAS', 'ZONES')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {zones.map(z => (
                <span key={z} style={{ fontSize: '12px', color: tagColor, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: '20px', padding: '4px 12px' }}>{z}</span>
              ))}
            </div>
          </div>
        )}

        {relation === 'self' || relation === 'loading' ? null : sent ? (
          <div style={{ width: '100%', padding: '14px', borderRadius: '24px', background: '#2ECC71', color: '#000', fontSize: '14px', fontWeight: '700', textAlign: 'center', marginTop: '8px' }}>
            {tx("✓ Proposal sent! Let's create something beautiful 🎨", '✓ Proposition envoyée ! Créez quelque chose de beau 🎨')}
            <div style={{ fontSize: '12px', fontWeight: '600', marginTop: '4px', opacity: 0.75 }}>
              {tx('They will get an email. Once accepted, you can chat.', 'Elle ou il reçoit un email. Une fois acceptée, vous pourrez discuter.')}
            </div>
          </div>
        ) : relation === 'buddies' ? (
          <button onClick={() => setChatOpen(true)} style={{ width: '100%', background: color, color: bg, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
            💬 {tx('Message', 'Écrire')} {buddy?.username}
          </button>
        ) : relation === 'pending' ? (
          <div style={{ width: '100%', padding: '14px', borderRadius: '24px', border: `1px solid ${tagBorder}`, color: subText, fontSize: '13px', fontWeight: '700', textAlign: 'center', marginTop: '8px' }}>
            ⏳ {tx('Proposal sent · waiting for a reply', 'Proposition envoyée · en attente de réponse')}
          </div>
        ) : relation === 'incoming' ? (
          <div style={{ width: '100%', padding: '14px', borderRadius: '24px', border: '1px solid rgba(242,224,80,0.5)', color: '#F2E050', fontSize: '13px', fontWeight: '700', textAlign: 'center', marginTop: '8px' }}>
            🤝 {tx('They already sent you a proposal: reply in Match → 🤝', 'Cette personne t’a déjà fait une proposition : réponds-lui dans Match → 🤝')}
          </div>
        ) : showInput ? (
          <div style={{ marginTop: '8px' }}>
            {/* Rappel photo, au seul moment où la personne a une raison
                égoïste de s'en occuper : juste avant d'envoyer. Il ne bloque
                rien — le bouton d'envoi reste utilisable juste en dessous. */}
            {myAvatar === '' && !nudgeHidden && (
              <div style={{
                border: `1px solid ${darkMode ? 'rgba(242,224,80,0.35)' : 'rgba(180,150,0,0.35)'}`,
                background: darkMode ? 'rgba(242,224,80,0.07)' : 'rgba(242,224,80,0.14)',
                borderRadius: '14px', padding: '14px', marginBottom: '10px', position: 'relative',
              }}>
                <button
                  onClick={() => setNudgeHidden(true)}
                  aria-label={tx('Close', 'Fermer')}
                  style={{ position: 'absolute', top: '6px', right: '8px', background: 'none', border: 'none', color: subText, fontSize: '14px', cursor: 'pointer' }}
                >
                  ✕
                </button>
                <p style={{ fontSize: '13px', fontWeight: '800', color, marginBottom: '6px' }}>
                  📷 {tx('Your profile has no photo', 'Ton profil n’a pas de photo')}
                </p>
                <p style={{ fontSize: '12px', color: subText, lineHeight: 1.5, marginBottom: '10px' }}>
                  {tx(
                    'Add one so people know who they’re talking to — a profile without a photo often looks like a fake account.',
                    'Ajoute-en une pour qu’on sache à qui on parle : un profil sans photo passe souvent pour un faux compte.',
                  )}
                </p>
                {nudgeError && <p style={{ color: '#FF4D4D', fontSize: '12px', marginBottom: '8px' }}>{nudgeError}</p>}
                <button
                  onClick={() => nudgeInputRef.current?.click()}
                  disabled={nudgeBusy}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '20px',
                    border: `1px solid ${tagBorder}`, background: 'transparent',
                    color, fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  }}
                >
                  {nudgeBusy ? tx('Saving...', 'Sauvegarde...') : tx('Add my photo', 'Ajouter ma photo')}
                </button>
                <input ref={nudgeInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addMyPhoto} />
              </div>
            )}
            {photoJustAdded && (
              <p style={{ color: '#2ECC71', fontSize: '12px', fontWeight: '700', marginBottom: '10px' }}>
                ✓ {tx('Photo added', 'Photo ajoutée')}
              </p>
            )}
            <input value={message} onChange={e => setMessage(e.target.value)}
              placeholder={tx('Tell them about your project...', 'Parle-lui de ton projet...')}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${tagBorder}`, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color, fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' }} />
            {sendError && (
              <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginBottom: '10px' }}>{sendError}</p>
            )}
            <button onClick={sendCollab} disabled={sending} style={{ width: '100%', background: color, color: bg, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {sending ? (tx('Sending...', 'Envoi...')) : (tx('⚡ Send proposal', '⚡ Envoyer ma proposition'))}
            </button>
          </div>
        ) : (
          <button onClick={() => setShowInput(true)} style={{ width: '100%', background: color, color: bg, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
            {tx('⚡ Propose a collab', '⚡ Proposer une création ensemble')}
          </button>
        )}

        {/* Blocage. Séparé du signalement : signaler s'adresse à la modération,
            bloquer agit tout de suite et sans attendre personne.
            Masqué en aperçu : on ne se bloque pas, on ne se signale pas. */}
        <div style={{ marginTop: '24px', borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, paddingTop: '16px', display: preview ? 'none' : 'block' }}>
          {blocked ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: subText, fontSize: '12px', marginBottom: '8px', lineHeight: 1.5 }}>
                {tx('You blocked this person. They can no longer contact you or see your profile.',
                    'Tu as bloqué cette personne. Elle ne peut plus te contacter ni voir ton profil.')}
              </p>
              <button onClick={toggleBlock} disabled={blocking} style={{
                background: 'none', border: 'none', color: subText, fontSize: '12px',
                textDecoration: 'underline', cursor: 'pointer',
              }}>
                {tx('Unblock', 'Débloquer')}
              </button>
              {blockError && (
                <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginTop: '8px' }}>{blockError}</p>
              )}
            </div>
          ) : !confirmBlock ? (
            <button onClick={() => setConfirmBlock(true)} style={{
              background: 'none', border: 'none', color: subText, fontSize: '12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto',
            }}>
              🚫 {tx('Block this person', 'Bloquer cette personne')}
            </button>
          ) : (
            <div>
              <p style={{ color: subText, fontSize: '12px', marginBottom: '10px', textAlign: 'center', lineHeight: 1.5 }}>
                {tx('They won’t be able to message you, propose a collab, or see you on the map. You can undo this at any time.',
                    'Elle ne pourra plus t’écrire, te proposer de collab, ni te voir sur la carte. Tu peux annuler à tout moment.')}
              </p>
              {blockError && (
                <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginBottom: '10px', textAlign: 'center' }}>{blockError}</p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setConfirmBlock(false)} style={{
                  flex: 1, padding: '11px', borderRadius: '20px',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
                  background: 'transparent', color: subText, fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                }}>
                  {tx('Cancel', 'Annuler')}
                </button>
                <button onClick={toggleBlock} disabled={blocking} style={{
                  flex: 1, padding: '11px', borderRadius: '20px', border: 'none',
                  background: '#FF4D4D', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                }}>
                  {blocking ? '…' : tx('Block', 'Bloquer')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Signalement */}
        <div style={{ marginTop: '16px', borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, paddingTop: '16px' }}>
          {!showReport ? (
            <button onClick={() => setShowReport(true)} style={{ background: 'none', border: 'none', color: subText, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}>
              🚩 {tx('Report this user', 'Signaler cet utilisateur')}
            </button>
          ) : reportSent ? (
            <p style={{ color: '#2ECC71', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>
              ✓ {tx('Report sent, thank you.', 'Signalement envoyé, merci.')}
            </p>
          ) : (
            <div>
              <p style={{ color: subText, fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>
                {tx('Why are you reporting this user?', 'Pourquoi tu signales cet utilisateur ?')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                {[
                  tx('Inappropriate behavior', 'Comportement inapproprié'),
                  tx('Fake profile', 'Faux profil'),
                  tx('Spam', 'Spam'),
                  tx('Harassment', 'Harcèlement'),
                  tx('Other', 'Autre'),
                ].map(reason => (
                  <button key={reason} onClick={() => setReportReason(reason)} style={{
                    padding: '10px 14px', borderRadius: '12px', textAlign: 'left',
                    border: `1px solid ${reportReason === reason ? '#FF4D4D' : (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`,
                    background: reportReason === reason ? 'rgba(255,77,77,0.1)' : 'transparent',
                    color: reportReason === reason ? '#FF4D4D' : subText,
                    fontSize: '13px', cursor: 'pointer', fontWeight: reportReason === reason ? '700' : '400',
                  }}>
                    {reason}
                  </button>
                ))}
              </div>
              {reportError && (
                <p style={{ color: '#FF4D4D', fontSize: '12px', lineHeight: 1.5, marginBottom: '10px' }}>{reportError}</p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setShowReport(false); setReportReason(''); setReportError(''); }} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: 'transparent', color: subText, fontSize: '13px', cursor: 'pointer' }}>
                  {tx('Cancel', 'Annuler')}
                </button>
                <button onClick={sendReport} disabled={!reportReason} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: reportReason ? '#FF4D4D' : 'rgba(255,77,77,0.3)', color: 'white', fontSize: '13px', fontWeight: '700', cursor: reportReason ? 'pointer' : 'default' }}>
                  {tx('Send report', 'Envoyer')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {chatOpen && (
        <div style={{ position: 'fixed', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '390px', zIndex: 2600, background: bg }}>
          <ChatScreen buddy={buddy} onBack={() => setChatOpen(false)} theme={theme} />
        </div>
      )}
      {viewerAt !== null && (
        <PhotoViewer photos={portfolio} startIndex={viewerAt} onClose={() => setViewerAt(null)} />
      )}
    </div>
  );
}