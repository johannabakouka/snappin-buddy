'use client';
import { useRef, useState } from 'react';
import { useRoles, useT } from '../i18n';
import { tx, isNotFrench } from '../tx';

export default function ShareCard({ offer, profile, onClose }) {
  const t = useT();
  const isEn = isNotFrench();
  const ROLES = useRoles();
  const cardRef = useRef(null);

  const roles = (offer.role_needed || '').split(',').map(r => r.trim()).filter(Boolean);
  const [copied, setCopied] = useState(false);
  // Lien direct vers le projet : à coller dans le sticker lien de la story
  const link = `https://snappinbuddy.com/?offer=${offer.id}`;

  const [saving, setSaving] = useState(false);
  const [cardImage, setCardImage] = useState(null);

  // Dessine la carte en vraie image, au format story 1080x1920.
  // On reprend la charte : fond sombre, jaune de la marque, typo Nunito.
  async function buildImage() {
    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Police de la marque, déjà chargée par l'app
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

    // Carte : on mesure d'abord le contenu, puis on dessine à la bonne hauteur
    const CX = 80, CY = 470, CW = W - 160;
    const PAD = 56;
    let paint = false;
    let y = CY + 92;

    const ft = (text, x, py) => { if (paint) ctx.fillText(text, x, py); };
    const fillShape = () => { if (paint) ctx.fill(); };
    const strokeShape = () => { if (paint) ctx.stroke(); };

    const drawContent = () => {
      y = CY + 92;

    // Badge projet
    ctx.textAlign = 'left';
    const badge = tx('⚡ PROJECT', '⚡ PROJET');
    ctx.font = font(800, 24);
    const badgeW = ctx.measureText(badge).width + 44;
    ctx.fillStyle = 'rgba(242,224,80,0.12)';
    round(CX + PAD, y - 34, badgeW, 50, 25); fillShape();
    ctx.strokeStyle = 'rgba(242,224,80,0.45)';
    ctx.lineWidth = 1.5;
    round(CX + PAD, y - 34, badgeW, 50, 25); strokeShape();
    ctx.fillStyle = '#F2E050';
    ft(badge, CX + PAD + 22, y);
    y += 88;

    // Auteur du projet : on voyait le projet sans savoir qui le proposait.
    const authorLine = profile?.handle || profile?.username || '';
    if (authorLine) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = font(600, 27);
      ft(`Buddy   ${authorLine}`, CX + PAD, y);
      y += 62;
    }

    // Titre
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

    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(900, 58);
    wrap(offer.title, CW - PAD * 2, 70, 4);

    // Description
    if (offer.description) {
      y += 16;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = font(400, 30);
      wrap(offer.description, CW - PAD * 2, 42, 3);
    }

    // On cherche
    y += 40;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = font(800, 21);
    ctx.letterSpacing = '3px';
    ft(tx('LOOKING FOR', 'ON CHERCHE'), CX + PAD, y);
    ctx.letterSpacing = '0px';
    y += 50;

    // Pastilles des rôles
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

    // Univers
    if (styles.length) {
      x = CX + PAD;
      ctx.font = font(600, 24);
      for (const st of styles.slice(0, 5)) {
        const w = ctx.measureText(st).width + 40;
        if (x + w > CX + CW - PAD) break;
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1.5;
        round(x, y - 30, w, 46, 23); strokeShape();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ft(st, x + 20, y);
        x += w + 10;
      }
      y += 64;
    }

    // Lieu et date
    const infos = [offer.zone ? `📍 ${offer.zone}` : '', offer.date ? `📅 ${offer.date}` : ''].filter(Boolean).join('    ');
    if (infos) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = font(600, 27);
      ft(infos, CX + PAD, y);
      y += 20;
    }
      return y;
    };

    // passe 1 : mesure
    const contentBottom = drawContent();
    const CH = Math.min(1180, Math.max(620, contentBottom - CY + 190));

    // on centre la carte dans l'espace disponible
    const dy = Math.max(0, (1150 - CH) / 2);
    ctx.save();
    ctx.translate(0, dy);

    // fond de la carte
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

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = font(600, 24);
    ctx.fillText(tx('Tap the link', 'Clique sur le lien'), CX + PAD, footY - 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(800, 28);
    ctx.fillText('snappinbuddy.com', CX + PAD, footY + 36);

    const cta = tx('Apply ⚡', 'Je me propose ⚡');
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

    // Signature
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
      const file = new File([blob], `snappinbuddy-projet-${offer.id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: offer.title || "Snappin'Buddy" });
          return;
        } catch (e) {
          if (e?.name === 'AbortError') return;
        }
      }
      const url = URL.createObjectURL(blob);
      setCardImage(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snappinbuddy-projet-${offer.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('share-card', e);
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
  const styles = (offer.styles_needed || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto',
      padding: 'calc(env(safe-area-inset-top) + 24px) 24px calc(40px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ width: '100%', maxWidth: '340px', marginBottom: '20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'center', marginBottom: '12px' }}>
          {tx('📸 Screenshot this card and share it on your story!', '📸 Screenshot cette carte et partage-la en story !')}
        </p>

        {/* La carte à screenshot */}
        <div ref={cardRef} style={{
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
          borderRadius: '20px',
          padding: '32px 24px',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Fond décoratif */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '150px', height: '150px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-30px', left: '-30px',
            width: '120px', height: '120px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: 'black',
              flexShrink: 0,
            }}>S</div>
            <span style={{ color: 'white', fontWeight: '900', fontSize: '14px', letterSpacing: '-0.3px' }}>
              Snappin&apos;Buddy
            </span>
          </div>

          {/* Badge projet */}
          <div style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '4px 12px', marginBottom: '16px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>
              {tx('⚡ PROJECT', '⚡ PROJET')}
            </span>
          </div>

          {/* Auteur, pour que l'aperçu corresponde à l'image partagée */}
          {(profile?.handle || profile?.username) && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '10px' }}>
              Buddy&nbsp;&nbsp; {profile?.handle || profile?.username}
            </p>
          )}

          {/* Titre */}
          <h2 style={{
            color: 'white', fontSize: '22px', fontWeight: '900',
            lineHeight: 1.2, marginBottom: '20px',
            fontFamily: 'sans-serif',
          }}>
            {offer.title}
          </h2>

          {/* Description */}
          {offer.description && (
            <p style={{
              color: 'rgba(255,255,255,0.55)', fontSize: '13px',
              lineHeight: 1.6, marginBottom: '20px',
            }}>
              {offer.description.length > 100 ? offer.description.substring(0, 100) + '...' : offer.description}
            </p>
          )}

          {/* Rôles */}
          {roles.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px' }}>
                {tx('LOOKING FOR', 'ON CHERCHE')}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {roles.map(r => {
                  const role = ROLES.find(x => x.id === r);
                  return (
                    <span key={r} style={{
                      background: 'rgba(255,255,255,0.12)', color: 'white',
                      borderRadius: '20px', padding: '5px 12px',
                      fontSize: '12px', fontWeight: '700',
                    }}>
                      {role?.icon} {role?.label || r}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {styles.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {styles.map(s => (
                  <span key={s} style={{
                    border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)',
                    borderRadius: '20px', padding: '3px 10px', fontSize: '11px',
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Infos */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {offer.zone && (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                📍 {offer.zone}
              </span>
            )}
            {offer.date && (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                📅 {offer.date}
              </span>
            )}
          </div>

          {/* Séparateur */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '16px' }} />

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', lineHeight: 1.4 }}>
              {tx('Tap the link to apply', 'Clique sur le lien pour te proposer')}{'\n'}
              <span style={{ color: 'white', fontWeight: '700' }}>snappinbuddy.com</span>
            </p>
            <div style={{
              background: 'white', color: 'black',
              borderRadius: '20px', padding: '8px 16px',
              fontSize: '12px', fontWeight: '900',
            }}>
              {tx('Join ⚡', 'Je me propose ⚡')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button onClick={saveImage} disabled={saving} style={{
            flex: 1, padding: '13px', borderRadius: '24px', border: 'none',
            background: '#F2E050', color: '#0A0A0A',
            fontSize: '14px', fontWeight: '800', cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? tx('Preparing...', 'Préparation...') : tx('⬇️ Save the image', '⬇️ Enregistrer l’image')}
          </button>
          <button onClick={copyLink} style={{
            flex: 1, padding: '13px', borderRadius: '24px',
            border: `1px solid ${copied ? '#2ECC71' : 'rgba(255,255,255,0.25)'}`,
            background: 'transparent', color: copied ? '#2ECC71' : 'white',
            fontSize: '14px', fontWeight: '800', cursor: 'pointer',
          }}>
            {copied ? tx('Copied ✓', 'Copié ✓') : tx('🔗 Copy the link', '🔗 Copier le lien')}
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textAlign: 'center', marginTop: '12px', lineHeight: 1.6 }}>
          {tx('1. Save the image, then post it on your story.', '1. Enregistre l’image, puis poste-la en story.')}<br />
          {tx('2. Copy the link, then add the link sticker and paste it.', '2. Copie le lien, ajoute le sticker lien et colle-le.')}<br />
          {tx('3. Anyone who taps it lands on this exact project.', '3. Quiconque clique dessus arrive directement sur ce projet.')}
        </p>
      </div>

      {cardImage && (
        <div onClick={() => setCardImage(null)} style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '24px' }}>
          <img src={cardImage} alt="" onClick={e => e.stopPropagation()} style={{ maxHeight: '70vh', maxWidth: '100%', borderRadius: '14px' }} />
          <p style={{ color: 'white', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}>
            {tx('Press and hold the image to save it.', 'Appuie longuement sur l’image pour l’enregistrer.')}
          </p>
          <button onClick={() => setCardImage(null)} style={{ background: 'white', color: '#000', border: 'none', borderRadius: '24px', padding: '10px 24px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
            {tx('Close', 'Fermer')}
          </button>
        </div>
      )}

      <button onClick={onClose} style={{
        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
        color: 'white', borderRadius: '24px', padding: '12px 32px',
        fontSize: '14px', fontWeight: '700', cursor: 'pointer', flexShrink: 0,
        marginTop: '8px',
      }}>
        {tx('Close', 'Fermer')}
      </button>
    </div>
  );
}