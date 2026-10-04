import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '../../lib/server';
import { ROLES_FR, ROLES_EN, splitRoles, OTHER_ROLE_ID } from '../../constants';
import { cleanUrl, prettyUrl } from '../../links';
import { txIn, langFromHeader } from '../../tx';

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

/** Affiche toujours le pseudo avec son @, même s'il est enregistré sans. */
function withAt(handle: string | null | undefined): string {
  const clean = String(handle || '').replace(/^@+/, '');
  return clean ? `@${clean}` : '';
}

type PublicProfile = {
  username: string | null;
  handle: string | null;
  bio: string | null;
  role: string | null;
  role_other: string | null;
  styles: string | null;
  zone: string | null;
  avatar_url: string | null;
  portfolio_urls: string[] | null;
  portfolio_url: string | null;
  validated_projects: number | null;
};

async function getProfile(handle: string): Promise<PublicProfile | null> {
  const clean = decodeURIComponent(handle).replace(/^@+/, '');
  if (!clean) return null;
  // Les pseudos créés avant le nettoyage automatique sont enregistrés sans le @.
  // On cherche donc les deux formes, sinon ces profils sont introuvables.
  // Le tiret bas est un joker dans une recherche ilike : @jo_stuff pourrait
  // renvoyer @joXstuff. On ramène donc quelques candidats et on garde celui
  // dont le pseudo correspond vraiment.
  const { data } = await supabaseAdmin()
    .from('profiles')
    .select('username, handle, bio, role, role_other, styles, zone, avatar_url, portfolio_urls, portfolio_url, validated_projects')
    .or(`handle.ilike.@${clean},handle.ilike.${clean}`)
    .limit(5);

  const exact = (data as PublicProfile[] | null)?.find(
    p => String(p.handle || '').replace(/^@+/, '').toLowerCase() === clean.toLowerCase(),
  );
  return exact || null;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfile(handle);
  if (!profile) return { title: "Snappin'Buddy" };

  // L'aperçu partagé se lit dans la langue de la personne qui ouvre le lien.
  const metaLang = langFromHeader((await headers()).get('accept-language'));
  const metaRoles = metaLang === 'fr' ? ROLES_FR : ROLES_EN;
  const roles = splitRoles(profile.role)
    .map((r: string) => (r === OTHER_ROLE_ID && profile.role_other) ? profile.role_other : (metaRoles.find(x => x.id === r)?.label || r))
    .join(' · ');

  return {
    title: `${profile.username || profile.handle} · Snappin'Buddy`,
    description: profile.bio || `${roles}${profile.zone ? ` — ${profile.zone}` : ''}`,
    openGraph: {
      title: `${profile.username || ''} ${profile.handle || ''}`.trim(),
      description: profile.bio || roles,
      images: [profile.avatar_url || 'https://snappinbuddy.com/og.png'],
    },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getProfile(handle);
  if (!profile) notFound();

  // Cette page est ouverte depuis une story, souvent depuis un autre pays :
  // on suit la langue du navigateur qui la demande.
  const lang = langFromHeader((await headers()).get('accept-language'));
  const t = (en: string, fr: string) => txIn(lang, en, fr);

  type Role = { id: string; label: string; icon: string };
  const roleList = (lang === 'fr' ? ROLES_FR : ROLES_EN) as Role[];
  const roles: Role[] = splitRoles(profile.role).map((r: string) => {
    // « Autre » seul ne dit rien du métier : on affiche ce que la personne a écrit.
    if (r === OTHER_ROLE_ID && profile.role_other) return { id: r, label: profile.role_other, icon: '✨' };
    return (roleList.find((x: Role) => x.id === r) as Role) || { id: r, label: r, icon: '' };
  });
  const univers = (profile.styles || '').split(',').map(s => s.trim()).filter(Boolean);
  const portfolio = (profile.portfolio_urls || []).slice(0, 6);
  // Revalidé à l'affichage : cette page est publique et lue par des moteurs de
  // recherche, un lien douteux n'y est jamais rendu cliquable.
  const siteLink = cleanUrl(profile.portfolio_url) || '';
  const appLink = `/?buddy=${encodeURIComponent((profile.handle || '').replace(/^@+/, ''))}`;

  return (
    <main style={{ background: '#0A0A0A', color: 'white', minHeight: '100dvh' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 32px) 20px calc(40px + env(safe-area-inset-bottom))' }}>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#F2E050', fontSize: '13px', fontWeight: 800, textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={28} height={28} style={{ borderRadius: '7px', display: 'block' }} />
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
            <p style={{ color: '#F2E050', fontSize: '14px', fontWeight: 700 }}>{withAt(profile.handle)}</p>
          </div>
        </div>

        {(profile.validated_projects || 0) > 0 && (
          <div style={{
            background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.25)',
            borderRadius: '14px', padding: '12px 16px', marginBottom: '14px',
          }}>
            <p style={{ color: '#2ECC71', fontSize: '14px', fontWeight: 900 }}>
              🤝 {profile.validated_projects} {profile.validated_projects === 1
                ? t('validated project', 'projet validé')
                : t('validated projects', 'projets validés')}
            </p>
            <p style={{ color: '#8C8B83', fontSize: '11px' }}>
              {t('Real meetups, confirmed on the spot', 'Rencontres réelles, confirmées sur place')}
            </p>
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

        {siteLink && (
          <a href={siteLink} target="_blank" rel="noopener noreferrer nofollow" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            border: '1px solid rgba(255,255,255,0.18)', borderRadius: '14px',
            padding: '13px 16px', marginBottom: '20px', color: 'white', textDecoration: 'none',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🔗 {prettyUrl(siteLink)}
            </span>
            <span style={{ fontSize: '12px', color: '#8C8B83', fontWeight: 700, flexShrink: 0 }}>↗</span>
          </a>
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
          {t('Create with', 'Créer avec')} {profile.username || profile.handle} ⚡
        </Link>

        <p style={{ color: '#8C8B83', fontSize: '12px', textAlign: 'center', marginTop: '14px', lineHeight: 1.6 }}>
          {t("Snappin'Buddy connects creatives city by city.", 'Snappin’Buddy met en relation les créatifs par ville.')}
          <br />{t(
            'Photographers, videographers, models, stylists, makeup artists, hairstylists, art directors, editors, designers, musicians… and many more.',
            'Photographes, vidéastes, modèles, stylistes, maquilleurs, coiffeurs, directeurs artistiques, monteurs, designers, musiciens… et bien d’autres.'
          )}
          <br />{t('Free, no agency, no commission.', 'Gratuit, sans agence et sans commission.')}
        </p>
      </div>
    </main>
  );
}
