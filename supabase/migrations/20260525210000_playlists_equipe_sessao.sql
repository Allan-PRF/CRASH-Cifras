-- CRASH Cifras — Plano Equipe Parte 2: Compartilhamento de playlists + Sessão ao vivo

-- =============================================
-- 1. COMPARTILHAMENTO DE PLAYLISTS
-- =============================================

alter table public.playlists
  add column if not exists equipe_id uuid references public.equipes(id) on delete set null;

create index if not exists idx_playlists_equipe on public.playlists(equipe_id);

-- Atualizar RLS: dono OU membro da equipe vinculada
drop policy if exists "playlists_all_own" on public.playlists;

create policy "playlists_select" on public.playlists for select using (
  auth.uid() = user_id
  or (equipe_id is not null and equipe_id in (select public.my_equipe_ids()))
);

create policy "playlists_insert" on public.playlists for insert
  with check (auth.uid() = user_id);

create policy "playlists_update" on public.playlists for update
  using (auth.uid() = user_id);

create policy "playlists_delete" on public.playlists for delete
  using (auth.uid() = user_id);

-- playlist_itens: membros da equipe podem LER itens de playlists compartilhadas
drop policy if exists "playlist_itens_all_own" on public.playlist_itens;

create policy "playlist_itens_select" on public.playlist_itens for select using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_id
    and (
      p.user_id = auth.uid()
      or (p.equipe_id is not null and p.equipe_id in (select public.my_equipe_ids()))
    )
  )
);

create policy "playlist_itens_write" on public.playlist_itens for insert
  with check (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

create policy "playlist_itens_update" on public.playlist_itens for update
  using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

create policy "playlist_itens_delete" on public.playlist_itens for delete
  using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

-- =============================================
-- 2. SESSÃO AO VIVO (equipe_sessao)
-- =============================================

create table if not exists public.equipe_sessao (
  equipe_id uuid primary key references public.equipes(id) on delete cascade,
  playlist_id uuid references public.playlists(id) on delete set null,
  musica_id uuid references public.musicas(id) on delete set null,
  secao_index integer not null default 0,
  tocando boolean not null default false,
  tom_offset integer not null default 0,
  bpm integer,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.equipe_sessao enable row level security;

drop policy if exists "equipe_sessao_select" on public.equipe_sessao;
create policy "equipe_sessao_select" on public.equipe_sessao for select using (
  equipe_id in (select public.my_equipe_ids())
);

drop policy if exists "equipe_sessao_insert" on public.equipe_sessao;
create policy "equipe_sessao_insert" on public.equipe_sessao for insert
  with check (
    exists (select 1 from public.equipes where id = equipe_id and lider_id = auth.uid())
  );

drop policy if exists "equipe_sessao_update" on public.equipe_sessao;
create policy "equipe_sessao_update" on public.equipe_sessao for update
  using (
    exists (select 1 from public.equipes where id = equipe_id and lider_id = auth.uid())
  );

drop policy if exists "equipe_sessao_delete" on public.equipe_sessao;
create policy "equipe_sessao_delete" on public.equipe_sessao for delete
  using (
    exists (select 1 from public.equipes where id = equipe_id and lider_id = auth.uid())
  );

-- Habilitar Realtime para equipe_sessao
alter publication supabase_realtime add table public.equipe_sessao;

-- =============================================
-- 3. PRESENÇA DE MEMBROS (equipe_presenca)
-- =============================================

create table if not exists public.equipe_presenca (
  id uuid primary key default gen_random_uuid(),
  equipe_id uuid not null references public.equipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now(),
  unique (equipe_id, user_id)
);

alter table public.equipe_presenca enable row level security;

drop policy if exists "equipe_presenca_select" on public.equipe_presenca;
create policy "equipe_presenca_select" on public.equipe_presenca for select using (
  equipe_id in (select public.my_equipe_ids())
);

drop policy if exists "equipe_presenca_upsert" on public.equipe_presenca;
create policy "equipe_presenca_upsert" on public.equipe_presenca for insert
  with check (user_id = auth.uid());

drop policy if exists "equipe_presenca_update" on public.equipe_presenca;
create policy "equipe_presenca_update" on public.equipe_presenca for update
  using (user_id = auth.uid());

drop policy if exists "equipe_presenca_delete" on public.equipe_presenca;
create policy "equipe_presenca_delete" on public.equipe_presenca for delete
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.equipe_presenca;
