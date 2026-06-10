'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useT, useRoles } from '../i18n';
import { UNIVERS_FR, UNIVERS_EN } from '../constants';

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

export default function BuddyProfileScreen({ buddy, onBack, theme }) {
  const t = useT();
  const isEn = t.map === 'Map';
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

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [showInput, setShowInput] = useState(false);

  const styles = (buddy?.styles || '').split(',').map(s => s.trim()).filter(Boolean);
  const zones = (buddy?.zone || '').split(',').map(z => z.trim()).filter(Boolean);
  const portfolio = buddy?.portfolio_urls || [];
  const statusColor = buddy?.status === 'shoot' ? '#FFD700' : buddy?.status === 'indispo' ? '#FF4D4D' : '#2ECC71';
  const statusLabel = buddy?.status === 'shoot' ? (isEn ? 'On shoot' : 'En shoot') : buddy?.status === 'indispo' ? (isEn ? 'Unavailable' : 'Indisponible') : (isEn ? 'Available' : 'Disponible');
  const embedUrl = getVideoEmbed(buddy?.video_url);

  // Traduire le rôle
  const roleObj = ROLES.find(r => r.id === buddy?.role?.toLowerCase());
  const roleLabel = roleObj?.label || buddy?.role || '';

  async function sendCollab() {
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('collabs').insert({
        sender_id: user.id,
        receiver_id: buddy.user_id,
        message,
        status: 'pending',
      });
      setSent(true);
    }
    setSending(false);
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, background: bg, overflowY: 'auto' }}>
      <div style={{ padding: '24px 16px 100px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer', marginBottom: '24px' }}>←</button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: avatarBg, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: `2px solid ${avatarBorder}`, overflow: 'hidden' }}>
            {buddy?.avatar_url ? <img src={buddy.avatar_url} alt={buddy.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color }}>{buddy?.username}</h2>
          <p style={{ color: subText, fontSize: '13px' }}>{buddy?.handle}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor }}/>
            <span style={{ color: statusColor, fontSize: '12px' }}>{statusLabel}</span>
          </div>
        </div>

        {portfolio.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '10px', letterSpacing: '1px' }}>PORTFOLIO</p>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
              {portfolio.map((url, i) => (
                <img key={i} src={url} alt={`portfolio-${i}`} style={{ width: '120px', height: '120px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
              ))}
            </div>
          </div>
        )}

        {embedUrl && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '10px', letterSpacing: '1px' }}>🎬 {isEn ? 'VIDEO' : 'VIDÉO'}</p>
            {embedUrl.type === 'iframe' ? (
              <div style={{ borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9' }}>
                <iframe src={embedUrl.src} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
              </div>
            ) : (
              <a href={embedUrl.src} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '12px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)', color: 'white', fontWeight: '700', fontSize: '13px', textAlign: 'center', textDecoration: 'none' }}>
                📸 {isEn ? 'View on Instagram →' : 'Voir sur Instagram →'}
              </a>
            )}
          </div>
        )}

        {buddy?.bio && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '8px' }}>{isEn ? 'CURRENT PROJECT' : 'PROJET EN COURS'}</p>
            <p style={{ fontSize: '14px', color }}>{buddy.bio}</p>
          </div>
        )}

        {roleLabel && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '8px' }}>{isEn ? 'ROLE' : 'RÔLE'}</p>
            <p style={{ fontSize: '14px', color }}>{roleLabel}</p>
          </div>
        )}

        {styles.length > 0 && (
          <div style={{ background: card, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '12px' }}>{isEn ? 'UNIVERSE' : 'UNIVERS'}</p>
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
            <p style={{ color: subText, fontSize: '11px', marginBottom: '12px' }}>{isEn ? 'SHOOT ZONES' : 'ZONES DE SHOOT'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {zones.map(z => (
                <span key={z} style={{ fontSize: '12px', color: tagColor, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: '20px', padding: '4px 12px' }}>{z}</span>
              ))}
            </div>
          </div>
        )}

        {sent ? (
          <div style={{ width: '100%', padding: '14px', borderRadius: '24px', background: '#2ECC71', color: '#000', fontSize: '14px', fontWeight: '700', textAlign: 'center', marginTop: '8px' }}>
            {isEn ? '✓ Proposal sent!' : '✓ Proposition envoyée !'}
          </div>
        ) : showInput ? (
          <div style={{ marginTop: '8px' }}>
            <input value={message} onChange={e => setMessage(e.target.value)}
              placeholder={isEn ? 'Describe your project in a few words...' : 'Décris ton projet en quelques mots...'}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${tagBorder}`, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color, fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <button onClick={sendCollab} disabled={sending} style={{ width: '100%', background: color, color: bg, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {sending ? (isEn ? 'Sending...' : 'Envoi...') : (isEn ? '⚡ Send' : '⚡ Envoyer')}
            </button>
          </div>
        ) : (
          <button onClick={() => setShowInput(true)} style={{ width: '100%', background: color, color: bg, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
            {isEn ? '⚡ Propose a collab' : '⚡ Proposer une collab'}
          </button>
        )}
      </div>
    </div>
  );
}