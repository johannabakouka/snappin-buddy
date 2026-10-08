'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabase';

// L'écran de modération, pour la personne qui tient l'app.
//
// Il n'apparaît nulle part dans la navigation : on y vient par l'adresse
// /moderation, et c'est le serveur qui décide, pas cet écran. Cacher un bouton
// ne protège rien ; ici, une personne qui n'est pas l'administratrice reçoit un
// refus de l'API même si elle ouvre la page.
//
// Volontairement sobre et dense : son intérêt est qu'un signalement puisse être
// lu et traité en quelques secondes, depuis un téléphone, sans ouvrir Supabase.

type Report = {
  id: string;
  reporter_id: string | null;
  target_type: 'profile' | 'message' | 'offer';
  target_id: string;
  target_user_id: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'handled' | 'dismissed';
  action: string | null;
  handled_at: string | null;
  created_at: string;
};
type Profile = {
  user_id: string; username: string | null; handle: string | null;
  avatar_url: string | null; portfolio_urls: string[] | null;
  hidden: boolean | null; suspended_at: string | null;
};
// Une photo refusée par le contrôle automatique, à l'envoi. Ce n'est pas un
// signalement : rien n'est arrivé dans le stockage, et personne ne s'est
// plaint. Ce qui compte ici, c'est la répétition.
type Block = {
  id: number;
  user_id: string;
  context: string;
  scores: Record<string, number> | null;
  created_at: string;
};
type Message = { id: string; content: string | null; image_url: string | null; deleted: boolean | null };
type Offer = { id: string; title: string | null; description: string | null; status: string | null };

const REASONS: Record<string, string> = {
  inapproprie: 'Contenu inapproprié',
  faux_profil: 'Faux profil',
  spam: 'Spam',
  harcelement: 'Harcèlement',
  illegal: 'Contenu illégal',
  autre: 'Autre',
};

const CONTEXTES: Record<string, string> = {
  avatar: 'photo de profil',
  portfolio: 'portfolio',
  chat: 'conversation',
  autre: 'ailleurs',
};

const dim = { color: 'rgba(255,255,255,0.5)', fontSize: 13 } as const;
const card = {
  background: '#151515', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14, padding: 14, marginBottom: 12,
} as const;
const quote = {
  background: 'rgba(255,255,255,0.04)', borderRadius: 10,
  padding: 10, fontSize: 13, lineHeight: 1.5, marginBottom: 4,
} as const;
const btn = {
  padding: '8px 12px', borderRadius: 18, fontSize: 12,
  fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)',
} as const;
const ghost = { ...btn, background: 'transparent', color: 'rgba(255,255,255,0.75)' } as const;
const danger = { ...btn, background: 'rgba(255,77,77,0.12)', color: '#FF6B6B', border: '1px solid rgba(255,77,77,0.35)' } as const;
const ok = { ...btn, background: '#2ECC71', color: '#000', border: 'none' } as const;
const input = {
  flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
  color: 'white', fontSize: 12, outline: 'none',
} as const;

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [backfillMsg, setBackfillMsg] = useState('');

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { status: 401, body: {} as Record<string, unknown> };
    const res = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }, []);

  // Chaque action incrémente ce compteur, et c'est lui qui relance la lecture.
  // Rien n'est posé pendant le rendu : l'effet attend d'abord la réponse.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { status, body } = await call({ action: 'list' });
      if (!alive) return;
      if (status === 401 || status === 403) { setState('denied'); return; }
      if (status !== 200) { setState('error'); return; }
      setReports((body.reports || []) as Report[]);
      setProfiles((body.profiles || []) as Profile[]);
      setMessages((body.messages || []) as Message[]);
      setOffers((body.offers || []) as Offer[]);
      setBlocks((body.blocks || []) as Block[]);
      setState('ok');
    })();
    return () => { alive = false; };
  }, [call, tick]);

  /**
   * Remplir les villes et les pays manquants, sans attendre la tâche de 9 h.
   *
   * Utile le jour où une colonne de lieu vient d'être créée : elle est alors
   * vide pour tous les profils et tous les projets déjà en base, donc la
   * recherche par pays ne trouve rien du tout. Un clic, et elle fonctionne.
   */
  async function runBackfill() {
    setBusy('backfill');
    setBackfillMsg('');
    const { status, body } = await call({ action: 'backfill' });
    setBusy('');
    if (status !== 200) {
      setBackfillMsg(`Échec (${status}). Réessaie.`);
      return;
    }
    const b = body as Record<string, number>;
    setBackfillMsg(
      `${b.remplis ?? 0} profil(s) complété(s) sur ${b.candidats ?? 0} à vérifier · ` +
      `${b.projetsRemplis ?? 0} projet(s) sur ${b.projetsCandidats ?? 0}.` +
      ((b.candidats ?? 0) >= 500 || (b.projetsCandidats ?? 0) >= 500
        ? ' Il en reste : relance pour la suite.'
        : '')
    );
  }

  async function act(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    const { status } = await call(payload);
    setBusy('');
    if (status === 200) setTick(t => t + 1);
    else alert('Action refusée (' + status + ')');
  }

  if (state === 'loading') return <Shell><p style={dim}>Chargement...</p></Shell>;
  if (state === 'denied') return (
    <Shell>
      <p style={{ fontWeight: 800, marginBottom: 8 }}>Accès réservé</p>
      <p style={dim}>Connecte-toi avec le compte administrateur dans l’app, puis reviens sur cette page.</p>
    </Shell>
  );
  if (state === 'error') return (
    <Shell>
      <p style={{ fontWeight: 800, marginBottom: 8 }}>Erreur</p>
      <p style={dim}>La liste n’a pas pu être chargée. Réessaie.</p>
    </Shell>
  );

  const shown = onlyOpen ? reports.filter(r => r.status === 'open') : reports;
  const openCount = reports.filter(r => r.status === 'open').length;

  // Les refus regroupés par personne : une photo refusée est un accident,
  // cinq en une soirée est un comportement. Seul le second mérite un geste.
  const parPersonne = new Map<string, { n: number; dernier: string; ou: string[] }>();
  for (const b of blocks) {
    const g = parPersonne.get(b.user_id) || { n: 0, dernier: b.created_at, ou: [] };
    g.n += 1;
    if (b.created_at > g.dernier) g.dernier = b.created_at;
    if (!g.ou.includes(b.context)) g.ou.push(b.context);
    parPersonne.set(b.user_id, g);
  }
  const refus = [...parPersonne.entries()].sort((a, b) => b[1].n - a[1].n);

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontWeight: 900, fontSize: 18 }}>
          Modération {openCount > 0 && <span style={{ color: '#FF4D4D' }}>· {openCount} en attente</span>}
        </p>
        <button onClick={() => setOnlyOpen(v => !v)} style={ghost}>
          {onlyOpen ? 'Tout voir' : 'En attente'}
        </button>
      </div>

      {/* Entretien. Séparé des signalements : ce n'est pas de la modération,
          c'est du rattrapage de données, et ça n'a pas à attendre 9 h. */}
      <div style={card}>
        <p style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>🗺 Lieux manquants</p>
        <p style={{ ...dim, fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
          Remplit la ville et le pays des profils et des projets qui n’en ont pas.
          À lancer après l’ajout d’une colonne de lieu : sans ça, la recherche par
          pays ne trouve rien tant que la tâche de 9 h n’est pas passée.
        </p>
        {backfillMsg && (
          <p style={{ color: '#2ECC71', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>{backfillMsg}</p>
        )}
        <button disabled={!!busy} onClick={runBackfill} style={ghost}>
          {busy === 'backfill' ? 'En cours...' : 'Remplir maintenant'}
        </button>
      </div>

      {shown.length === 0 && refus.length === 0 && <p style={dim}>Rien à traiter. 🎉</p>}

      {shown.map(r => {
        const target = profiles.find(p => p.user_id === r.target_user_id);
        const reporter = profiles.find(p => p.user_id === r.reporter_id);
        const msg = r.target_type === 'message' ? messages.find(m => String(m.id) === String(r.target_id)) : null;
        const offer = r.target_type === 'offer' ? offers.find(o => String(o.id) === String(r.target_id)) : null;
        const k = (a: string) => r.id + ':' + a;

        return (
          <div key={r.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>
                {r.target_type === 'profile' ? '👤 Profil' : r.target_type === 'message' ? '💬 Message' : '⚡ Projet'}
                {' · '}{REASONS[r.reason] || r.reason}
              </span>
              <span style={{ ...dim, fontSize: 11, whiteSpace: 'nowrap' }}>
                {new Date(r.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>

            <p style={{ ...dim, fontSize: 12, marginBottom: 8 }}>
              Visé : <b style={{ color: '#fff' }}>{target?.username || r.target_user_id || '?'}</b>
              {target?.handle ? ' ' + target.handle : ''}
              {target?.hidden ? ' · masqué' : ''}
              {target?.suspended_at ? ' · SUSPENDU' : ''}
              <br />
              Signalé par : {reporter?.username || r.reporter_id || 'compte supprimé'}
            </p>

            {r.details && (
              <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10, fontStyle: 'italic' }}>« {r.details} »</p>
            )}

            {msg && (
              <div style={quote}>
                {msg.deleted ? <span style={dim}>message déjà retiré</span> : (msg.content || <span style={dim}>(sans texte)</span>)}
                {msg.image_url && !msg.deleted && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.image_url} alt="" style={{ display: 'block', marginTop: 8, maxWidth: '100%', borderRadius: 8 }} />
                )}
              </div>
            )}

            {offer && (
              <div style={quote}>
                <b>{offer.title}</b> <span style={dim}>({offer.status})</span>
                {offer.description && <p style={{ marginTop: 4, fontSize: 13 }}>{offer.description}</p>}
              </div>
            )}

            {r.target_type === 'profile' && target && (
              <div style={quote}>
                {target.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={target.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                  : <span style={dim}>pas de photo de profil</span>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {(target.portfolio_urls || []).map(u => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={u} src={u} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {r.target_type === 'message' && (
                <button disabled={!!busy} onClick={() => act({ action: 'delete_message', targetId: r.target_id }, k('dm'))} style={danger}>
                  {busy === k('dm') ? '...' : 'Retirer le message'}
                </button>
              )}
              {r.target_type === 'offer' && (
                <>
                  <button disabled={!!busy} onClick={() => act({ action: 'close_offer', targetId: r.target_id }, k('co'))} style={ghost}>
                    Fermer le projet
                  </button>
                  <button disabled={!!busy} onClick={() => act({ action: 'delete_offer', targetId: r.target_id }, k('do'))} style={danger}>
                    Supprimer le projet
                  </button>
                </>
              )}
              {r.target_user_id && (
                <>
                  <button disabled={!!busy} onClick={() => act({ action: 'remove_avatar', targetUserId: r.target_user_id }, k('ra'))} style={ghost}>
                    Retirer la photo
                  </button>
                  <button disabled={!!busy} onClick={() => act({ action: 'clear_portfolio', targetUserId: r.target_user_id }, k('cp'))} style={ghost}>
                    Vider le portfolio
                  </button>
                  <button
                    disabled={!!busy}
                    onClick={() => act({ action: target?.hidden ? 'show_profile' : 'hide_profile', targetUserId: r.target_user_id }, k('hp'))}
                    style={ghost}
                  >
                    {target?.hidden ? 'Réafficher le profil' : 'Masquer le profil'}
                  </button>
                  <button
                    disabled={!!busy}
                    onClick={() => act(
                      target?.suspended_at
                        ? { action: 'unsuspend', targetUserId: r.target_user_id }
                        : { action: 'suspend', targetUserId: r.target_user_id, reason: REASONS[r.reason] || r.reason },
                      k('su'),
                    )}
                    style={danger}
                  >
                    {target?.suspended_at ? 'Lever la suspension' : 'Suspendre le compte'}
                  </button>
                </>
              )}
            </div>

            {r.status === 'open' ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ce qui a été décidé (facultatif)"
                  style={input}
                />
                <button disabled={!!busy} onClick={() => act({ action: 'resolve', reportId: r.id, note }, k('rs'))} style={ok}>
                  Traité
                </button>
                <button disabled={!!busy} onClick={() => act({ action: 'dismiss', reportId: r.id, note }, k('di'))} style={ghost}>
                  Sans suite
                </button>
              </div>
            ) : (
              <p style={{ ...dim, fontSize: 11, marginTop: 10 }}>
                {r.status === 'handled' ? '✓ Traité' : '— Sans suite'}
                {r.handled_at ? ' le ' + new Date(r.handled_at).toLocaleDateString('fr-FR') : ''}
                {r.action ? ' · ' + r.action : ''}
              </p>
            )}
          </div>
        );
      })}

      {refus.length > 0 && (
        <>
          <p style={{ fontWeight: 900, fontSize: 16, margin: '28px 0 6px' }}>Photos refusées à l’envoi</p>
          <p style={{ ...dim, fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
            Le contrôle automatique a refusé ces photos dans le téléphone : aucune n’est arrivée
            dans le stockage, il n’y a donc rien à retirer. Ce qui se regarde ici, c’est le nombre.
          </p>

          {refus.map(([userId, g]) => {
            const p = profiles.find(x => x.user_id === userId);
            const k = (a: string) => 'b:' + userId + ':' + a;
            return (
              <div key={userId} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>
                    🚫 {g.n} photo{g.n > 1 ? 's' : ''} refusée{g.n > 1 ? 's' : ''}
                  </span>
                  <span style={{ ...dim, fontSize: 11, whiteSpace: 'nowrap' }}>
                    {new Date(g.dernier).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <p style={{ ...dim, fontSize: 12, marginBottom: 10 }}>
                  <b style={{ color: '#fff' }}>{p?.username || userId}</b>
                  {p?.handle ? ' ' + p.handle : ''}
                  {p?.hidden ? ' · masqué' : ''}
                  {p?.suspended_at ? ' · SUSPENDU' : ''}
                  <br />
                  Depuis : {g.ou.map(c => CONTEXTES[c] || c).join(', ')}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    disabled={!!busy}
                    onClick={() => act({ action: p?.hidden ? 'show_profile' : 'hide_profile', targetUserId: userId }, k('hp'))}
                    style={ghost}
                  >
                    {p?.hidden ? 'Réafficher le profil' : 'Masquer le profil'}
                  </button>
                  <button
                    disabled={!!busy}
                    onClick={() => act(
                      p?.suspended_at
                        ? { action: 'unsuspend', targetUserId: userId }
                        : { action: 'suspend', targetUserId: userId, reason: 'Envoi répété de contenus sexuels' },
                      k('su'),
                    )}
                    style={danger}
                  >
                    {p?.suspended_at ? 'Lever la suspension' : 'Suspendre le compte'}
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main style={{ background: '#0A0A0A', color: 'white', minHeight: '100dvh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 24px) 16px 60px' }}>
        {children}
      </div>
    </main>
  );
}
