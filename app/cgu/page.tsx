import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_SECTIONS } from '../legal-content';

// Page publique, lisible sans compte. Elle sert à trois choses :
// la case « j'accepte les conditions » de Stripe (qui exige une adresse publique),
// le lien à mettre dans la bio Instagram, et la consultation par un utilisateur
// qui a supprimé son compte et n'a donc plus accès à l'écran CGU de l'app.
export const metadata: Metadata = {
  title: "CGU & Mentions légales · Snappin'Buddy",
  description: "Conditions générales d'utilisation, mentions légales et politique de confidentialité de Snappin'Buddy.",
};

type Section = { title: string; content: string };

export default function CguPage() {
  return (
    <main style={{ background: '#0A0A0A', color: 'white', minHeight: '100dvh' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 40px) 20px calc(60px + env(safe-area-inset-bottom))' }}>

        <Link href="/" style={{ color: '#F2E050', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
          ← Snappin&apos;Buddy
        </Link>

        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '20px 0 28px' }}>
          CGU &amp; Mentions légales
        </h1>

        {(LEGAL_SECTIONS as Section[]).map((s, i) => (
          <section key={i} style={{ background: '#1A1A1A', borderRadius: '14px', padding: '18px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px' }}>{s.title}</h2>
            <p style={{ color: '#9a9a9a', fontSize: '13.5px', lineHeight: 1.75, whiteSpace: 'pre-line', margin: 0 }}>
              {s.content}
            </p>
          </section>
        ))}

        <p style={{ color: '#666', fontSize: '11px', textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>
          Snappin&apos;Buddy · Ateliers 777 · SIRET 995 320 264 00014 · 59 rue de Ponthieu, 75008 Paris 🗺
        </p>
      </div>
    </main>
  );
}
