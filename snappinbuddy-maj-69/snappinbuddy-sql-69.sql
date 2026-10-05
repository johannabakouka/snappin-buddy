-- Snappin'Buddy · lot B
-- « Préviens-moi quand quelqu'un arrive »
--
-- Une ligne par personne. On n'y stocke rien de nouveau sur elle : la position
-- est une copie de celle de son profil, déjà floutée (environ 2 km pour une
-- ville choisie). Aucun nom de ville, aucune adresse.
--
-- baseline : le nombre de créatifs déjà présents autour d'elle au moment de la
-- demande. Sans ce repère, la tâche quotidienne enverrait un mail dès son
-- premier passage pour annoncer des gens qui étaient là avant.
--
-- notified_at : rempli après l'envoi du mail. Un seul mail par demande.

create table if not exists public.city_watch (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  baseline integer not null default 0,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Une seule veille par personne : redemander remplace la précédente.
  unique (user_id)
);

-- La tâche quotidienne lit toutes les veilles non encore traitées.
create index if not exists city_watch_pending_idx
  on public.city_watch (notified_at)
  where notified_at is null;

alter table public.city_watch enable row level security;

-- Chacun ne voit, ne pose et ne retire que sa propre veille. La tâche
-- quotidienne tourne avec la clé service role, qui passe au-dessus de ces
-- règles : c'est elle qui lit toutes les lignes et remplit notified_at.
drop policy if exists "city_watch_select_own" on public.city_watch;
create policy "city_watch_select_own" on public.city_watch
  for select using (auth.uid() = user_id);

drop policy if exists "city_watch_insert_own" on public.city_watch;
create policy "city_watch_insert_own" on public.city_watch
  for insert with check (auth.uid() = user_id);

drop policy if exists "city_watch_update_own" on public.city_watch;
create policy "city_watch_update_own" on public.city_watch
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "city_watch_delete_own" on public.city_watch;
create policy "city_watch_delete_own" on public.city_watch
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- « Ce que tu cherches » : l'intention, en identifiants séparés par des
-- virgules (paid, tfp, exchange, personal, assist, meet). Deux personnes du
-- même métier dans la même ville peuvent n'avoir rien à se proposer, l'une
-- voulant des missions payées et l'autre juste rencontrer du monde.
alter table public.profiles add column if not exists looking_for text;

-- Mode invisible : rester sur l'app sans apparaître sur la carte ni dans
-- Explorer. Avant, la seule façon de ne plus être localisable était de
-- supprimer son compte.
alter table public.profiles add column if not exists hidden boolean not null default false;
