import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '../../lib/server';
import { ROLES_FR, splitRoles } from '../../constants';

export const dynamic = 'force-dynamic';

// Page de profil publique, lisible sans compte.
//
// Elle existe pour les liens partagés en story : un lien qui tombe sur un écran
// de connexion perd la personne. Ici elle voit le profil, puis décide.
//
// C'est le serveur qui lit la base, avec la clé d'administration, et il ne
// renvoie QUE ce qui est choisi ici. La position, l'email et tout le reste
// ne sortent pas. C'est aussi pour ça qu'on a pu resserrer l'accès aux profils
// côté application sans perdre le partage public.

type PublicProfile = {
  username: string | null;
  handle: string | null;
  bio: string | null;
  role: string | null;
  styles: string | null;
  zone: string | null;
  avatar_url: string | null;
  portfolio_urls: string[] | null;
  validated_projects: number | null;
};

async function getProfile(handle: string): Promise<PublicProfile | null> {
  const clean = decodeURIComponent(handle).replace(/^@+/, '');
  if (!clean) return null;
  const { data } = await supabaseAdmin()
    .from('profiles')
    .select('username, handle, bio, role, styles, zone, avatar_url, portfolio_urls, validated_projects')
    .ilike('handle', `@${clean}`)
    .maybeSingle();
  return (data as PublicProfile) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfile(handle);
  if (!profile) return { title: "Snappin'Buddy" };

  const roles = splitRoles(profile.role)
    .map((r: string) => ROLES_FR.find(x => x.id === r)?.label || r)
    .join(' · ');

  return {
    title: `${profile.username || profile.handle} · Snappin'Buddy`,
    description: profile.bio || `${roles}${profile.zone ? ` — ${profile.zone}` : ''}`,
    openGraph: {
      title: `${profile.username || ''} ${profile.handle || ''}`.trim(),
      description: profile.bio || roles,
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getProfile(handle);
  if (!profile) notFound();

  type Role = { id: string; label: string; icon: string };
  const roles: Role[] = splitRoles(profile.role).map(
    (r: string) => (ROLES_FR.find((x: Role) => x.id === r) as Role) || { id: r, label: r, icon: '' }
  );
  const univers = (profile.styles || '').split(',').map(s => s.trim()).filter(Boolean);
  const portfolio = (profile.portfolio_urls || []).slice(0, 6);
  const appLink = `/?buddy=${encodeURIComponent((profile.handle || '').replace(/^@+/, ''))}`;

  return (
    <main style={{ background: '#0A0A0A', color: 'white', minHeight: '100dvh' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 32px) 20px calc(40px + env(safe-area-inset-bottom))' }}>

        <Link href="/" style={{ color: '#F2E050', fontSize: '13px', fontWeight: 800, textDecoration: 'none' }}>
          Snappin&apos;Buddy
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '28px 0 20px' }}>
          <div style={{
            width: '84px', height: '84px', borderRadius: '50%', flexShrink: 0,
            background: '#2C2C2C', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px',
            border: '2px solid rgba(255,255,255,0.18)',
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '◉'}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.1, marginBottom: '4px' }}>
              {profile.username}
            </h1>
            <p style={{ color: '#F2E050', fontSize: '14px', fontWeight: 700 }}>{profile.handle}</p>
          </div>
        </div>

        {(profile.validated_projects || 0) > 0 && (
          <div style={{
            background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.25)',
            borderRadius: '14px', padding: '12px 16px', marginBottom: '14px',
          }}>
            <p style={{ color: '#2ECC71', fontSize: '14px', fontWeight: 900 }}>
              🤝 {profile.validated_projects} {profile.validated_projects === 1 ? 'projet validé' : 'projets validés'}
            </p>
            <p style={{ color: '#8C8B83', fontSize: '11px' }}>Rencontres réelles, confirmées sur place</p>
          </div>
        )}

        {profile.bio && (
          <p style={{ color: '#B9B8B2', fontSize: '15px', lineHeight: 1.65, marginBottom: '18px' }}>
            {profile.bio}
          </p>
        )}

        {roles.length > 0 && (
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

        {profile.zone && (
          <p style={{ color: '#8C8B83', fontSize: '13px', marginBottom: '20px' }}>📍 {profile.zone}</p>
        )}

        {portfolio.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
            {portfolio.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', maxWidth: '100%' }} />
            ))}
          </div>
        )}

        <Link href={appLink} style={{
          display: 'block', textAlign: 'center', background: '#F2E050', color: '#0A0A0D',
          borderRadius: '26px', padding: '15px', fontSize: '15px', fontWeight: 900, textDecoration: 'none',
        }}>
          Créer avec {profile.username || profile.handle} ⚡
        </Link>

        <p style={{ color: '#8C8B83', fontSize: '12px', textAlign: 'center', marginTop: '14px', lineHeight: 1.6 }}>
          Snappin&apos;Buddy met en relation les créatifs par ville.
          <br />Photographes, modèles, maquilleurs, stylistes — gratuit.
        </p>
      </div>
    </main>
  );
}
