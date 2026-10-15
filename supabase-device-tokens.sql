-- La table des appareils, pour les notifications.
--
-- À coller une seule fois dans l'éditeur SQL de Supabase.
-- Elle ne contient rien de personnel : un identifiant d'appareil donné par
-- Apple, et à qui il appartient.

create table if not exists public.device_tokens (
  -- Le jeton est la clé : un téléphone donné n'a qu'une ligne, quel que soit
  -- le compte qui s'en sert. Si quelqu'un se déconnecte et qu'une autre
  -- personne se connecte sur le même téléphone, la ligne change simplement de
  -- propriétaire, et les notifications suivent. Deux lignes auraient envoyé
  -- les messages de l'ancien compte à la nouvelle personne.
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null default 'ios',
  created_at  timestamptz not null default now()
);

-- L'envoi cherche tous les appareils d'une personne : sans cet index, chaque
-- notification lirait la table entière.
create index if not exists device_tokens_user_idx
  on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

-- Aucune règle, donc aucun accès depuis les téléphones. C'est voulu.
--
-- Cette table ne s'écrit que par /api/register-device, qui vérifie d'abord qui
-- parle, et ne se lit que par le serveur au moment d'envoyer. Les deux
-- utilisent la clé d'administration, qui ignore ces règles.
--
-- Ouverte aux téléphones, même bien réglée, elle laisserait deviner quels
-- comptes ont l'app installée, et surtout permettrait à quelqu'un d'inscrire
-- son propre téléphone sous un autre compte pour en recevoir les notifications.
