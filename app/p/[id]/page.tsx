import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '../../lib/server';
import { ROLES_FR } from '../../constants';

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
  id: number;
  title: string | null;
  description: string | null;
  role_needed: string | null;
  styles_needed: string | null;
  zone: string | null;
  date: string | null;
  status: string | null;
  user_id: string;
};

type Author = { username: string | null; handle: string | null; avatar_url: string | null };

function withAt(handle: string | null | undefined): string {
  const clean = String(handle || '').replace(/^@+/, '');
  return clean ? `@${clean}` : '';
}

async function getOffer(id: string): Promise<{ offer: Row; author: Author | null } | null> {
  if (!/^\d+$/.test(id)) return null;
  const db = supabaseAdmin();
  const { data: offer } = await db
    .from('offers')
    .select('id, title, description, role_needed, styles_needed, zone, date, status, user_id')
    .eq('id', Number(id))
    .maybeSingle();
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
  return {
    title: `${offer.title} · Snappin'Buddy`,
    description: offer.description?.slice(0, 160) || `Projet proposé par ${author?.username || 'un créatif'}`,
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
  const authorSlug = withAt(author?.handle).replace(/^@/, '');

  return (
    <main style={{ background: '#0A0A0A', color: 'white', minHeight: '100dvh' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 32px) 20px calc(40px + env(safe-area-inset-bottom))' }}>

        <Link href="/" style={{ color: '#F2E050', fontSize: '13px', fontWeight: 800, textDecoration: 'none' }}>
          Snappin&apos;Buddy
        </Link>

        <p style={{
          display: 'inline-block', marginTop: '24px', marginBottom: '14px',
          background: 'rgba(242,224,80,0.12)', border: '1px solid rgba(242,224,80,0.45)',
          color: '#F2E050', borderRadius: '20px', padding: '5px 14px',
          fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em',
        }}>
          {closed ? 'PROJET COMPLET' : '⚡ PROJET'}
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

        <Link href={`/?offer=${offer.id}`} style={{
          display: 'block', textAlign: 'center', background: '#F2E050', color: '#0A0A0D',
          borderRadius: '26px', padding: '15px', fontSize: '15px', fontWeight: 900, textDecoration: 'none',
        }}>
          {closed ? 'Voir sur Snappin’Buddy' : 'Je me propose ⚡'}
        </Link>

        <p style={{ color: '#8C8B83', fontSize: '12px', textAlign: 'center', marginTop: '14px', lineHeight: 1.6 }}>
          Snappin&apos;Buddy met en relation les créatifs par ville.
          <br />Photographes, modèles, maquilleurs, stylistes — gratuit.
        </p>
      </div>
    </main>
  );
}
