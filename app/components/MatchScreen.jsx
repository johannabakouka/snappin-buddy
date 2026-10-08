'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import Header from './Header';
import QRScreen from './QRScreen';
import OfferForm from './OfferForm';
import BuddyProfileScreen from './BuddyProfileScreen';
import PhotoViewer from './PhotoViewer';
import ShareCard from './ShareCard';
import ChatScreen from './ChatScreen';
import { useT, useRoles, useUnivers, getLang } from '../i18n';
import { tx, isNotFrench } from '../tx';
import { normalizeSearch } from '../search';
import { countryMatches, countryName } from '../countries';
import { loadSavedOfferIds, saveOffer, unsaveOffer, onSavedChanged } from '../saved-offers';
import Thumb from './Thumb';
import { usePullToRefresh } from '../pull-refresh';
import PullIndicator from './PullIndicator';
import { SkeletonList } from './Skeleton';
import ReportSheet from './ReportSheet';
import ApplySheet from './ApplySheet';
import WithdrawSheet from './WithdrawSheet';
import { slotsOf, filledOf, isFilled } from '../slots';
import { tap } from '../haptics';
import { loadBlockedIds, onBlocksChanged } from '../blocks';
import { withAt } from '../handles';
import { isPast, needsFollowUp, loadSkipped, skipFollowUp } from '../offers-life';
import { hasRole, roleLabels, splitRoles, APPLY_NOTE_MAX } from '../constants';

// Le serveur retrouve lui-même le destinataire à partir de la candidature (collabId)
async function sendEmail(type, payload) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ type, ...payload }),
    });
  } catch (e) {
    console.error('Email error:', e);
  }
}

/**
 * La date d'un projet, écrite comme on la lit : « sam. 26 sept. ».
 * Elle est stockée en aaaa-mm-jj, qui ne se lit pas d'un coup d'œil.
 */
function offerDateLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const d = new Date(raw + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(tx('en-GB', 'fr-FR'), { weekday: 'short', day: 'numeric', month: 'short' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MatchScreen({ theme, setScreen, active = true, myProjectsSignal = 0, myApplicationsSignal = 0, homeSignal = 0, sharedOfferId = '', onSharedOfferSeen }) {
  const t = useT();
  const isEn = isNotFrench();
  const ROLES = useRoles();
  const UNIVERS = useUnivers();
  const darkMode = theme?.dark ?? true;
  const card = darkMode ? '#1A1A1A' : '#E8E8E8';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const subText = darkMode ? '#666' : '#888';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const [tab, setTab] = useState('offres');
  // Portfolio ouvert en plein écran : { photos, index }
  const [viewer, setViewer] = useState(null);
  // Échec d'une action : affiché en bandeau en bas. Avant, ces écritures ne
  // lisaient jamais leur erreur — le projet n'était pas créé, la candidature
  // pas enregistrée, et l'écran affichait le contraire.
  const [actionError, setActionError] = useState('');
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [user, setUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [qrCollab, setQrCollab] = useState(null);
  const [offers, setOffers] = useState([]);
  // Le feed annonçait « aucun projet » pendant que la requête tournait.
  const [firstLoad, setFirstLoad] = useState(true);
  // Projet signalé : son identifiant, ou null. Les CGU interdisent les annonces
  // mensongères, mais aucun bouton ne permettait de les signaler.
  const [reportingOffer, setReportingOffer] = useState(null);
  // Projet pour lequel on est en train de se proposer, ou null.
  const [applyingTo, setApplyingTo] = useState(null);
  // Candidature en cours de retrait, pour ne pas cliquer deux fois.
  const [withdrawing, setWithdrawing] = useState(null);
  // Désistement d'une collab acceptée : le panneau de confirmation, avec le
  // message qui partira dans la conversation. null quand il est fermé.
  const [withdrawSheet, setWithdrawSheet] = useState(null);
  const [myOffers, setMyOffers] = useState([]);
  const [showNewOffer, setShowNewOffer] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [offerCandidates, setOfferCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [appliedOffers, setAppliedOffers] = useState(new Map());
  const [viewingBuddy, setViewingBuddy] = useState(null);
  const [sharingOffer, setSharingOffer] = useState(null);
  // Conversation ouverte directement depuis Match (après avoir accepté, ou bouton Écrire)
  const [chatBuddy, setChatBuddy] = useState(null);
  // Projet ouvert depuis un lien partagé (snappinbuddy.com/?offer=123)
  const [sharedOffer, setSharedOffer] = useState(null);

  // Projets passés que l'auteur a repoussés à « plus tard ». Gardé sur
  // l'appareil : au premier rendu côté serveur il n'y a rien à lire.
  const [skippedPast, setSkippedPast] = useState(() => (typeof window === 'undefined' ? new Set() : loadSkipped()));
  const [followUpNote, setFollowUpNote] = useState('');

  const [filterRole, setFilterRole] = useState(null);
  const [filterUnivers, setFilterUnivers] = useState(null);
  const [filterZone, setFilterZone] = useState('');
  const [sortBy, setSortBy] = useState('match');
  // Les projets mis de côté. Le filtre est à part des autres : il ne restreint
  // pas le fil, il montre une autre liste.
  const [savedIds, setSavedIds] = useState(new Set());
  const [filterSaved, setFilterSaved] = useState(false);
  const [savingOffer, setSavingOffer] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadCollabs(data.user.id);
        loadOffers(data.user.id);
        loadApplied(data.user.id);
        loadSavedOfferIds(data.user.id).then(setSavedIds);
        supabase.from('profiles').select('*').eq('user_id', data.user.id).single().then(({ data: p }) => setMyProfile(p));
      }
    });
  }, []);

  // Lien partagé : on charge le projet même s'il n'est pas dans la liste, et on l'affiche en premier
  useEffect(() => {
    if (!sharedOfferId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from('offers').select('*').eq('id', sharedOfferId).maybeSingle();
      if (!alive || !data) return;
      const { data: author } = await supabase.from('profiles')
        .select('user_id, username, handle, avatar_url, role, role_other').eq('user_id', data.user_id).maybeSingle();
      setSharedOffer({ ...data, authorProfile: author || null });
      setTab('offres');
      scrollBoxRef.current?.scrollTo({ top: 0 });
      onSharedOfferSeen?.();
    })();
    return () => { alive = false; };
  }, [sharedOfferId]);

  // Retour sur l'onglet : mise à jour silencieuse des projets et candidatures
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current && user) {
      loadCollabs(user.id);
      loadOffers(user.id);
      loadApplied(user.id);
    }
    wasActive.current = active;
  }, [active]);

  // Bouton « Mes projets » du profil : ouvre l'onglet Projets, en haut de la liste
  const scrollBoxRef = useRef(null);
  // Tirer vers le bas pour voir les nouveaux projets et les nouvelles réponses.
  const { pull, refreshing, trigger } = usePullToRefresh(scrollBoxRef, async () => {
    if (!user) return;
    await Promise.all([loadCollabs(user.id), loadOffers(user.id), loadApplied(user.id)]);
  });
  const [seenSignal, setSeenSignal] = useState(myProjectsSignal);
  if (myProjectsSignal !== seenSignal) {
    setSeenSignal(myProjectsSignal);
    setTab('offres');
    setSelectedOffer(null);
  }
  useEffect(() => {
    if (myProjectsSignal) scrollBoxRef.current?.scrollTo({ top: 0 });
  }, [myProjectsSignal]);

  // Bouton « Mes candidatures » du profil : ouvre l'onglet Match
  // Rappui sur l'onglet Projets : on referme tout ce qui est ouvert par-dessus
  // le feed et on remonte en haut.
  const [seenHome, setSeenHome] = useState(homeSignal);
  if (homeSignal !== seenHome) {
    setSeenHome(homeSignal);
    setSelectedOffer(null);
    setChatBuddy(null);
    setViewingBuddy(null);
    setQrCollab(null);
    setEditingOffer(null);
    setShowNewOffer(false);
    setSharingOffer(null);
    setApplyingTo(null);
    setTab('offres');
    scrollBoxRef.current?.scrollTo({ top: 0 });
  }

  const [seenAppSignal, setSeenAppSignal] = useState(myApplicationsSignal);
  if (myApplicationsSignal !== seenAppSignal) {
    setSeenAppSignal(myApplicationsSignal);
    setTab('match');
    setSelectedOffer(null);
  }

  async function loadApplied(userId) {
    // Par identifiant de projet, plus par titre recopié dans le message : un
    // titre modifié faisait disparaître la candidature de l'écran, et deux
    // projets au même titre se confondaient.
    const { data } = await supabase.from('collabs').select('id, offer_id, status').eq('sender_id', userId);
    if (data) {
      // On garde l'identifiant de la candidature et son état, pas seulement le
      // fait d'avoir postulé : c'est ce qui permet de la retirer depuis la carte
      // du projet, sans aller la chercher ailleurs.
      const m = new Map();
      for (const c of data) if (c.offer_id) m.set(String(c.offer_id), { id: c.id, status: c.status });
      setAppliedOffers(m);
    }
  }

  async function loadCollabs(userId) {
    const { data: recv } = await supabase.from('collabs').select('*').eq('receiver_id', userId).order('created_at', { ascending: false });
    const { data: snt } = await supabase.from('collabs').select('*').eq('sender_id', userId).order('created_at', { ascending: false });
    if (recv && recv.length > 0) {
      const senderIds = recv.map(c => c.sender_id);
      const { data: senderProfiles } = await supabase.from('profiles').select('user_id, username, handle, role, role_other, avatar_url, styles, zone, bio, portfolio_urls, portfolio_url, is_early_adopter').in('user_id', senderIds);
      setReceived(recv.map(c => ({ ...c, senderProfile: senderProfiles?.find(p => p.user_id === c.sender_id) })));
    } else setReceived([]);
    if (snt && snt.length > 0) {
      const receiverIds = snt.map(c => c.receiver_id);
      const { data: receiverProfiles } = await supabase.from('profiles').select('user_id, username, handle, role, role_other, avatar_url, styles, zone, bio, portfolio_urls, portfolio_url, is_early_adopter').in('user_id', receiverIds);
      setSent(snt.map(c => ({ ...c, receiverProfile: receiverProfiles?.find(p => p.user_id === c.receiver_id) })));
    } else setSent([]);
  }

  useEffect(() => onBlocksChanged(() => { if (user?.id) loadOffers(user.id); }), [user]);

  // Un enregistrement fait ailleurs dans l'app (sur un projet ouvert par un
  // lien, par exemple) doit se voir ici sans changer d'onglet.
  useEffect(() => onSavedChanged(() => {
    if (user?.id) loadSavedOfferIds(user.id).then(setSavedIds);
  }), [user]);

  /**
   * Mettre un projet de côté, ou le reprendre.
   *
   * La liste locale est mise à jour tout de suite, avant la réponse du serveur :
   * un signet qui met une seconde à s'allumer donne l'impression que le bouton
   * n'a pas marché, et on reclique.
   */
  async function toggleSaved(offerId) {
    if (!user?.id || savingOffer) return;
    const cle = String(offerId);
    const etait = savedIds.has(cle);
    setSavingOffer(cle);
    setSavedIds(prev => {
      const next = new Set(prev);
      if (etait) next.delete(cle); else next.add(cle);
      return next;
    });
    try {
      if (etait) await unsaveOffer(user.id, offerId);
      else await saveOffer(user.id, offerId);
      tap();
    } catch (e) {
      console.error('toggleSaved', e);
      // On remet la liste comme elle était : mieux vaut un signet qui revient
      // en arrière qu'un signet allumé sur rien.
      setSavedIds(prev => {
        const next = new Set(prev);
        if (etait) next.add(cle); else next.delete(cle);
        return next;
      });
      setActionError(tx(
        "Couldn't save this project. Try again.",
        "L’enregistrement de ce projet a échoué. Réessaie.",
      ));
    }
    setSavingOffer(null);
  }

  // « Marquer comme réalisé » : ferme la collab quand les deux l'ont confirmée.
  // Ça ne fait pas monter le compteur « Projets validés » — ça, c'est réservé au
  // scan du QR, parce qu'on ne peut pas se scanner sans se rencontrer.
  const [markingDone, setMarkingDone] = useState(null);
  const [doneMessage, setDoneMessage] = useState(null);

  async function markDone(collab) {
    setMarkingDone(collab.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/mark-done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ collabId: collab.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || res.status);
      setDoneMessage({
        id: collab.id,
        text: body.both
          ? body.alreadyScanned
            ? tx('Project done ✓', 'Projet réalisé ✓')
            : tx('Project done ✓ To add it to your validated projects, scan the QR code when you meet.', 'Projet réalisé ✓ Pour qu’il compte dans tes projets validés, scannez le QR code quand vous vous voyez.')
          : tx('Noted. Waiting for your buddy to confirm too.', 'C’est noté. On attend que ton buddy confirme aussi.'),
      });
      if (user) loadCollabs(user.id);
    } catch (e) {
      console.error('mark-done', e);
      setDoneMessage({ id: collab.id, text: tx('Could not save, try again.', 'Impossible d’enregistrer, réessaie.') });
    }
    setMarkingDone(null);
  }

  function DoneButton({ collab }) {
    const mine = collab.sender_id === user?.id ? collab.done_by_sender : collab.done_by_receiver;
    const validated = Boolean(collab.validated_at);
    const note = doneMessage?.id === collab.id ? doneMessage.text : null;

    // Validé = QR scanné, donc rencontre prouvée : c'est ça qui compte.
    if (validated) return (
      <p style={{ color: '#2ECC71', fontSize: '12px', fontWeight: '700', marginTop: '10px', textAlign: 'center' }}>
        🤝 {tx('Project validated', 'Projet validé')}
      </p>
    );

    // Réalisé = les deux l'ont dit. Le compteur, lui, attend le QR.
    if (collab.done_by_sender && collab.done_by_receiver) return (
      <div style={{ marginTop: '10px', textAlign: 'center' }}>
        <p style={{ color: theme?.color, fontSize: '12px', fontWeight: '700' }}>
          ✓ {tx('Project done', 'Projet réalisé')}
        </p>
        <p style={{ color: subText, fontSize: '11px', marginTop: '4px', lineHeight: 1.4 }}>
          {tx('Scan the QR code when you meet so it counts in your validated projects.', 'Scannez le QR code quand vous vous voyez pour qu’il compte dans vos projets validés.')}
        </p>
      </div>
    );

    return (
      <>
        <button
          onClick={() => markDone(collab)}
          disabled={markingDone === collab.id || mine}
          style={{
            width: '100%', marginTop: '8px', padding: '9px', borderRadius: '20px',
            border: `1px solid ${cardBorder}`, background: 'transparent',
            color: mine ? subText : theme?.color, fontWeight: '700', fontSize: '12px',
            cursor: mine ? 'default' : 'pointer',
          }}
        >
          {markingDone === collab.id
            ? '…'
            : mine
            ? tx('Waiting for your buddy', 'En attente de ton buddy')
            : tx('✓ Mark as done', '✓ Marquer comme réalisé')}
        </button>
        {note && <p style={{ color: subText, fontSize: '11px', marginTop: '6px', textAlign: 'center', lineHeight: 1.4 }}>{note}</p>}
      </>
    );
  }

  async function loadOffers(userId) {
    const { data: allRaw } = await supabase.from('offers').select('*').neq('user_id', userId).order('created_at', { ascending: false });
    // Les projets des personnes bloquées ne remontent pas dans le feed.
    const blocked = await loadBlockedIds(userId);
    const all = (allRaw || []).filter(o => !blocked.has(o.user_id));
    const { data: mine } = await supabase.from('offers').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (all) {
      const userIds = all.map(o => o.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, handle, avatar_url, role, role_other').in('user_id', userIds);
      setOffers(all.map(o => ({ ...o, authorProfile: profiles?.find(p => p.user_id === o.user_id) })));
    }
    if (mine) setMyOffers(mine);
    // Après les projets, pas avant : sinon la requête des auteurs se déroulait
    // avec une liste encore vide et « aucun projet » clignotait entre les deux.
    setFirstLoad(false);
  }

  async function openOfferCandidates(offer) {
    setSelectedOffer(offer);
    setLoadingCandidates(true);
    const { data: found } = await supabase.from('collabs')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('offer_id', offer.id)
      .order('created_at', { ascending: false });
    const collabs = found || [];
    if (collabs.length > 0) {
      const senderIds = collabs.map(c => c.sender_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, handle, role, role_other, avatar_url, styles, zone, bio, portfolio_urls, portfolio_url, is_early_adopter').in('user_id', senderIds);
      setOfferCandidates(collabs.map(c => ({ ...c, senderProfile: profiles?.find(p => p.user_id === c.sender_id) })));
    } else setOfferCandidates([]);
    setLoadingCandidates(false);
  }

  async function closeOffer(offerId) {
    setActionError('');
    // Par le serveur : fermer un projet doit aussi prévenir ceux qui attendent
    // encore une réponse, et seule une route serveur peut écrire aux gens.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/close-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ offerId }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch (e) {
      console.error('closeOffer', e);
      setActionError(tx("Couldn't close the project. Try again.", 'La fermeture du projet a échoué. Réessaie.'));
      return;
    }
    loadOffers(user.id);
    loadCollabs(user.id);
  }

  async function reopenOffer(offerId) {
    setActionError('');
    const { error } = await supabase.from('offers').update({ status: 'open' }).eq('id', offerId);
    if (error) {
      console.error('reopenOffer', error);
      setActionError(tx("Couldn't reopen the project. Try again.", "La réouverture du projet a échoué. Réessaie."));
      return;
    }
    loadOffers(user.id);
  }

  // Suppression définitive (passe par le serveur, qui vérifie que le projet est bien à toi)
  async function deleteOffer(offerId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/delete-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ offerId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    } catch (e) {
      console.error('delete-offer', e);
      alert(tx('Could not delete the project, try again.', 'Impossible de supprimer le projet, réessaie.'));
      return;
    }
    setEditingOffer(null);
    setSelectedOffer(null);
    loadOffers(user.id);
    loadCollabs(user.id);
  }

  // Le prix est fixé par le serveur (1 jour · 1,99 € / 7 jours · 4,99 €)
  async function boostOffer(offer, days) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ offerId: offer.id, boostDays: days }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'checkout');
    } catch (err) {
      alert(tx('Payment error, try again.', 'Erreur de paiement, réessaie.'));
    }
  }

  async function handleSaveOffer(fields) {
    setActionError('');
    if (editingOffer) {
      const { error } = await supabase.from('offers').update(fields).eq('id', editingOffer.id);
      if (error) {
        console.error('updateOffer', error);
        setActionError(tx("Couldn't save the project. Try again.", "L’enregistrement du projet a échoué. Réessaie."));
        return;
      }
      setEditingOffer(null);
    } else {
      const { error } = await supabase.from('offers').insert({ user_id: user.id, ...fields, status: 'open' });
      if (error) {
        console.error('insertOffer', error);
        setActionError(tx("Couldn't create the project. Try again.", "La création du projet a échoué. Réessaie."));
        return;
      }
      setShowNewOffer(false);
    }
    loadOffers(user.id);
  }

  // Retirer sa candidature, tant qu'elle est en attente. Le serveur revérifie
  // qui demande et dans quel état est la candidature : la vérification ne peut
  // pas vivre seulement dans l'app.
  async function withdrawApplication(collabId, offerId, status = 'pending', note = '', toUserId = null) {
    if (!collabId || withdrawing) return;
    setWithdrawing(collabId);

    // La conversation est déjà ouverte avec la personne : on ne disparaît pas
    // sans un mot. Le message part avant le désistement, pour qu'il arrive même
    // si la suite échoue.
    if (status === 'accepted' && note && toUserId && user?.id) {
      try {
        await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: toUserId,
          content: note,
        });
      } catch (e) {
        console.error('withdraw message', e);
      }
    }

    setActionError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/withdraw-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ collabId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      if (offerId) {
        setAppliedOffers(prev => {
          const next = new Map(prev);
          next.delete(String(offerId));
          return next;
        });
      }
      if (user?.id) { loadCollabs(user.id); loadApplied(user.id); }
    } catch (e) {
      console.error('withdrawApplication', e);
      setActionError(tx("Couldn't withdraw. Try again.", 'Le retrait a échoué. Réessaie.'));
    }
    setWithdrawing(null);
    setWithdrawSheet(null);
  }

  async function applyToOffer(o, note = '', roleApplied = '') {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    setActionError('');
    tap();
    // Le message est maintenant celui de la personne. Le titre n'y est plus
    // recopié : c'est offer_id qui relie la candidature au projet, et le mot
    // sert à se distinguer des autres candidats.
    const written = String(note || '').trim().slice(0, APPLY_NOTE_MAX);
    const { data: collab, error } = await supabase.from('collabs').insert({
      sender_id: u.id,
      receiver_id: o.user_id,
      offer_id: o.id,
      role_applied: roleApplied || null,
      message: written || tx('I would like to join this project.', 'Je me propose pour ce projet.'),
      status: 'pending'
    }).select('id').single();
    // Sans cette vérification, le bouton passait à « Déjà candidaté » même
    // quand rien n'était enregistré : la personne ne retentait jamais.
    if (error) {
      console.error('applyToOffer', error);
      setActionError(tx("Couldn't send your application. Try again.", "L’envoi de ta candidature a échoué. Réessaie."));
      return;
    }
    setAppliedOffers(prev => new Map(prev).set(String(o.id), { id: collab?.id, status: 'pending' }));

    // Prévient le porteur du projet (et non plus le candidat lui-même)
    if (collab?.id) sendEmail('new_application', { collabId: collab.id });
  }

  async function respondCollab(id, status, senderId) {
    setActionError('');
    // La réponse passe par le serveur : c'est lui qui prend la place sur le
    // projet, le déclare pourvu quand la dernière est prise, et prévient d'un
    // seul coup les candidats encore en attente. Fait depuis l'app, rien de
    // tout ça n'était possible.
    let result = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/respond-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ collabId: id, decision: status }),
      });
      result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(
          result?.error === 'complet' || result?.error === 'place prise'
            ? tx('That spot has just been taken.', 'Cette place vient d’être prise.')
            : tx("Couldn't send your reply. Try again.", 'L’envoi de ta réponse a échoué. Réessaie.'),
        );
        loadOffers(user.id);
        loadCollabs(user.id);
        return;
      }
    } catch (e) {
      console.error('respondCollab', e);
      setActionError(tx("Couldn't send your reply. Try again.", 'L’envoi de ta réponse a échoué. Réessaie.'));
      return;
    }

    if (status === 'accepted' && user && senderId) {
      tap(28);
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: senderId,
        content: tx("⚡ Let's create something beautiful together! When shall we meet?", '⚡ Créons quelque chose de beau ensemble ! On se retrouve quand ?')
      });

      // Ouvre directement la conversation avec la personne acceptée
      const profile = received.find(c => c.id === id)?.senderProfile
        || offerCandidates.find(c => c.id === id)?.senderProfile
        || { user_id: senderId };
      setSelectedOffer(null);
      setChatBuddy(profile);
    }
    loadOffers(user.id);
    loadCollabs(user.id);
  }

  async function openOfferCandidates(offer) {
    setSelectedOffer(offer);
    setLoadingCandidates(true);
    const { data: found } = await supabase.from('collabs')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('offer_id', offer.id)
      .order('created_at', { ascending: false });
    const collabs = found || [];
    if (collabs.length > 0) {
      const senderIds = collabs.map(c => c.sender_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, handle, role, role_other, avatar_url, styles, zone, bio, portfolio_urls, portfolio_url, is_early_adopter').in('user_id', senderIds);
      setOfferCandidates(collabs.map(c => ({ ...c, senderProfile: profiles?.find(p => p.user_id === c.sender_id) })));
    } else setOfferCandidates([]);
    setLoadingCandidates(false);
  }

  async function closeOffer(offerId) {
    setActionError('');
    const { error } = await supabase.from('offers').update({ status: 'closed' }).eq('id', offerId);
    if (error) {
      console.error('closeOffer', error);
      setActionError(tx("Couldn't close the project. Try again.", "La fermeture du projet a échoué. Réessaie."));
      return;
    }
    loadOffers(user.id);
  }

  async function reopenOffer(offerId) {
    setActionError('');
    const { error } = await supabase.from('offers').update({ status: 'open' }).eq('id', offerId);
    if (error) {
      console.error('reopenOffer', error);
      setActionError(tx("Couldn't reopen the project. Try again.", "La réouverture du projet a échoué. Réessaie."));
      return;
    }
    loadOffers(user.id);
  }

  // Suppression définitive (passe par le serveur, qui vérifie que le projet est bien à toi)
  async function deleteOffer(offerId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/delete-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ offerId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    } catch (e) {
      console.error('delete-offer', e);
      alert(tx('Could not delete the project, try again.', 'Impossible de supprimer le projet, réessaie.'));
      return;
    }
    setEditingOffer(null);
    setSelectedOffer(null);
    loadOffers(user.id);
    loadCollabs(user.id);
  }

  // Le prix est fixé par le serveur (1 jour · 1,99 € / 7 jours · 4,99 €)
  async function boostOffer(offer, days) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ offerId: offer.id, boostDays: days }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'checkout');
    } catch (err) {
      alert(tx('Payment error, try again.', 'Erreur de paiement, réessaie.'));
    }
  }

  async function handleSaveOffer(fields) {
    setActionError('');
    if (editingOffer) {
      const { error } = await supabase.from('offers').update(fields).eq('id', editingOffer.id);
      if (error) {
        console.error('updateOffer', error);
        setActionError(tx("Couldn't save the project. Try again.", "L’enregistrement du projet a échoué. Réessaie."));
        return;
      }
      setEditingOffer(null);
    } else {
      const { error } = await supabase.from('offers').insert({ user_id: user.id, ...fields, status: 'open' });
      if (error) {
        console.error('insertOffer', error);
        setActionError(tx("Couldn't create the project. Try again.", "La création du projet a échoué. Réessaie."));
        return;
      }
      setShowNewOffer(false);
    }
    loadOffers(user.id);
  }

  // Retirer sa candidature, tant qu'elle est en attente. Le serveur revérifie
  // qui demande et dans quel état est la candidature : la vérification ne peut
  // pas vivre seulement dans l'app.
  async function withdrawApplication(collabId, offerId) {
    if (!collabId || withdrawing) return;
    setWithdrawing(collabId);
    setActionError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/withdraw-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ collabId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      if (offerId) {
        setAppliedOffers(prev => {
          const next = new Map(prev);
          next.delete(String(offerId));
          return next;
        });
      }
      if (user?.id) { loadCollabs(user.id); loadApplied(user.id); }
    } catch (e) {
      console.error('withdrawApplication', e);
      setActionError(tx("Couldn't withdraw. Try again.", 'Le retrait a échoué. Réessaie.'));
    }
    setWithdrawing(null);
  }

  async function applyToOffer(o, note = '') {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    setActionError('');
    tap();
    // Le message est maintenant celui de la personne. Le titre n'y est plus
    // recopié : c'est offer_id qui relie la candidature au projet, et le mot
    // sert à se distinguer des autres candidats.
    const written = String(note || '').trim().slice(0, APPLY_NOTE_MAX);
    const { data: collab, error } = await supabase.from('collabs').insert({
      sender_id: u.id,
      receiver_id: o.user_id,
      offer_id: o.id,
      message: written || tx('I would like to join this project.', 'Je me propose pour ce projet.'),
      status: 'pending'
    }).select('id').single();
    // Sans cette vérification, le bouton passait à « Déjà candidaté » même
    // quand rien n'était enregistré : la personne ne retentait jamais.
    if (error) {
      console.error('applyToOffer', error);
      setActionError(tx("Couldn't send your application. Try again.", "L’envoi de ta candidature a échoué. Réessaie."));
      return;
    }
    setAppliedOffers(prev => new Map(prev).set(String(o.id), { id: collab?.id, status: 'pending' }));

    // Prévient le porteur du projet (et non plus le candidat lui-même)
    if (collab?.id) sendEmail('new_application', { collabId: collab.id });
  }

  async function respondCollab(id, status, senderId) {
    setActionError('');
    const { error } = await supabase.from('collabs').update({ status }).eq('id', id);
    if (error) {
      console.error('respondCollab', error);
      setActionError(tx("Couldn't send your reply. Try again.", "L’envoi de ta réponse a échoué. Réessaie."));
      return;
    }
    if (status === 'accepted' && user && senderId) {
      tap(28);
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: senderId,
        content: tx("⚡ Let's create something beautiful together! When shall we meet?", '⚡ Créons quelque chose de beau ensemble ! On se retrouve quand ?')
      });

      // Prévient le candidat accepté (et non plus la personne qui accepte)
      sendEmail('application_accepted', { collabId: id });

      // Ouvre directement la conversation avec la personne acceptée
      const profile = received.find(c => c.id === id)?.senderProfile
        || offerCandidates.find(c => c.id === id)?.senderProfile
        || { user_id: senderId };
      setSelectedOffer(null);
      setChatBuddy(profile);
    }
    loadCollabs(user.id);
  }

  function getMatchScore(offer) {
    if (!myProfile) return 0;
    let score = 0;
    if (offer.role_needed && myProfile.role) {
      const wanted = offer.role_needed.split(',').map(r => r.trim());
      const mine = splitRoles(myProfile.role);
      if (wanted.some(r => mine.includes(r))) score += 3;
    }
    if (offer.styles_needed && myProfile.styles) {
      const os = offer.styles_needed.toLowerCase().split(',').map(s => s.trim());
      const ms = myProfile.styles.toLowerCase().split(',').map(s => s.trim());
      score += os.filter(s => ms.includes(s)).length;
    }
    return score;
  }

  let displayedOffers = [...offers];
  if (sharedOffer && !displayedOffers.some(o => o.id === sharedOffer.id)) {
    displayedOffers = [sharedOffer, ...displayedOffers];
  }
  // Le feed ne montre que ce à quoi on peut encore se proposer : ni les projets
  // dont la date est passée, ni ceux que leur auteur a fermés. Celui qu'on vient
  // d'ouvrir par un lien reste affiché : la personne a cliqué exprès, mieux vaut
  // lui montrer le projet marqué « passé » qu'une page vide.
  displayedOffers = displayedOffers.filter(o =>
    (o.status !== 'closed' && !isPast(o))
    || (sharedOffer && o.id === sharedOffer.id)
    // Un projet qu'on a mis de côté reste visible dans sa liste même s'il s'est
    // fermé depuis : on veut savoir ce qu'il est devenu, pas le voir disparaître
    // sans un mot.
    || (filterSaved && savedIds.has(String(o.id))),
  );
  if (filterSaved) displayedOffers = displayedOffers.filter(o => savedIds.has(String(o.id)));
  if (filterRole) displayedOffers = displayedOffers.filter(o => o.role_needed?.includes(filterRole));
  if (filterUnivers) {
    const filterFR = isEn ? (() => { try { const { UNIVERS_FR: fr, UNIVERS_EN: en } = require('../constants'); const i = en.indexOf(filterUnivers); return i >= 0 ? fr[i] : filterUnivers; } catch { return filterUnivers; } })() : filterUnivers;
    displayedOffers = displayedOffers.filter(o => (o.styles_needed || '').toLowerCase().includes(filterFR.toLowerCase()));
  }
  // La recherche cherche dans la ville, le pays, le titre, la description, et
  // dans le pseudo comme dans le nom de l'auteur : on cherche souvent « le
  // projet de @keyliagkn ».
  //
  // Les accents sont ignorés des deux côtés. Sans ça, « bresil » ne trouvait
  // pas « Brésil » et « cinema » ne trouvait pas un projet dont la description
  // parlait de cinéma : il fallait taper les accents au clavier du téléphone,
  // ce que personne ne fait dans une barre de recherche.
  if (filterZone) {
    const brut = filterZone.replace(/^@/, '').trim();
    const q = normalizeSearch(brut);
    if (q) {
      displayedOffers = displayedOffers.filter(o => {
        const author = o.authorProfile || {};
        const champs = [
          o.zone,
          o.title,
          o.description,
          author.username,
          String(author.handle || '').replace(/^@/, ''),
        ];
        if (champs.some(v => normalizeSearch(v).includes(q))) return true;
        // Le pays est comparé à part : il n'est pas écrit dans le projet, il
        // est déduit de sa ville, et son nom dépend de la langue du téléphone.
        return countryMatches(o.country, brut, getLang());
      });
    }
  }
  if (sortBy === 'match') displayedOffers = displayedOffers.sort((a, b) => {
    if (sharedOffer) {
      if (a.id === sharedOffer.id) return -1;
      if (b.id === sharedOffer.id) return 1;
    }
    const boostedA = a.boosted_until && new Date(a.boosted_until) > new Date() ? 1 : 0;
    const boostedB = b.boosted_until && new Date(b.boosted_until) > new Date() ? 1 : 0;
    if (boostedB !== boostedA) return boostedB - boostedA;
    return getMatchScore(b) - getMatchScore(a);
  });

  // Un projet passé, toujours ouvert : on demande à son auteur ce qu'il devient.
  // Une seule question à la fois, sinon on transforme l'ouverture de l'app en corvée.
  const followUpOffer = needsFollowUp(myOffers).filter(o => !skippedPast.has(o.id))[0] || null;

  // « Oui, c'est fait » ferme le projet et renvoie vers l'onglet 🤝, où la
  // validation se fait à deux. On ne touche pas au compteur ici : un projet ne
  // compte que quand les deux buddies ont confirmé.
  async function followUpDone(offer) {
    await closeOffer(offer.id);
    setSkippedPast(skipFollowUp(offer.id));   // la question est réglée, on ne la repose pas
    setFollowUpNote(tx(
      'Now confirm it with your buddy in the 🤝 tab. It counts in your validated projects once you scan the QR code together.',
      'Confirme-le avec ton buddy dans l’onglet 🤝. Il comptera dans tes projets validés quand vous aurez scanné le QR ensemble.',
    ));
    setTab('match');
  }

  const statusBadge = (status) => {
    if (status === 'accepted') return { label: tx('Accepted ✓', 'Accepté ✓'), color: '#2ECC71' };
    if (status === 'declined') return { label: tx('Not selected', 'Non retenu'), color: '#FFB020' };
    return { label: tx('Pending', 'En attente'), color: '#FFD700' };
  };

  // Propositions reçues qui attendent une réponse (pastille sur l'onglet 🤝)
  const pendingReceived = received.filter(c => c.status === 'pending').length;

  const tabStyle = (active) => ({
    flex: 1, padding: '10px', border: 'none', background: 'transparent',
    color: active ? theme?.color : subText,
    fontWeight: active ? '800' : '600', fontSize: '14px', cursor: 'pointer',
    borderBottom: `2px solid ${active ? theme?.color : 'transparent'}`,
    transition: 'all 0.2s',
  });

  const pillStyle = (active) => ({
    padding: '6px 12px', borderRadius: '20px', flexShrink: 0,
    border: `1px solid ${active ? theme?.color : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')}`,
    background: active ? theme?.color : 'transparent',
    color: active ? theme?.bg : subText,
    fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
  });

  function MiniProfile({ profile, onViewFull }) {
    if (!profile) return null;
    const portfolio = profile.portfolio_urls || [];
    return (
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div onClick={onViewFull ? () => onViewFull(profile) : undefined}
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#CCC', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: onViewFull ? 'pointer' : 'default' }}>
            {profile.avatar_url ? <Thumb src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: '700', fontSize: '14px', color: theme?.color }}>{profile.username}</p>
            <p style={{ fontSize: '11px', color: subText }}>{roleLabels(profile.role, ROLES, profile.role_other)}{profile.zone ? ` · ${profile.zone}` : ''}</p>
          </div>
          {onViewFull && (
            <button onClick={() => onViewFull(profile)} style={{ background: 'none', border: `1px solid ${cardBorder}`, color: subText, borderRadius: '12px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer', flexShrink: 0 }}>
              {tx('View profile', 'Voir profil')}
            </button>
          )}
        </div>
        {profile.bio && <p style={{ fontSize: '12px', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontStyle: 'italic', marginBottom: '8px', lineHeight: 1.4 }}>« {profile.bio} »</p>}
        {profile.styles && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {profile.styles.split(',').map(s => s.trim()).filter(Boolean).map(s => (
              <span key={s} style={{ fontSize: '10px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '2px 8px' }}>{s}</span>
            ))}
          </div>
        )}
        {portfolio.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {portfolio.map((url, i) => (
              <img
                key={i} src={url} alt=""
                onClick={() => setViewer({ photos: portfolio, index: i })}
                style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // On partage aussi les projets des autres : la carte doit porter le nom de
  // l'auteur du projet, pas celui de la personne qui partage. authorProfile est
  // absent sur mes propres projets, d'où le repli sur mon profil.
  if (sharingOffer) return (
    <ShareCard
      offer={sharingOffer}
      profile={sharingOffer.authorProfile || myProfile}
      onClose={() => setSharingOffer(null)}
    />
  );

  if (chatBuddy) return (
    <ChatScreen buddy={chatBuddy} onBack={() => { setChatBuddy(null); if (user) loadCollabs(user.id); }} theme={theme} />
  );

  if (viewingBuddy) return (
    <BuddyProfileScreen buddy={viewingBuddy} onBack={() => setViewingBuddy(null)} theme={theme} />
  );

  if (qrCollab) return <QRScreen collab={qrCollab} user={user} myProfile={myProfile} theme={theme} onBack={() => setQrCollab(null)} />;

  if (showNewOffer) return (
    <OfferForm theme={theme} isEdit={false} editingOffer={null} onClose={() => setShowNewOffer(false)} onSave={handleSaveOffer} onCloseOffer={null} />
  );

  if (editingOffer) return (
    <OfferForm theme={theme} isEdit={true} editingOffer={editingOffer} onClose={() => setEditingOffer(null)} onSave={handleSaveOffer} onCloseOffer={async () => { await closeOffer(editingOffer.id); setEditingOffer(null); }} onReopenOffer={async () => { await reopenOffer(editingOffer.id); setEditingOffer(null); }} onDeleteOffer={() => deleteOffer(editingOffer.id)} />
  );

  if (selectedOffer) return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top) + 16px) 16px 16px', borderBottom: `1px solid ${cardBorder}`, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => setSelectedOffer(null)} aria-label={tx('Back', 'Retour')} style={{ background: 'none', border: 'none', color: theme?.color, fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: '800', fontSize: '15px', color: theme?.color }}>{selectedOffer.title}</p>
          <p style={{ fontSize: '11px', color: subText }}>{offerCandidates.length} {tx('proposal(s)', 'proposition(s)')}</p>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px calc(110px + env(safe-area-inset-bottom))' }}>
        {loadingCandidates ? (
          <p style={{ color: subText, textAlign: 'center', marginTop: '40px' }}>...</p>
        ) : offerCandidates.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>📭</p>
            <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>{tx('No proposals yet', 'Pas encore de propositions')}</p>
            <p style={{ color: subText, fontSize: '13px' }}>{tx('Share your project to get proposals!', 'Partage ton projet pour recevoir des propositions !')}</p>
          </div>
        ) : (
          offerCandidates.map(c => (
            <div key={c.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: statusBadge(c.status).color, fontWeight: '700' }}>{statusBadge(c.status).label}</span>
                <span style={{ fontSize: '10px', color: subText }}>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <MiniProfile profile={c.senderProfile} onViewFull={(p) => setViewingBuddy(p)} />
              {c.message && (
                <p style={{ color: subText, fontSize: '12px', fontStyle: 'italic', borderLeft: `2px solid ${cardBorder}`, paddingLeft: '8px', marginBottom: '12px' }}>{c.message}</p>
              )}
              {c.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { respondCollab(c.id, 'accepted', c.sender_id); setSelectedOffer(null); }} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: '#2ECC71', color: '#000', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t.accept}</button>
                  <button onClick={() => { respondCollab(c.id, 'declined', null); openOfferCandidates(selectedOffer); }} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #FF4D4D', background: 'transparent', color: '#FF4D4D', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t.decline}</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: theme?.bg, color: theme?.color, position: 'relative' }}>
      <Header theme={theme} />

      <div style={{ display: 'flex', borderBottom: `1px solid ${cardBorder}`, flexShrink: 0 }}>
        <button style={tabStyle(tab === 'offres')} onClick={() => setTab('offres')}>{t.offers}</button>
        <button style={tabStyle(tab === 'match')} onClick={() => setTab('match')}>
          {t.matchTab}
          {pendingReceived > 0 && (
            <span style={{ marginLeft: '6px', background: '#FF4D4D', color: 'white', borderRadius: '10px', minWidth: '18px', height: '18px', padding: '0 5px', fontSize: '10px', fontWeight: '900', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}>
              {pendingReceived > 9 ? '9+' : pendingReceived}
            </span>
          )}
        </button>
      </div>

      <div ref={scrollBoxRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 16px calc(110px + env(safe-area-inset-bottom))', position: 'relative' }}>
        <PullIndicator pull={pull} refreshing={refreshing} trigger={trigger} darkMode={darkMode} />

        {followUpNote && (
          <div onClick={() => setFollowUpNote('')} style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.35)', borderRadius: '14px', padding: '12px 14px', marginBottom: '16px', color: theme?.color, fontSize: '12px', fontWeight: '600', lineHeight: 1.5, cursor: 'pointer' }}>
            {followUpNote}
          </div>
        )}

        {tab === 'offres' && (
          <>
            <button onClick={() => setShowNewOffer(true)} style={{ width: '100%', padding: '14px', borderRadius: '14px', marginBottom: '16px', border: `1.5px dashed ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: 'transparent', color: theme?.color, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {t.postOffer}
            </button>

            {/* La date est passée : qu'est-ce que ce projet devient ? */}
            {followUpOffer && (
              <div style={{ background: card, border: '1px solid rgba(240,180,41,0.5)', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: '800', color: theme?.color, marginBottom: '4px' }}>
                  ⏳ « {followUpOffer.title} » {tx('is past', 'est passé')}
                </p>
                <p style={{ fontSize: '12px', color: subText, marginBottom: '12px', lineHeight: 1.5 }}>
                  {tx('It is no longer in the feed. Did it happen?', 'Il n’est plus dans le feed. Il a été réalisé ?')}
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button onClick={() => followUpDone(followUpOffer)} style={{ flex: '1 1 40%', padding: '9px', borderRadius: '20px', border: 'none', background: '#2ECC71', color: '#000', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    {tx('✅ Yes, it happened', '✅ Oui, réalisé')}
                  </button>
                  <button onClick={() => setEditingOffer(followUpOffer)} style={{ flex: '1 1 40%', padding: '9px', borderRadius: '20px', border: `1px solid ${cardBorder}`, background: 'transparent', color: theme?.color, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    {tx('🔁 New date', '🔁 Nouvelle date')}
                  </button>
                  <button onClick={() => setSkippedPast(skipFollowUp(followUpOffer.id))} style={{ flex: '1 1 100%', padding: '7px', borderRadius: '20px', border: 'none', background: 'transparent', color: subText, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                    {tx('Later', 'Plus tard')}
                  </button>
                </div>
              </div>
            )}

            {myOffers.length > 0 && (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>{t.myOffers}</p>
                {myOffers.map(o => {
                  const isBoosted = o.boosted_until && new Date(o.boosted_until) > new Date();
                  const past = isPast(o);
                  return (
                    <div key={o.id} onClick={() => openOfferCandidates(o)} style={{ background: card, border: `1px solid ${isBoosted ? '#F0B429' : cardBorder}`, borderRadius: '14px', padding: '14px', marginBottom: '10px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            {isBoosted && <span style={{ fontSize: '10px', background: 'linear-gradient(135deg, #F0B429, #FF6B35)', color: '#000', borderRadius: '8px', padding: '1px 6px', fontWeight: '700' }}>🚀 Boosté</span>}
                            <p style={{ fontWeight: '800', color: theme?.color }}>{o.title}</p>
                          </div>
                          {o.role_needed && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                              {o.role_needed.split(',').map(r => r.trim()).filter(Boolean).map(r => {
                                const role = ROLES.find(x => x.id === r);
                                return <span key={r} style={{ fontSize: '11px', color: subText }}>{role?.icon} {role?.label || r}</span>;
                              })}
                            </div>
                          )}
                          {o.zone && <span style={{ fontSize: '11px', color: subText }}> · {o.zone}</span>}
                          {o.date && <span style={{ fontSize: '11px', color: subText }}> · {offerDateLabel(o.date)}</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: past ? '#F0B429' : o.status === 'open' ? '#2ECC71' : subText, fontWeight: '700' }}>
                            {past ? (tx('⏳ Past', '⏳ Passé')) : o.status === 'open' ? (tx('Open', 'Ouvert')) : (tx('Closed', 'Fermé'))}
                          </span>
                          <span style={{ fontSize: '10px', color: subText }}>
                            {tx('See proposals →', 'Voir propositions →')}
                          </span>
                          <button onClick={e => { e.stopPropagation(); setEditingOffer(o); }} style={{ background: 'none', border: `1px solid ${cardBorder}`, color: theme?.color, borderRadius: '12px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                            ✏️ {tx('Edit', 'Modifier')}
                          </button>
                          <button onClick={e => { e.stopPropagation(); setSharingOffer(o); }} style={{ background: 'none', border: `1px solid ${cardBorder}`, color: subText, borderRadius: '12px', padding: '3px 8px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>
                            📸 {tx('Share', 'Partager')}
                          </button>
                          {/* Pas de boost sur un projet passé : on ne fait pas payer une mise en avant qui ne servira à personne. */}
                          {o.status === 'open' && !isBoosted && !past && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={e => { e.stopPropagation(); boostOffer(o, 1, 199); }} style={{ background: 'linear-gradient(135deg, #F0B429, #FF6B35)', border: 'none', color: '#000', borderRadius: '12px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                                🚀 1j 1,99€
                              </button>
                              <button onClick={e => { e.stopPropagation(); boostOffer(o, 7, 499); }} style={{ background: 'linear-gradient(135deg, #F0B429, #FF6B35)', border: 'none', color: '#000', borderRadius: '12px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                                🚀 7j 4,99€
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginBottom: '16px' }} />
              </>
            )}

            <div style={{ marginBottom: '12px' }}>
              <input value={filterZone} onChange={e => setFilterZone(e.target.value)}
                placeholder={tx('🔎 City, country, @handle, project...', '🔎 Ville, pays, @pseudo, projet...')}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '20px', border: `1px solid ${cardBorder}`, background: inputBg, color: theme?.color, fontSize: '12px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                <button onClick={() => setSortBy('match')} style={pillStyle(sortBy === 'match')}>⚡ {tx('For you', 'Pour toi')}</button>
                <button onClick={() => setSortBy('recent')} style={pillStyle(sortBy === 'recent')}>🕐 {tx('Recent', 'Récent')}</button>
                <button onClick={() => setFilterSaved(v => !v)} style={pillStyle(filterSaved)}>
                  🔖 {tx('Saved', 'Enregistrés')}{savedIds.size > 0 ? ` ${savedIds.size}` : ''}
                </button>
                {ROLES.slice(0, 6).map(r => (
                  <button key={r.id} onClick={() => setFilterRole(filterRole === r.id ? null : r.id)} style={pillStyle(filterRole === r.id)}>{r.icon} {r.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {UNIVERS.map(s => (
                  <button key={s} onClick={() => setFilterUnivers(filterUnivers === s ? null : s)} style={pillStyle(filterUnivers === s)}>{s}</button>
                ))}
              </div>
            </div>

            {displayedOffers.length > 0 ? (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>
                  {sortBy === 'match' ? (tx('MATCHING YOUR PROFILE', 'CORRESPOND À TON UNIVERS')) : t.offersNow}
                </p>
                {displayedOffers.map(o => {
                  const isShared = sharedOffer && o.id === sharedOffer.id;
                  const score = getMatchScore(o);
                  const isBoosted = o.boosted_until && new Date(o.boosted_until) > new Date();
                  const offerSlots = slotsOf(o);
                  const offerFilled = filledOf(o);
                  const offerIsFilled = isFilled(o);
                  const myApplication = appliedOffers.get(String(o.id));
                  const hasApplied = !!myApplication;
                  return (
                    <div key={o.id} style={{ background: card, border: `1px solid ${isShared ? '#F2E050' : isBoosted ? '#F0B429' : score > 0 && o.status === 'open' ? (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)') : cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '12px', opacity: o.status === 'closed' ? 0.7 : 1, boxShadow: isShared ? '0 0 24px rgba(242,224,80,0.18)' : 'none' }}>
                      {isShared && (
                        <p style={{ fontSize: '11px', fontWeight: '800', color: '#F2E050', marginBottom: '8px', letterSpacing: '0.5px' }}>
                          🔗 {tx('Shared project', 'Projet partagé')}
                        </p>
                      )}
                      {/* L'auteur est cliquable : on veut savoir qui propose avant de se proposer. */}
                      <div
                        onClick={() => o.authorProfile && setViewingBuddy(o.authorProfile)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: o.authorProfile ? 'pointer' : 'default' }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: darkMode ? '#2C2C2C' : '#CCC', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                          {o.authorProfile?.avatar_url ? <Thumb src={o.authorProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: '700', fontSize: '13px', color: theme?.color }}>
                            {o.authorProfile?.username || (tx('Creative', 'Créatif'))}
                            {o.authorProfile?.handle && (
                              <span style={{ color: subText, fontWeight: '600' }}>  {withAt(o.authorProfile.handle)}</span>
                            )}
                          </p>
                          <p style={{ fontSize: '11px', color: subText }}>{roleLabels(o.authorProfile?.role, ROLES, o.authorProfile?.role_other)}</p>
                        </div>
                        {isBoosted && <span style={{ fontSize: '10px', background: 'linear-gradient(135deg, #F0B429, #FF6B35)', color: '#000', borderRadius: '8px', padding: '2px 8px', fontWeight: '700' }}>🚀 Boost</span>}
                        {score > 0 && o.status === 'open' && !isBoosted && (
                          <div style={{ background: '#2ECC71', color: '#000', borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: '900' }}>
                            {score}✓ match
                          </div>
                        )}
                        {/* Mettre de côté. L'arrêt de la propagation est
                            indispensable : toute la ligne ouvre le profil de
                            l'auteur, et sans ça un clic sur le signet quittait
                            le fil. */}
                        <button
                          onClick={e => { e.stopPropagation(); toggleSaved(o.id); }}
                          disabled={savingOffer === String(o.id)}
                          aria-label={savedIds.has(String(o.id))
                            ? tx('Remove from saved', 'Retirer des enregistrés')
                            : tx('Save this project', 'Enregistrer ce projet')}
                          title={savedIds.has(String(o.id))
                            ? tx('Remove from saved', 'Retirer des enregistrés')
                            : tx('Save this project', 'Enregistrer ce projet')}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                            fontSize: '17px', lineHeight: 1, padding: '2px 0 2px 4px',
                            opacity: savedIds.has(String(o.id)) ? 1 : 0.4,
                          }}
                        >
                          {savedIds.has(String(o.id)) ? '🔖' : '🏷'}
                        </button>
                      </div>
                      <p style={{ fontWeight: '800', fontSize: '15px', color: theme?.color, marginBottom: '6px' }}>{o.title}</p>
                      {o.description && <p style={{ fontSize: '13px', color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', marginBottom: '10px', lineHeight: 1.4 }}>{o.description}</p>}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {o.role_needed && o.role_needed.split(',').map(r => r.trim()).filter(Boolean).map(r => {
                          const role = ROLES.find(x => x.id === r);
                          const isMyRole = hasRole(myProfile?.role, r);
                          // Les places prises, pour qu'on voie d'un coup d'œil
                          // ce qu'il reste. Avant, un projet déjà pourvu
                          // ressemblait exactement à un projet qui attend.
                          const total = offerSlots[r] || 1;
                          const pris = offerFilled[r] || 0;
                          const complet = pris >= total;
                          return (
                            <span key={r} style={{
                              fontSize: '11px',
                              color: complet ? subText : (isMyRole ? '#000' : theme?.color),
                              border: `1px solid ${cardBorder}`, borderRadius: '20px',
                              padding: '3px 10px', fontWeight: '700',
                              background: complet ? 'transparent' : (isMyRole ? '#2ECC71' : 'transparent'),
                              textDecoration: complet ? 'line-through' : 'none',
                            }}>
                              {role?.icon} {role?.label || r}
                              {total > 1 || pris > 0 ? ` ${pris}/${total}` : ''}
                            </span>
                          );
                        })}
                        {o.styles_needed && o.styles_needed.split(',').map(s => s.trim()).filter(Boolean).map(s => {
                          const isMyStyle = myProfile?.styles?.toLowerCase().includes(s.toLowerCase());
                          return <span key={s} style={{ fontSize: '11px', color: isMyStyle ? theme?.color : subText, border: `1px solid ${isMyStyle ? theme?.color : cardBorder}`, borderRadius: '20px', padding: '3px 10px', fontWeight: isMyStyle ? '700' : '400' }}>{s}</span>;
                        })}
                        {/* Le pays n'est affiché que s'il n'est pas le nôtre :
                            « Paris · France » pour quelqu'un en France est du
                            bruit, « Rio de Janeiro · Brésil » est l'information
                            qui décide si on peut y aller. */}
                        {o.zone && <span style={{ fontSize: '11px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px' }}>
                          📍 {o.zone}
                          {o.country && o.country !== myProfile?.country && countryName(o.country, getLang())
                            ? ` · ${countryName(o.country, getLang())}`
                            : ''}
                        </span>}
                        {/* Sans date, on le dit. Rester muet laissait croire que
                            l'information manquait par accident, et beaucoup
                            écrivaient leur date dans le texte du projet. */}
                        <span style={{ fontSize: '11px', color: o.date ? subText : '#FFB020', border: `1px solid ${o.date ? cardBorder : 'rgba(255,176,32,0.35)'}`, borderRadius: '20px', padding: '3px 10px' }}>
                          📅 {o.date ? offerDateLabel(o.date) : tx('Date to be decided', 'Date à définir')}
                        </span>
                        {/* Rien ne s'affiche pour les projets d'avant cette option :
                            mieux vaut ne rien dire que d'affirmer à leur place. */}
                        {o.paid === true && <span style={{ fontSize: '11px', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.4)', borderRadius: '20px', padding: '3px 10px', fontWeight: '700' }}>💶 {tx('Paid', 'Rémunéré')}</span>}
                        {o.paid === false && <span style={{ fontSize: '11px', color: subText, border: `1px solid ${cardBorder}`, borderRadius: '20px', padding: '3px 10px' }}>🤝 {tx('Unpaid collab', 'Collab non rémunérée')}</span>}
                      </div>
                      {isPast(o) ? (
                        <div style={{ width: '100%', padding: '10px', borderRadius: '20px', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: subText, fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
                          ⏳ {tx('This project is past', 'Ce projet est passé')}
                        </div>
                      ) : o.status === 'open' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Toutes les places prises : le projet le dit lui-même.
                              Avant, il restait identique à un projet qui attend
                              encore quelqu'un. */}
                          {offerIsFilled && !hasApplied ? (
                            <div style={{ width: '100%', padding: '10px', borderRadius: '20px', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: subText, fontSize: '13px', fontWeight: '700', textAlign: 'center' }}>
                              ✓ {tx('Team complete', 'Équipe au complet')}
                            </div>
                          ) : hasApplied ? (
                            <>
                              <div style={{ width: '100%', padding: '10px', borderRadius: '20px', background: 'rgba(46,204,113,0.1)', color: '#2ECC71', fontSize: '13px', fontWeight: '700', textAlign: 'center', border: '1px solid rgba(46,204,113,0.3)' }}>
                                {t.alreadyApplied}
                              </div>
                              {/* Tant que personne n'a répondu, on peut encore
                                  se retirer. Sans ça, une candidature envoyée
                                  par erreur restait pour toujours. */}
                              {myApplication?.id && (myApplication.status === 'pending' || myApplication.status === 'accepted') && (
                                <button
                                  onClick={() => {
                                    if (myApplication.status === 'accepted') {
                                      setWithdrawSheet({ id: myApplication.id, offerId: o.id, toUserId: o.user_id, title: o.title });
                                    } else {
                                      withdrawApplication(myApplication.id, o.id, 'pending');
                                    }
                                  }}
                                  disabled={withdrawing === myApplication.id}
                                  style={{ background: 'none', border: 'none', color: subText, fontSize: '11px', cursor: 'pointer', padding: '2px 0', margin: '0 auto', textDecoration: 'underline' }}
                                >
                                  {withdrawing === myApplication.id
                                    ? tx('Withdrawing...', 'Retrait...')
                                    : myApplication.status === 'accepted'
                                      ? tx('I can no longer do it', 'Je ne peux plus le faire')
                                      : tx('Withdraw my application', 'Retirer ma candidature')}
                                </button>
                              )}
                            </>
                          ) : (
                            <button onClick={() => setApplyingTo(o)} style={{ width: '100%', padding: '10px', borderRadius: '20px', border: 'none', background: theme?.color, color: theme?.bg, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                              {t.applyOffer}
                            </button>
                          )}
                          <button onClick={() => setSharingOffer(o)} style={{ width: '100%', padding: '8px', borderRadius: '20px', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`, background: 'transparent', color: subText, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            📸 {tx('Share on story', 'Partager en story')}
                          </button>
                          {o.user_id !== user?.id && (
                            <button
                              onClick={() => setReportingOffer(o.id)}
                              style={{ background: 'none', border: 'none', color: subText, fontSize: '11px', cursor: 'pointer', padding: '2px 0', margin: '0 auto' }}
                            >
                              🚩 {tx('Report this project', 'Signaler ce projet')}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ width: '100%', padding: '10px', borderRadius: '20px', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: subText, fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
                          {t.projectFull}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : firstLoad ? (
              <SkeletonList count={3} darkMode={darkMode} />
            ) : filterSaved ? (
              /* La liste des enregistrés est vide : proposer de créer un projet
                 serait hors sujet, ce n'est pas ce qu'on cherchait. */
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔖</p>
                <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>
                  {tx('No saved projects', 'Aucun projet enregistré')}
                </p>
                <p style={{ color: subText, fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
                  {tx(
                    'Tap the tag on a project to put it aside and find it here.',
                    'Appuie sur l’étiquette d’un projet pour le mettre de côté et le retrouver ici.',
                  )}
                </p>
                <button
                  onClick={() => setFilterSaved(false)}
                  style={{
                    padding: '11px 20px', borderRadius: '22px', cursor: 'pointer',
                    border: `1px solid ${cardBorder}`, background: 'transparent',
                    color: theme?.color, fontSize: '13px', fontWeight: '700',
                  }}
                >
                  {tx('Back to the feed', 'Revenir au fil')}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>🎨</p>
                <p style={{ color: theme?.color, fontWeight: '700', marginBottom: '4px' }}>{t.noOffers}</p>
                <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>{t.beFirst}</p>
                <button
                  onClick={() => setShowNewOffer(true)}
                  style={{
                    padding: '11px 20px', borderRadius: '22px', border: 'none', cursor: 'pointer',
                    background: theme?.color, color: theme?.bg, fontSize: '13px', fontWeight: '800',
                  }}
                >
                  ⚡ {tx('Post a project', 'Publier un projet')}
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'match' && (
          <>
            <p style={{ color: subText, fontSize: '12px', lineHeight: 1.5, marginBottom: '16px', padding: '10px 12px', borderRadius: '12px', background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
              {tx('Proposals you receive and send. Accept one to open the chat, then generate your QR code when you meet.', 'Les propositions reçues et envoyées. Accepte-en une pour ouvrir le chat, puis génère ton QR code le jour J.')}
            </p>
            {received.length > 0 && (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>{t.received}</p>
                {received.map(c => (
                  <div key={c.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: statusBadge(c.status).color, fontWeight: '700' }}>{statusBadge(c.status).label}</span>
                    </div>
                    <MiniProfile profile={c.senderProfile} onViewFull={(p) => setViewingBuddy(p)} />
                    <p style={{ color: subText, fontSize: '12px', fontStyle: 'italic', marginBottom: c.status === 'pending' || c.status === 'accepted' ? '12px' : '0', borderLeft: `2px solid ${cardBorder}`, paddingLeft: '8px' }}>{c.message || (tx('No message', 'Pas de message'))}</p>
                    {c.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => respondCollab(c.id, 'accepted', c.sender_id)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: '#2ECC71', color: '#000', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t.accept}</button>
                        <button onClick={() => respondCollab(c.id, 'declined', null)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #FF4D4D', background: 'transparent', color: '#FF4D4D', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t.decline}</button>
                      </div>
                    )}
                    {c.status === 'accepted' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => setChatBuddy(c.senderProfile || { user_id: c.sender_id })} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: theme?.color, color: theme?.bg, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                          💬 {tx('Message', 'Écrire')}
                        </button>
                        <button onClick={() => setQrCollab(c)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme?.color, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                          {t.generateQR}
                        </button>
                      </div>
                    )}
                    {c.status === 'accepted' && <DoneButton collab={c} />}
                    {/* Même sortie que depuis la carte du projet : tant que
                        personne n'a répondu, on peut se retirer. */}
                    {(c.status === 'pending' || c.status === 'accepted') && (
                      <button
                        onClick={() => {
                          if (c.status === 'accepted') {
                            setWithdrawSheet({ id: c.id, offerId: c.offer_id, toUserId: c.receiver_id, title: '' });
                          } else {
                            withdrawApplication(c.id, c.offer_id, 'pending');
                          }
                        }}
                        disabled={withdrawing === c.id}
                        style={{ background: 'none', border: 'none', color: subText, fontSize: '11px', cursor: 'pointer', padding: '8px 0 0', textDecoration: 'underline' }}
                      >
                        {withdrawing === c.id
                          ? tx('Withdrawing...', 'Retrait...')
                          : c.status === 'accepted'
                            ? tx('I can no longer do it', 'Je ne peux plus le faire')
                            : tx('Withdraw my application', 'Retirer ma candidature')}
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}

            {sent.length > 0 && (
              <>
                <p style={{ color: subText, fontSize: '11px', letterSpacing: '1px', marginBottom: '12px', marginTop: '16px' }}>{t.sent}</p>
                {sent.map(c => (
                  <div key={c.id} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: statusBadge(c.status).color, fontWeight: '700' }}>{statusBadge(c.status).label}</span>
                    </div>
                    <MiniProfile profile={c.receiverProfile} />
                    <p style={{ color: subText, fontSize: '12px', fontStyle: 'italic', marginBottom: c.status === 'accepted' ? '12px' : '0', borderLeft: `2px solid ${cardBorder}`, paddingLeft: '8px' }}>{c.message || (tx('No message', 'Pas de message'))}</p>
                    {c.status === 'accepted' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => setChatBuddy(c.receiverProfile || { user_id: c.receiver_id })} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: theme?.color, color: theme?.bg, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                          💬 {tx('Message', 'Écrire')}
                        </button>
                        <button onClick={() => setQrCollab(c)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme?.color, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                          {t.generateQR}
                        </button>
                      </div>
                    )}
                    {c.status === 'accepted' && <DoneButton collab={c} />}
                  </div>
                ))}
              </>
            )}

            {received.length === 0 && sent.length === 0 && (
              <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: '14px', padding: '20px', textAlign: 'center', marginTop: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤝</div>
                <p style={{ fontWeight: '700', marginBottom: '4px', color: theme?.color }}>{t.noMatch}</p>
                <p style={{ color: subText, fontSize: '13px', marginBottom: '16px' }}>{t.noMatchSub}</p>
                <button onClick={() => setTab('offres')} style={{ background: theme?.color, color: theme?.bg, border: 'none', borderRadius: '24px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' }}>{t.seeOffers}</button>
              </div>
            )}
          </>
        )}
      </div>
      {viewer && (
        <PhotoViewer photos={viewer.photos} startIndex={viewer.index} onClose={() => setViewer(null)} />
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

      {reportingOffer !== null && (
        <ReportSheet
          targetType="offer"
          targetId={reportingOffer}
          theme={theme}
          onClose={() => setReportingOffer(null)}
        />
      )}

      {withdrawSheet && (
        <WithdrawSheet
          offerTitle={withdrawSheet.title}
          theme={theme}
          onClose={() => setWithdrawSheet(null)}
          onConfirm={async note => {
            await withdrawApplication(
              withdrawSheet.id, withdrawSheet.offerId, 'accepted', note, withdrawSheet.toUserId,
            );
          }}
        />
      )}

      {applyingTo && (
        <ApplySheet
          offer={applyingTo}
          theme={theme}
          onClose={() => setApplyingTo(null)}
          myRoles={myProfile?.role || ''}
          onSend={async (note, roleApplied) => {
            const target = applyingTo;
            setApplyingTo(null);
            await applyToOffer(target, note, roleApplied);
          }}
        />
      )}
    </div>
  );
}
