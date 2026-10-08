'use client';
import { useState, useEffect } from 'react';
import { useT, useRoles, useUnivers } from '../i18n';
import { tx, isNotFrench } from '../tx';
import { loadCities, searchCities } from '../cities';
import { slotsOf, SLOT_MAX } from '../slots';

const TITLE_MAX = 60;
// 800 caractères, c'était une page blanche qui invitait au remplissage : on a
// vu passer des descriptions collées depuis une IA. En 300 signes on écrit ce
// qu'on fait vraiment, et un brief court se lit en entier.
const DESC_MAX = 300;

export default function OfferForm({ theme, isEdit, editingOffer, onClose, onSave, onCloseOffer, onReopenOffer, onDeleteOffer }) {
  // Suppression en deux temps pour éviter les erreurs
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const t = useT();
  const isEn = isNotFrench();
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
  // Combien de personnes pour chaque rôle. Un projet peut chercher un
  // photographe et trois modèles : sans ce nombre, l'app croyait qu'une seule
  // personne suffisait par rôle et déclarait le projet complet trop tôt.
  const [roleCounts, setRoleCounts] = useState(() => slotsOf(editingOffer || {}));

  function setRoleCount(roleId, n) {
    const value = Math.max(1, Math.min(SLOT_MAX, n));
    setRoleCounts(prev => ({ ...prev, [roleId]: value }));
  }

  const [offerStyles, setOfferStyles] = useState(
    editingOffer?.styles_needed ? editingOffer.styles_needed.split(', ').filter(Boolean) : []
  );
  const [offerZone, setOfferZone] = useState(editingOffer?.zone || '');
  const [offerDate, setOfferDate] = useState(editingOffer?.date || '');
  // Une date, ou le fait assumé qu'il n'y en a pas encore.
  //
  // Le champ date était une case vide sans titre, posée à côté de la ville :
  // beaucoup l'ignoraient et écrivaient « samedi 26 septembre » dans le texte
  // du projet, où rien ne peut s'en servir. Résultat, la pastille date restait
  // vide sur la carte, le projet ne se classait pas et restait ouvert trente
  // jours après être passé.
  const [dateFlexible, setDateFlexible] = useState(() => (
    // Un projet déjà publié sans date n'est pas bloqué à la modification.
    !!editingOffer && !editingOffer.date
  ));
  // null tant que rien n'est choisi : les anciens projets n'ont pas cette
  // information, et on ne va pas affirmer à leur place qu'ils sont gratuits.
  const [offerPaid, setOfferPaid] = useState(
    editingOffer?.paid === true ? true : editingOffer?.paid === false ? false : null,
  );
  const [offerLoading, setOfferLoading] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // La liste n'est téléchargée qu'au premier mot tapé, et une seule fois pour
  // toute la session, partagée avec la carte.
  const [cities, setCities] = useState(null);
  const [citiesAsked, setCitiesAsked] = useState(false);
  useEffect(() => {
    if (!citiesAsked) return;
    let alive = true;
    loadCities()
      .then(list => { if (alive) setCities(list); })
      .catch(err => console.error('cities', err));
    return () => { alive = false; };
  }, [citiesAsked]);

  function handleCityChange(val) {
    setOfferZone(val);
    if (val.length < 2) { setShowCitySuggestions(false); return; }
    if (!citiesAsked) setCitiesAsked(true);
    if (!cities) { setShowCitySuggestions(false); return; }
    const found = searchCities(cities, val, 5).map(c => c.name);
    setCitySuggestions(found);
    setShowCitySuggestions(found.length > 0);
  }

  function selectCity(city) {
    setOfferZone(city);
    setShowCitySuggestions(false);
  }

  const stepBtn = {
    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
    border: `1px solid ${inputBorder}`, background: 'transparent',
    color: theme?.color, fontSize: '16px', lineHeight: 1, cursor: 'pointer',
  };

  function toggleRole(roleId) {
    setOfferRoles(prev => {
      const has = prev.includes(roleId);
      setRoleCounts(counts => {
        const next = { ...counts };
        if (has) delete next[roleId];
        else if (!next[roleId]) next[roleId] = 1;
        return next;
      });
      return has ? prev.filter(r => r !== roleId) : [...prev, roleId];
    });
  }

  function toggleStyle(s) {
    setOfferStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  const dateMissing = !offerDate && !dateFlexible;

  async function handleSave() {
    if (!offerTitle || offerRoles.length === 0 || dateMissing) return;
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
      // Seulement les rôles encore cochés : un rôle retiré ne doit pas laisser
      // sa place derrière lui.
      slots: Object.fromEntries(offerRoles.map(r => [r, roleCounts[r] || 1])),
      styles_needed: stylesToSave.join(', '),
      zone: offerZone,
      date: dateFlexible ? '' : offerDate,
      paid: offerPaid,
    });
    setOfferLoading(false);
  }

  function charCount(val, max) {
    const remaining = max - val.length;
    const color = remaining <= 10 ? '#FF4D4D' : remaining <= 30 ? '#FFD700' : subText;
    return <span style={{ fontSize: '11px', color }}>{val.length}/{max}</span>;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: darkMode ? '#0A0A0A' : '#F5F5F5', overflowY: 'auto' }}>
      {/* La marge qui écarte la barre d'état. Sans elle, l'en-tête passait
          sous l'heure et l'encoche : le titre se superposait à l'horloge et la
          flèche retour devenait inatteignable. Tous les autres écrans posés
          par-dessus l'app l'avaient, celui-ci était le seul à l'oublier. */}
      <div style={{ padding: `calc(env(safe-area-inset-top) + 20px) 16px calc(100px + env(safe-area-inset-bottom))` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={onClose} aria-label={tx('Back', 'Retour')} style={{ background: 'none', border: 'none', color: theme?.color, fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: theme?.color }}>
            {isEdit ? (tx('Edit project', 'Modifier le projet')) : (tx('New project', 'Nouveau projet'))}
          </h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ color: subText, fontSize: '11px', fontWeight: '600' }}>{tx('TITLE *', 'TITRE *')}</span>
          {charCount(offerTitle, TITLE_MAX)}
        </div>
        {/* On coupe au maximum autorisé au lieu de refuser la saisie : sinon un
            copier-coller trop long ne colle rien du tout, sans aucune explication. */}
        <input
          value={offerTitle}
          onChange={e => setOfferTitle(e.target.value.slice(0, TITLE_MAX))}
          placeholder={tx('Project title *', 'Titre du projet *')}
          style={{ width: '100%', padding: '13px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', outline: 'none' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ color: subText, fontSize: '11px', fontWeight: '600' }}>{tx('DESCRIPTION', 'DESCRIPTION')}</span>
          {charCount(offerDesc, DESC_MAX)}
        </div>
        <textarea
          value={offerDesc}
          onChange={e => setOfferDesc(e.target.value.slice(0, DESC_MAX))}
          placeholder={tx(
            'Natural light portrait series, Saturday afternoon in Shoreditch. Looking for a model and a makeup artist. Retouched photos for everyone, unpaid.',
            'Série portrait en lumière naturelle, samedi après-midi à Belleville. Je cherche une modèle et une maquilleuse. Photos retouchées pour tout le monde, non rémunéré.',
          )}
          rows={4}
          style={{ width: '100%', padding: '13px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', marginBottom: '6px', boxSizing: 'border-box', resize: 'none', outline: 'none' }}
        />
        {/* Un exemple vaut mieux qu'une consigne : il donne le ton, le niveau de
            détail et la longueur en une seconde. */}
        <p style={{ color: subText, fontSize: '11px', marginBottom: '16px', lineHeight: 1.5 }}>
          {tx(
            'Three sentences are enough: what you are shooting, who you need, what you offer.',
            'Trois phrases suffisent : ce qu’on fait, qui tu cherches, ce que tu proposes.',
          )}
        </p>

        <p style={{ color: subText, fontSize: '11px', marginBottom: '8px', fontWeight: '600' }}>
          {tx('WHO ARE YOU LOOKING FOR? *', 'QUI CHERCHES-TU ? *')}
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

        {/* Combien de personnes pour chaque rôle choisi. Le compteur
            n'apparaît que pour les rôles cochés, pour ne pas encombrer la
            liste de vingt métiers au-dessus. */}
        {offerRoles.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: subText, fontSize: '11px', marginBottom: '8px' }}>
              {tx('How many people for each?', 'Combien de personnes pour chacun ?')}
            </p>
            {offerRoles.map(id => {
              const role = ROLES.find(x => x.id === id);
              const n = roleCounts[id] || 1;
              return (
                <div key={id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '10px', padding: '8px 12px', marginBottom: '6px',
                  borderRadius: '12px', border: `1px solid ${inputBorder}`,
                }}>
                  <span style={{ color: theme?.color, fontSize: '13px', fontWeight: '700', minWidth: 0 }}>
                    {role?.icon} {role?.label || id}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <button
                      onClick={() => setRoleCount(id, n - 1)}
                      disabled={n <= 1}
                      aria-label={tx('One less', 'Un de moins')}
                      style={{ ...stepBtn, opacity: n <= 1 ? 0.3 : 1 }}
                    >−</button>
                    <span style={{ color: theme?.color, fontSize: '14px', fontWeight: '800', minWidth: '16px', textAlign: 'center' }}>{n}</span>
                    <button
                      onClick={() => setRoleCount(id, n + 1)}
                      disabled={n >= SLOT_MAX}
                      aria-label={tx('One more', 'Un de plus')}
                      style={{ ...stepBtn, opacity: n >= SLOT_MAX ? 0.3 : 1 }}
                    >+</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}

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

        {/* La question que tout le monde se pose avant de répondre, et qui fait
            perdre trois échanges de messages quand elle n'est pas posée. */}
        <p style={{ color: subText, fontSize: '11px', marginBottom: '8px', fontWeight: '600' }}>
          {tx('PAID?', 'RÉMUNÉRÉ ?')}
        </p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {[
            { value: true, label: tx('💶 Paid', '💶 Rémunéré') },
            { value: false, label: tx('🤝 Unpaid collab', '🤝 Collab non rémunérée') },
          ].map(opt => {
            const active = offerPaid === opt.value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => setOfferPaid(active ? null : opt.value)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '20px', fontSize: '12px',
                  fontWeight: '700', cursor: 'pointer',
                  border: `1px solid ${active ? theme?.color : inputBorder}`,
                  background: active ? theme?.color : 'transparent',
                  color: active ? theme?.bg : subText,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <p style={{ color: subText, fontSize: '12px', marginBottom: '4px', fontWeight: '600' }}>
          {tx('WHERE AND WHEN', 'OÙ ET QUAND')} *
        </p>
        <p style={{ color: subText, fontSize: '11px', marginBottom: '10px', lineHeight: 1.5 }}>
          {tx(
            'The date is what lets people know if they are free, and it closes your project once it has passed.',
            'La date permet aux gens de savoir s’ils sont libres, et ferme ton projet une fois passé.'
          )}
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
          <span style={{ flex: 1, color: subText, fontSize: '11px' }}>{tx('City', 'Ville')}</span>
          <span style={{ flex: 1, color: subText, fontSize: '11px' }}>Date</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              value={offerZone}
              onChange={e => handleCityChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
              placeholder={tx('City', 'Ville')}
              style={{ width: '100%', padding: '13px', borderRadius: '12px', border: `1px solid ${inputBorder}`, background: inputBg, color: theme?.color, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
            {showCitySuggestions && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: darkMode ? '#1A1A1A' : '#fff',
                border: `1px solid ${inputBorder}`,
                borderRadius: '12px', marginTop: '4px',
                overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}>
                {citySuggestions.map(city => (
                  <div key={city} onMouseDown={() => selectCity(city)} style={{
                    padding: '11px 14px', cursor: 'pointer', fontSize: '14px',
                    color: theme?.color, borderBottom: `1px solid ${inputBorder}`,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    📍 {city}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            type="date"
            value={offerDate}
            onChange={e => setOfferDate(e.target.value)}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px',
              border: `1px solid ${inputBorder}`,
              background: inputBg, color: theme?.color,
              fontSize: '14px', boxSizing: 'border-box', outline: 'none',
              colorScheme: darkMode ? 'dark' : 'light',
              opacity: dateFlexible ? 0.4 : 1,
            }}
            disabled={dateFlexible}
          />
        </div>

        <button
          onClick={() => setDateFlexible(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px',
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: subText, fontSize: '12px', fontFamily: 'inherit',
          }}
        >
          <span style={{
            width: '16px', height: '16px', borderRadius: '5px', flexShrink: 0,
            border: `1.5px solid ${dateFlexible ? theme?.color : inputBorder}`,
            background: dateFlexible ? theme?.color : 'transparent',
            color: theme?.bg, fontSize: '11px', fontWeight: '900',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{dateFlexible ? '✓' : ''}</span>
          {tx('Date still to be decided', 'Date encore à définir')}
        </button>

        {dateMissing && (
          <p style={{ color: '#FFB020', fontSize: '11px', marginBottom: '18px', lineHeight: 1.5 }}>
            {tx(
              'Add a date, or tick the box above. Writing it in the text only is not enough: nothing can read it there.',
              'Mets une date, ou coche la case au-dessus. L’écrire seulement dans le texte ne suffit pas : rien ne peut la lire là.'
            )}
          </p>
        )}
        {!dateMissing && <div style={{ marginBottom: '18px' }} />}

        <button
          onClick={handleSave}
          disabled={offerLoading || !offerTitle || offerRoles.length === 0 || dateMissing}
          style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: theme?.color, color: theme?.bg, fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px' }}
        >
          {offerLoading ? (tx('Launching...', 'Lancement...')) : isEdit ? (tx('✓ Save changes', '✓ Enregistrer')) : (tx('⚡ Launch project', '⚡ Lancer le projet'))}
        </button>

        {isEdit && (editingOffer?.status === 'closed' ? (
          <button
            onClick={onReopenOffer}
            style={{ width: '100%', padding: '14px', borderRadius: '24px', border: '1px solid rgba(46,204,113,0.5)', background: 'transparent', color: '#2ECC71', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px' }}
          >
            🔓 {tx('Reopen project', 'Rouvrir le projet')}
          </button>
        ) : (
          <button
            onClick={onCloseOffer}
            style={{ width: '100%', padding: '14px', borderRadius: '24px', border: '1px solid rgba(255,77,77,0.4)', background: 'transparent', color: '#FF4D4D', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px' }}
          >
            🔒 {tx('Close project', 'Fermer le projet')}
          </button>
        ))}

        {isEdit && onDeleteOffer && (
          <button
            disabled={deleting}
            onClick={async () => {
              if (!confirmDelete) { setConfirmDelete(true); return; }
              setDeleting(true);
              await onDeleteOffer();
              setDeleting(false);
            }}
            style={{ width: '100%', padding: '14px', borderRadius: '24px', border: 'none', background: confirmDelete ? '#FF4D4D' : 'transparent', color: confirmDelete ? '#fff' : subText, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
          >
            {deleting
              ? tx('Deleting...', 'Suppression...')
              : confirmDelete
              ? tx('Tap again to delete for good', 'Appuie encore pour supprimer définitivement')
              : `🗑 ${tx('Delete project', 'Supprimer le projet')}`}
          </button>
        )}
      </div>
    </div>
  );
}