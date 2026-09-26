'use client';
import { useState } from 'react';
import { useRoles } from '../i18n';
import { tx } from '../tx';
import { UNIVERS_FR, UNIVERS_EN, splitRoles } from '../constants';
import { isNotFrench } from '../tx';

// Carte de partage d'un profil, au format story 1080x1920.
// Jumelle de ShareCard.jsx, qui fait la même chose pour un projet :
// même fond, même halo, même pied de carte. Si tu changes la charte
// graphique de l'une, pense à l'autre.

export default function ProfileShareCard({ profile, onClose }) {
  const ROLES = useRoles();
  const isEn = isNotFrench();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardImage, setCardImage] = useState(null);

  const roles = splitRoles(profile?.role);
  const univers = (profile?.styles || '').split(',').map(s => s.trim()).filter(Boolean);

  // Le pseudo est unique : il fait un lien propre et lisible.
  const handleSlug = String(profile?.handle || '').replace(/^@/, '');
  const link = handleSlug
    ? `https://snappinbuddy.com/?buddy=${encodeURIComponent(handleSlug)}`
    : 'https://snappinbuddy.com';

  function universLabel(u) {
    if (!isEn) return u;
    const i = UNIVERS_FR.indexOf(u);
    return i >= 0 ? UNIVERS_EN[i] : u;
  }

  async function buildImage() {
    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const probe = document.createElement('span');
    probe.style.fontFamily = 'var(--font-nunito)';
    document.body.appendChild(probe);
    const FONT = getComputedStyle(probe).fontFamily || 'Arial';
    probe.remove();
    try { await document.fonts.ready; } catch { /* police par défaut */ }
    const font = (weight, size) => `${weight} ${size}px ${FONT}`;

    const round = (x, y, w, h, r) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }
    };

    // Fond
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0A0A0D');
    bg.addColorStop(1, '#121216');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Trame de carte, en écho au logo
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 2;
    for (let i = -200; i < W + 400; i += 120) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - 260, H); ctx.stroke();
    }
    for (let j = 0; j < H; j += 150) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j + 40); ctx.stroke();
    }

    // Halo jaune
    const glow = ctx.createRadialGradient(540, 760, 0, 540, 760, 620);
    glow.addColorStop(0, 'rgba(242,224,80,0.10)');
    glow.addColorStop(1, 'rgba(242,224,80,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 140, W, 1240);

    // Logo
    const logo = await new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/logo.png';
    });
    ctx.textAlign = 'center';
    if (logo) {
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(logo, 415, 120, 250, 250);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = '#F2E050';
    ctx.font = font(800, 22);
    ctx.letterSpacing = '6px';
    ctx.fillText('MATCH AND CREATE', 540, 400);
    ctx.letterSpacing = '0px';

    // La photo de profil, si elle est chargeable. Sans elle, la carte
    // reste correcte : on passe simplement à la suite.
    const avatar = profile?.avatar_url
      ? await new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = profile.avatar_url;
        })
      : null;

    const CX = 80, CY = 470, CW = W - 160;
    const PAD = 56;
    let paint = false;
    let y = CY + 92;

    const ft = (text, x, py) => { if (paint) ctx.fillText(text, x, py); };
    const fillShape = () => { if (paint) ctx.fill(); };
    const strokeShape = () => { if (paint) ctx.stroke(); };

    const drawContent = () => {
      y = CY + 92;
      ctx.textAlign = 'left';

      // Photo ronde, à gauche du nom
      const AV = 132;
      const hasAvatar = Boolean(avatar);
      if (hasAvatar && paint) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(CX + PAD + AV / 2, y + AV / 2 - 44, AV / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, CX + PAD, y - 44, AV, AV);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(CX + PAD + AV / 2, y + AV / 2 - 44, AV / 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      const textX = hasAvatar ? CX + PAD + AV + 32 : CX + PAD;

      // Nom
      ctx.fillStyle = '#FFFFFF';
      ctx.font = font(900, 52);
      ft(String(profile?.username || '').slice(0, 18), textX, y + 6);

      // Pseudo
      ctx.fillStyle = '#F2E050';
      ctx.font = font(700, 30);
      ft(profile?.handle || '', textX, y + 56);

      y += hasAvatar ? 150 : 110;

      // Bio
      const wrap = (text, maxWidth, lineHeight, maxLines) => {
        const words = String(text || '').split(/\s+/).filter(Boolean);
        let line = '', lines = 0;
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxWidth && line) {
            ft(line, CX + PAD, y);
            y += lineHeight; lines += 1; line = word;
            if (lines >= maxLines) { line = ''; break; }
          } else line = test;
        }
        if (line) { ft(line, CX + PAD, y); y += lineHeight; }
      };

      if (profile?.bio) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = font(400, 30);
        wrap(profile.bio, CW - PAD * 2, 42, 3);
        y += 20;
      }

      // Rôles
      if (roles.length) {
        y += 24;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = font(800, 21);
        ctx.letterSpacing = '3px';
        ft(tx('ROLES', 'RÔLES'), CX + PAD, y);
        ctx.letterSpacing = '0px';
        y += 50;

        let x = CX + PAD;
        ctx.font = font(800, 28);
        for (const r of roles) {
          const label = ROLES.find(o => o.id === r)?.label || r;
          const w = ctx.measureText(label).width + 48;
          if (x + w > CX + CW - PAD) { x = CX + PAD; y += 66; }
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          round(x, y - 34, w, 54, 27); fillShape();
          ctx.fillStyle = '#FFFFFF';
          ft(label, x + 24, y);
          x += w + 12;
        }
        y += 76;
      }

      // Univers
      if (univers.length) {
        let x = CX + PAD;
        ctx.font = font(600, 24);
        for (const u of univers.slice(0, 5)) {
          const label = universLabel(u);
          const w = ctx.measureText(label).width + 40;
          if (x + w > CX + CW - PAD) break;
          ctx.strokeStyle = 'rgba(255,255,255,0.18)';
          ctx.lineWidth = 1.5;
          round(x, y - 30, w, 46, 23); strokeShape();
          ctx.fillStyle = 'rgba(255,255,255,0.65)';
          ft(label, x + 20, y);
          x += w + 10;
        }
        y += 64;
      }

      // Zone
      if (profile?.zone) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = font(600, 27);
        ft(`📍 ${profile.zone}`, CX + PAD, y);
        y += 20;
      }

      return y;
    };

    // passe 1 : mesure
    const contentBottom = drawContent();
    const CH = Math.min(1180, Math.max(620, contentBottom - CY + 190));
    const dy = Math.max(0, (1150 - CH) / 2);
    ctx.save();
    ctx.translate(0, dy);

    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    round(CX, CY, CW, CH, 46); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    round(CX, CY, CW, CH, 46); ctx.stroke();

    // passe 2 : contenu
    paint = true;
    drawContent();

    // Pied de carte
    const footY = CY + CH - 86;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX + PAD, footY - 58);
    ctx.lineTo(CX + CW - PAD, footY - 58);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = font(600, 24);
    ctx.fillText(tx('Tap the link', 'Clique sur le lien'), CX + PAD, footY - 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(800, 28);
    ctx.fillText('snappinbuddy.com', CX + PAD, footY + 36);

    const cta = tx('Create with me ⚡', 'Créons ensemble ⚡');
    ctx.font = font(900, 28);
    const ctaW = ctx.measureText(cta).width + 84;
    const ctaX = CX + CW - PAD - ctaW;
    ctx.fillStyle = '#F2E050';
    round(ctaX, footY - 24, ctaW, 66, 33); ctx.fill();
    ctx.fillStyle = '#0A0A0D';
    ctx.textAlign = 'center';
    ctx.fillText(cta, ctaX + ctaW / 2, footY + 18);
    ctx.textAlign = 'left';

    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.font = font(600, 26);
    ctx.fillText('@snappinbuddy', 540, 1700);

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  async function saveImage() {
    setSaving(true);
    try {
      const blob = await buildImage();
      if (!blob) return;
      const name = `snappinbuddy-${handleSlug || 'profil'}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: profile?.username || "Snappin'Buddy" });
          return;
        } catch (e) {
          if (e?.name === 'AbortError') return;
        }
      }
      const url = URL.createObjectURL(blob);
      setCardImage(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('profile-share-card', e);
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('copy', e);
    }
  }

  const btn = {
    width: '100%', padding: '14px', borderRadius: '24px',
    fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '10px',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto',
      padding: 'calc(env(safe-area-inset-top) + 24px) 24px calc(40px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ width: '100%', maxWidth: '340px', marginBottom: '20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'center', marginBottom: '12px' }}>
          {tx('Share your profile on your story 📸', 'Partage ton profil en story 📸')}
        </p>

        {/* Aperçu, fidèle à l'image enregistrée */}
        <div style={{
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
          borderRadius: '20px', padding: '28px 24px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
              background: '#2C2C2C', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
            }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '◉'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'white', fontSize: '19px', fontWeight: '900' }}>{profile?.username}</p>
              <p style={{ color: '#F2E050', fontSize: '13px', fontWeight: '700' }}>{profile?.handle}</p>
            </div>
          </div>

          {profile?.bio && (
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
              {profile.bio.length > 110 ? profile.bio.slice(0, 110) + '…' : profile.bio}
            </p>
          )}

          {roles.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {roles.map(r => (
                <span key={r} style={{
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  borderRadius: '16px', padding: '5px 12px', fontSize: '12px', fontWeight: '700',
                }}>
                  {ROLES.find(o => o.id === r)?.label || r}
                </span>
              ))}
            </div>
          )}

          {univers.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {univers.slice(0, 5).map(u => (
                <span key={u} style={{
                  border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.65)',
                  borderRadius: '14px', padding: '4px 10px', fontSize: '11px',
                }}>
                  {universLabel(u)}
                </span>
              ))}
            </div>
          )}

          {profile?.zone && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>📍 {profile.zone}</p>
          )}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '16px', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>{tx('Tap the link', 'Clique sur le lien')}</p>
              <p style={{ color: 'white', fontSize: '13px', fontWeight: '800' }}>snappinbuddy.com</p>
            </div>
            <span style={{ background: '#F2E050', color: '#0A0A0D', borderRadius: '18px', padding: '7px 14px', fontSize: '12px', fontWeight: '900', whiteSpace: 'nowrap' }}>
              {tx('Create with me ⚡', 'Créons ensemble ⚡')}
            </span>
          </div>
        </div>
      </div>

      {cardImage && (
        <div style={{ width: '100%', maxWidth: '340px', marginBottom: '16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>
            {tx('Press and hold the image to save it', 'Appuie longtemps sur l’image pour l’enregistrer')}
          </p>
          <img src={cardImage} alt="" style={{ width: '100%', borderRadius: '16px' }} />
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '340px' }}>
        <button onClick={saveImage} disabled={saving} style={{ ...btn, border: 'none', background: '#F2E050', color: '#0A0A0D' }}>
          {saving ? tx('Preparing…', 'Préparation…') : tx('📸 Save the image', '📸 Enregistrer l’image')}
        </button>
        <button onClick={copyLink} style={{ ...btn, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white' }}>
          {copied ? tx('Link copied ✓', 'Lien copié ✓') : tx('🔗 Copy my link', '🔗 Copier mon lien')}
        </button>
        <button onClick={onClose} style={{ ...btn, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
          {tx('Close', 'Fermer')}
        </button>
      </div>
    </div>
  );
}
