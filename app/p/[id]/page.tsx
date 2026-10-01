import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '../../lib/server';
import { ROLES_FR } from '../../constants';
import { isPast } from '../../offers-life';

export const dynamic = 'force-dynamic';

// Page publique d'un projet, lisible sans compte.
//
// Un lien partagé en story tombait sur l'écran de connexion : la personne
// ne voyait même pas de quoi il s'agissait avant qu'on lui demande de
// s'inscrire. Ici elle lit le projet, puis décide.
//
// Le serveur choisit ce qui sort : le projet, son auteur, ses rôles.
// Ni position exacte, ni email, ni quoi que ce soit d'autre.

type Row = {
  id: number | string;
  title: string | null;
  description: string | null;
  role_needed: string | null;
  styles_needed: string | null;
  zone: string | null;
  date: string | null;
  status: string | null;
  created_at: string | null;
  user_id: string;
};

type Author = { username: string | null; handle: string | null; avatar_url: string | null };

function withAt(handle: string | null | undefined): string {
  const clean = String(handle || '').replace(/^@+/, '');
  return clean ? `@${clean}` : '';
}

async function getOffer(id: string): Promise<{ offer: Row; author: Author | null } | null> {
  // L'identifiant part tel quel : selon la base il peut être un nombre ou un
  // uuid, et forcer un format ici renvoyait « page introuvable » sur des liens
  // parfaitement valides. Une valeur aberrante ne trouve simplement rien.
  const clean = decodeURIComponent(String(id || '')).trim();
  if (!clean || clean.length > 64) return null;

  const db = supabaseAdmin();
  const { data: offer, error } = await db
    .from('offers')
    .select('id, title, description, role_needed, styles_needed, zone, date, status, created_at, user_id')
    .eq('id', clean)
    .maybeSingle();
  if (error) console.error('page projet', clean, error.message);
  if (!offer) return null;

  const { data: author } = await db
    .from('profiles')
    .select('username, handle, avatar_url')
    .eq('user_id', (offer as Row).user_id)
    .maybeSingle();

  return { offer: offer as Row, author: (author as Author) || null };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const found = await getOffer(id);
  if (!found) return { title: "Snappin'Buddy" };
  const { offer, author } = found;
  const description = offer.description?.slice(0, 160) || `Projet proposé par ${author?.username || 'un créatif'}`;
  return {
    title: `${offer.title} · Snappin'Buddy`,
    description,
    openGraph: {
      title: offer.title || "Snappin'Buddy",
      description,
      images: ['https://snappinbuddy.com/og.png'],
    },
  };
}

export default async function PublicOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getOffer(id);
  if (!found) notFound();

  const { offer, author } = found;
  type Role = { id: string; label: string; icon: string };
  const roles: Role[] = (offer.role_needed || '')
    .split(',').map(r => r.trim()).filter(Boolean)
    .map(r => (ROLES_FR.find((x: Role) => x.id === r) as Role) || { id: r, label: r, icon: '' });
  const univers = (offer.styles_needed || '').split(',').map(s => s.trim()).filter(Boolean);
  const closed = offer.status === 'closed';
  // Une story peut être postée après la date : la personne doit le voir tout de suite.
  const past = isPast(offer);
  const authorSlug = withAt(author?.handle).replace(/^@/, '');

  return (
    <main style={{ background: '#0A0A0A', color: 'white', minHeight: '100dvh' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 32px) 20px calc(40px + env(safe-area-inset-bottom))' }}>

        <Link href="/" style={{
          display: 'flex', width: 'fit-content', alignItems: 'center', gap: '8px',
          color: '#F2E050', fontSize: '13px', fontWeight: 800, textDecoration: 'none',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={28} height={28} style={{ borderRadius: '7px', display: 'block' }} />
          Snappin&apos;Buddy
        </Link>

        <p style={{
          display: 'inline-block', marginTop: '24px', marginBottom: '14px',
          background: past ? 'rgba(240,180,41,0.12)' : 'rgba(242,224,80,0.12)',
          border: `1px solid ${past ? 'rgba(240,180,41,0.45)' : 'rgba(242,224,80,0.45)'}`,
          color: past ? '#F0B429' : '#F2E050', borderRadius: '20px', padding: '5px 14px',
          fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em',
        }}>
          {past ? '⏳ PROJET PASSÉ' : closed ? 'PROJET COMPLET' : '⚡ PROJET'}
        </p>

        {author && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
              background: '#2C2C2C', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
            }}>
              {author.avatar_url
                ? <img src={author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '◉'}
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700 }}>{author.username}</p>
              {authorSlug && (
                <Link href={`/u/${authorSlug}`} style={{ color: '#F2E050', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                  {withAt(author.handle)}
                </Link>
              )}
            </div>
          </div>
        )}

        <h1 style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.2, marginBottom: '14px' }}>
          {offer.title}
        </h1>

        {offer.description && (
          <p style={{ color: '#B9B8B2', fontSize: '15px', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: '20px' }}>
            {offer.description}
          </p>
        )}

        {roles.length > 0 && (
          <>
            <p style={{ color: '#8C8B83', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '8px' }}>
              ON CHERCHE
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {roles.map((r: Role) => (
                <span key={r.id} style={{
                  background: 'rgba(255,255,255,0.1)', borderRadius: '18px',
                  padding: '7px 14px', fontSize: '13px', fontWeight: 700,
                }}>
                  {r.icon} {r.label}
                </span>
              ))}
            </div>
          </>
        )}

        {univers.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {univers.map(u => (
              <span key={u} style={{
                border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.65)',
                borderRadius: '16px', padding: '6px 12px', fontSize: '12px',
              }}>
                {u}
              </span>
            ))}
          </div>
        )}

        <p style={{ color: '#8C8B83', fontSize: '13px', marginBottom: '24px' }}>
          {offer.zone ? `📍 ${offer.zone}` : ''}{offer.zone && offer.date ? '    ' : ''}{offer.date ? `📅 ${offer.date}` : ''}
        </p>

        {past && (
          <p style={{ color: '#F0B429', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
            Ce projet a déjà eu lieu. Il reste visible parce que quelqu’un a partagé le lien,
            mais il n’est plus dans le feed.
          </p>
        )}

        <Link href={past ? '/' : `/?offer=${offer.id}`} style={{
          display: 'block', textAlign: 'center', background: '#F2E050', color: '#0A0A0D',
          borderRadius: '26px', padding: '15px', fontSize: '15px', fontWeight: 900, textDecoration: 'none',
        }}>
          {past ? 'Voir les projets en cours ⚡' : closed ? 'Voir sur Snappin’Buddy' : 'Je me propose ⚡'}
        </Link>

        <p style={{ color: '#8C8B83', fontSize: '12px', textAlign: 'center', marginTop: '14px', lineHeight: 1.6 }}>
          Snappin&apos;Buddy met en relation les créatifs par ville.
          <br />Photographes, vidéastes, modèles, stylistes, maquilleurs, coiffeurs,
          directeurs artistiques, monteurs, designers, musiciens… et bien d’autres.
          <br />Gratuit, sans agence et sans commission.
        </p>
      </div>
    </main>
  );
}
