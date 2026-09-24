// Outils réservés aux routes serveur (app/api/*). Ne jamais importer depuis un composant client :
// ce fichier utilise des clés secrètes (service role Supabase, Resend, Stripe).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import Stripe from 'stripe';

const SUPABASE_URL = 'https://jfzdrccnzzwhvzbxgtjo.supabase.co';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://snappinbuddy.com';
const EMAIL_FROM = process.env.EMAIL_FROM || "Snappin'Buddy <contact@snappinbuddy.com>";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ateliers777.contact@gmail.com';

// Les clients sont créés à la demande : le build ne plante pas si une clé manque,
// et l'erreur apparaît clairement au moment de l'appel.
let admin: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante dans Vercel');
    admin = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY manquante dans Vercel');
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

let resendClient: Resend | null = null;
function resend(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY manquante dans Vercel');
    resendClient = new Resend(key);
  }
  return resendClient;
}

/** Vérifie le jeton envoyé par l'app (Authorization: Bearer ...) et renvoie l'utilisateur. */
export async function requireUser(request: Request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email ?? null;
}

export async function getProfile(userId: string) {
  const { data } = await supabaseAdmin()
    .from('profiles')
    .select('username, handle, role')
    .eq('user_id', userId)
    .maybeSingle();
  return data as { username?: string; handle?: string; role?: string } | null;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Extrait le titre du projet d'un message de candidature « Je me propose pour : Titre ». */
export function offerTitleFromMessage(message?: string | null): string {
  if (!message) return '';
  const i = message.indexOf(': ');
  return (i >= 0 ? message.slice(i + 2) : message).trim();
}

// forUser : le pseudo du destinataire, ajouté au lien pour que l'app prévienne
// si on ouvre le mail alors qu'on est connecté sur un autre compte.
type Mail = { to: string; subject: string; titleFr: string; bodyFr: string; titleEn: string; bodyEn: string; cta?: string; forUser?: string };

function layout(m: Mail): string {
  const link = m.forUser ? `${APP_URL}/?for=${encodeURIComponent(m.forUser)}` : APP_URL;
  const button = m.cta === undefined ? '' : `
    <a href="${link}" style="display:inline-block;margin-top:24px;padding:12px 22px;border-radius:24px;background:#F2E050;color:#0A0A0A;font-weight:800;text-decoration:none">${m.cta || "Ouvrir Snappin'Buddy · Open"}</a>`;
  return `<!doctype html><html><body bgcolor="#0A0A0A" style="margin:0;background:#0A0A0A;font-family:Helvetica,Arial,sans-serif;color:#fff">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <a href="${link}" style="display:block;text-align:center;margin-bottom:24px;text-decoration:none">
      <img src="${APP_URL}/logo-email.png" width="120" height="120" alt="Snappin'Buddy" style="display:inline-block;width:120px;height:120px;border:0">
    </a>
    <h1 style="font-size:20px;margin:0 0 12px">${m.titleFr}</h1>
    <p style="font-size:15px;line-height:1.6;color:rgba(255,255,255,.8);margin:0">${m.bodyFr}</p>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,.12);margin:24px 0">
    <h2 style="font-size:16px;margin:0 0 8px;color:rgba(255,255,255,.85)">${m.titleEn}</h2>
    <p style="font-size:14px;line-height:1.6;color:rgba(255,255,255,.6);margin:0">${m.bodyEn}</p>${button}
    <p style="margin-top:32px;font-size:12px;color:#F2E050;letter-spacing:.2em">MATCH AND CREATE.</p>
  </div></body></html>`;
}

export async function sendMail(m: Mail) {
  const { error } = await resend().emails.send({ from: EMAIL_FROM, to: m.to, subject: m.subject, html: layout(m) });
  if (error) throw new Error(`Resend: ${error.message}`);
}

// ---------- Modèles d'emails (FR puis EN) ----------

export function newApplicationMail(to: string, applicant: string, role: string, offerTitle: string, forUser?: string): Mail {
  const a = escapeHtml(applicant), r = escapeHtml(role), o = escapeHtml(offerTitle);
  return {
    to,
    subject: `⚡ Nouvelle candidature · ${offerTitle}`.slice(0, 120),
    titleFr: 'Quelqu’un veut créer avec toi ⚡',
    bodyFr: `<b>${a}</b>${r ? ` (${r})` : ''} se propose pour ton projet <b>« ${o} »</b>. Ouvre l’app pour voir son profil et lui répondre.`,
    titleEn: 'Someone wants to create with you ⚡',
    bodyEn: `<b>${a}</b>${r ? ` (${r})` : ''} applied to your project <b>“${o}”</b>. Open the app to see their profile and reply.`,
    cta: '',
    forUser,
  };
}

export function newProposalMail(to: string, sender: string, role: string, message: string, forUser?: string): Mail {
  const s = escapeHtml(sender), r = escapeHtml(role);
  const m = escapeHtml(message.slice(0, 300));
  const quote = m ? `<br><br><i>« ${m} »</i>` : '';
  const quoteEn = m ? `<br><br><i>“${m}”</i>` : '';
  return {
    to,
    subject: `⚡ ${sender} te propose une collab`.slice(0, 120),
    titleFr: 'Nouvelle proposition de collab ⚡',
    bodyFr: `<b>${s}</b>${r ? ` (${r})` : ''} te propose de créer ensemble.${quote}<br><br>Ouvre l’app pour voir son profil et accepter ou refuser.`,
    titleEn: 'New collab proposal ⚡',
    bodyEn: `<b>${s}</b>${r ? ` (${r})` : ''} wants to create with you.${quoteEn}<br><br>Open the app to see their profile and accept or decline.`,
    cta: '',
    forUser,
  };
}

export function newMessageMail(to: string, sender: string, forUser?: string): Mail {
  const s = escapeHtml(sender);
  return {
    to,
    subject: `💬 ${sender} t'a écrit sur Snappin'Buddy`.slice(0, 120),
    titleFr: 'Tu as un nouveau message 💬',
    bodyFr: `<b>${s}</b> t’a écrit. Ouvre l’app pour lire et répondre.`,
    titleEn: 'You have a new message 💬',
    bodyEn: `<b>${s}</b> sent you a message. Open the app to read and reply.`,
    cta: '',
    forUser,
  };
}

export function applicationAcceptedMail(to: string, poster: string, offerTitle: string, forUser?: string): Mail {
  const p = escapeHtml(poster), o = escapeHtml(offerTitle);
  return {
    to,
    subject: `🎉 Candidature acceptée · ${offerTitle}`.slice(0, 120),
    titleFr: 'Ta candidature est acceptée 🎉',
    bodyFr: `<b>${p}</b> a accepté ta proposition pour <b>« ${o} »</b>. Un message t’attend dans l’app pour organiser la suite.`,
    titleEn: 'Your application was accepted 🎉',
    bodyEn: `<b>${p}</b> accepted your application for <b>“${o}”</b>. A message is waiting for you in the app.`,
    cta: '',
    forUser,
  };
}

export function offerExpiringMail(to: string, offerTitle: string, expiryDate: string, expired: boolean, forUser?: string): Mail {
  const o = escapeHtml(offerTitle), d = escapeHtml(expiryDate);
  return expired
    ? {
        to,
        subject: `Ton projet est clôturé · ${offerTitle}`.slice(0, 120),
        titleFr: 'Ton projet est arrivé à échéance',
        bodyFr: `Ton projet <b>« ${o} »</b> a été clôturé après 30 jours. Tu peux en lancer un nouveau à tout moment.`,
        titleEn: 'Your project has ended',
        bodyEn: `Your project <b>“${o}”</b> was closed after 30 days. You can launch a new one anytime.`,
        cta: '',
        forUser,
      }
    : {
        to,
        subject: `⏳ Ton projet expire bientôt · ${offerTitle}`.slice(0, 120),
        titleFr: 'Ton projet expire dans 7 jours ⏳',
        bodyFr: `Ton projet <b>« ${o} »</b> sera clôturé le <b>${d}</b>. Pense à répondre aux candidatures d’ici là.`,
        titleEn: 'Your project expires in 7 days ⏳',
        bodyEn: `Your project <b>“${o}”</b> will close on <b>${d}</b>. Remember to reply to applications before then.`,
        cta: '',
        forUser,
      };
}

export function reportMail(to: string, reporterId: string, reported: { id: string; username?: string; handle?: string }, reason: string): Mail {
  return {
    to,
    subject: `🚩 Signalement · ${reported.username || reported.id}`.slice(0, 120),
    titleFr: 'Nouveau signalement',
    bodyFr: `Profil signalé : <b>${escapeHtml(reported.username)}</b> (@${escapeHtml(reported.handle)}, id ${escapeHtml(reported.id)})<br>` +
      `Signalé par : ${escapeHtml(reporterId)}<br><br>Motif :<br>${escapeHtml(reason).replace(/\n/g, '<br>')}`,
    titleEn: 'New report',
    bodyEn: 'See details above.',
  };
}
