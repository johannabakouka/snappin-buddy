'use client';
import { useState } from 'react';
import { useT, useRoles, useUnivers } from '../i18n';

export default function OfferForm({ theme, isEdit, editingOffer, onClose, onSave, onCloseOffer }) {
  const t = useT();
  const isEn = t.map === 'Map';
  const ROLES = useRoles();
  const UNIVERS = useUnivers();
  const darkMode = theme?.dark ?? true;
  const subText = darkMode ? '#666' : '#888';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const [offerTitle, setOfferTitle] = useState(editingOffer?.title || '');
  const [offerDesc, setOfferDesc] = useState(editingOffer?.description || '');
  const [offerRoles, setOfferRoles] = useState(
    editingOffer?.role_needed ? editingOffer.role_needed.split(', ').filter(Boolean) : []
  );
  const [offerStyles, setOfferStyles] = useState(
    editingOffer?.styles_needed ? editingOffer.styles_needed.split(', ').filter(Boolean) : []
  );
  const [offerZone, setOfferZone] = useState(editingOffer?.zone || '');
  const [offerDate, setOfferDate] = useState(editingOffer?.date || '');
  const [offerLoading, setOfferLoading] = useState(false);

  function toggleRole(roleId) {
    setOfferRoles(prev => prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]);
  }

  function toggleStyle(s) {
    setOfferStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleSave() {
    if (!offerTitle || offerRoles.length === 0) return;
    setOfferLoading(true);
    const { UNIVERS_FR, UNIVERS_EN } = await import('../constants');
    const stylesToSave = offerStyles.map(label => {
      if (!isEn) return label;
      const idx = UNIVERS_EN.indexOf(label);
      return idx >= 0 ? UNIVERS_FR[idx] : label;
    });
    await onSave({
      title: offerTitle,
      description: offerDesc,
      role_needed: offerRoles.join(', '),
      styles_needed: stylesToSave.join(', '),
      zone: offerZone,
      date: offerDate,
    });
    setOfferLoading(false);
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: darkMode ? '#0A0A0A' : '#F5F5F5', overflowY: 'auto' }}>
      <div style={{ padding: '20px 16px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme?.color, fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: theme?.color }}>
            {isEdit ? (isEn ? 'Edit brief' : "Modifier l'offre") : (isEn ? 'New brief' : 'Nouvelle offre')}
          </h2>
        </div>

        <input
          value={offerTitle}
          onChange={e => setOfferTitle(e.target.value)}
          placeholder={isEn ? 'Brief title *' : "Titre de l'offre *"}
          style={{ width: '100%', padding: '13px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box', outline: 'none' }}
        />
        <textarea
          value={offerDesc}
          onChange={e => setOfferDesc(e.target.value)}
          placeholder={isEn ? 'Project description...' : 'Description du projet...'}
          rows={3}
          style={{ width: '100%', padding: '13px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', resize: 'none', outline: 'none' }}
        />

        <p style={{ color: subText, fontSize: '11px', marginBottom: '8px', fontWeight: '600' }}>
          {isEn ? 'ROLES NEEDED *' : 'RÔLES RECHERCHÉS *'}
          {offerRoles.length > 0 && <span style={{ color: theme?.color, marginLeft: '6px' }}>({offerRoles.length})</span>}
        </p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {ROLES.map(r => {
            const active = offerRoles.includes(r.id);
            return (
              <button key={r.id} onClick={() => toggleRole(r.id)} style={{ padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, border: `1px solid ${active ? theme?.color : inputBorder}`, background: active ? theme?.color : 'transparent', color: active ? theme?.bg : subText }}>
                {r.icon} {r.label}
              </button>
            );
          })}
        </div>

        <p style={{ color: subText, fontSize: '11px', marginBottom: '8px', fontWeight: '600' }}>
          TAGS{offerStyles.length > 0 && <span style={{ color: theme?.color, marginLeft: '6px' }}>({offerStyles.length})</span>}
        </p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {UNIVERS.map(s => {
            const active = offerStyles.includes(s);
            return (
              <button key={s} onClick={() => toggleStyle(s)} style={{ padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, border: `1px solid ${active ? theme?.color : inputBorder}`, background: active ? theme?.color : 'transparent', color: active ? theme?.bg : subText }}>
                {s}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <input
            value={offerZone}
            onChange={e => setOfferZone(e.target.value)}
            placeholder={isEn ? 'City' : 'Ville'}
            style={{ flex: 1, padding: '13px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
          />
          <input
            value={offerDate}
            onChange={e => setOfferDate(e.target.value)}
            placeholder='Date'
            style={{ flex: 1, padding: '13px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={offerLoading || !offerTitle || offerRoles.length === 0}
          style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: theme?.color, color: theme?.bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px' }}
        >
          {offerLoading ? (isEn ? 'Saving...' : 'Sauvegarde...') : isEdit ? (isEn ? '✓ Save changes' : '✓ Enregistrer') : (isEn ? '⚡ Publish brief' : "⚡ Publier l'offre")}
        </button>

        {isEdit && (
          <button
            onClick={onCloseOffer}
            style={{ width: '100%', padding: '14px', borderRadius: '24px', border: '1px solid rgba(255,77,77,0.4)', background: 'transparent', color: '#FF4D4D', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            🔒 {isEn ? 'Close this brief' : 'Fermer cette offre'}
          </button>
        )}
      </div>
    </div>
  );
}