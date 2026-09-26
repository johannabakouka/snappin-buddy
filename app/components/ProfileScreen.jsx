'use client';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import EditProfileScreen from './EditProfileScreen';
import LegalScreen from './LegalScreen';
import ProfileShareCard from './ProfileShareCard';
import { useT, useRoles } from '../i18n';
import { tx, isNotFrench } from '../tx';
import { UNIVERS_FR, UNIVERS_EN, roleLabels } from '../constants';

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

export default function ProfileScreen({ profile, onProfileUpdate, theme, darkMode, setDarkMode, onOpenMyProjects }) {
  const t = useT();
  const ROLES = useRoles();
  const [editing, setEditing] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [sharingProfile, setSharingProfile] = useState(false);
  const [status, setStatus] = useState(profile?.status || 'dispo');
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [loggingOut, setLoggingOut] = useState(false);
  const fileInputRef = useRef(null);
  const [openProjects, setOpenProjects] = useState(null);

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

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl + '?t=' + Date.now();
      await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      setAvatarUrl(url);
      await onProfileUpdate();
    }
    setUploading(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.clear();
      window.location.href = '/';
    }
  }

  if (editing) return (
    <EditProfileScreen
      profile={{ ...profile, avatar_url: avatarUrl }}
      onBack={() => setEditing(false)}
      onSave={() => { setEditing(false); onProfileUpdate(); }}
      theme={theme}
    />
  );

  if (showLegal) return <LegalScreen theme={theme} onBack={() => setShowLegal(false)} />;
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
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: '22px', fontWeight: '900', color: theme.color }}>
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

          <h2 style={{ fontSize: '20px', fontWeight: '800', color: theme.color }}>{profile?.username}</h2>
          {profile?.is_early_adopter && (
            <span style={{ display: 'inline-block', margin: '6px 0 4px', padding: '3px 10px', borderRadius: '12px', background: 'rgba(242,224,80,0.14)', border: '1px solid rgba(242,224,80,0.5)', color: '#F2E050', fontSize: '11px', fontWeight: '800', letterSpacing: '0.3px' }}>
              ✨ Early Adopter
            </span>
          )}
          <p style={{ color: subText, fontSize: '13px' }}>{profile?.handle}</p>
          {roleLabel && <p style={{ color: subText, fontSize: '12px', marginTop: '4px' }}>{roleLabel}</p>}

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

        <button onClick={() => setShowLegal(true)} style={{ width: '100%', background: 'transparent', color: subText, border: `1px solid ${tagBorder}`, borderRadius: '24px', padding: '14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
          {t.legal}
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