-- CRASH Cifras — Fundação do Plano Equipe (tabelas + RLS)

-- Gera código aleatório de 6 caracteres uppercase alfanumérico
create or replace function public.generate_equipe_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Tabela principal de equipes
create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  lider_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  codigo varchar(6) not null unique default public.generate_equipe_code(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_equipes_lider on public.equipes(lider_id);
create index if not exists idx_equipes_codigo on public.equipes(codigo);

-- Tabela de membros da equipe
create table if not exists public.equipe_membros (
  id uuid primary key default gen_random_uuid(),
  equipe_id uuid not null references public.equipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  instrumento varchar(30) not null default 'voz',
  tipo varchar(20) not null default 'musico'
    check (tipo in ('lider', 'musico', 'mesa')),
  status_online boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (equipe_id, user_id)
);

create index if not exists idx_equipe_membros_equipe on public.equipe_membros(equipe_id);
create index if not exists idx_equipe_membros_user on public.equipe_membros(user_id);

-- Função security definer que retorna equipe_ids do usuário SEM passar pelo RLS
-- (quebra a recursão circular entre equipes ↔ equipe_membros)
create or replace function public.my_equipe_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select equipe_id from public.equipe_membros where user_id = auth.uid();
$$;

-- RLS para equipes
alter table public.equipes enable row level security;

drop policy if exists "equipes_select" on public.equipes;
create policy "equipes_select" on public.equipes for select using (
  lider_id = auth.uid()
  or id in (select public.my_equipe_ids())
);

drop policy if exists "equipes_insert" on public.equipes;
create policy "equipes_insert" on public.equipes for insert
  with check (lider_id = auth.uid());

drop policy if exists "equipes_update" on public.equipes;
create policy "equipes_update" on public.equipes for update
  using (lider_id = auth.uid());

drop policy if exists "equipes_delete" on public.equipes;
create policy "equipes_delete" on public.equipes for delete
  using (lider_id = auth.uid());

-- RLS para equipe_membros (sem referência cruzada — usa my_equipe_ids())
alter table public.equipe_membros enable row level security;

drop policy if exists "equipe_membros_select" on public.equipe_membros;
create policy "equipe_membros_select" on public.equipe_membros for select using (
  user_id = auth.uid()
  or equipe_id in (select public.my_equipe_ids())
);

drop policy if exists "equipe_membros_insert" on public.equipe_membros;
create policy "equipe_membros_insert" on public.equipe_membros for insert
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.equipes where id = equipe_id and lider_id = auth.uid())
  );

drop policy if exists "equipe_membros_update" on public.equipe_membros;
create policy "equipe_membros_update" on public.equipe_membros for update
  using (
    user_id = auth.uid()
    or exists (select 1 from public.equipes where id = equipe_id and lider_id = auth.uid())
  );

drop policy if exists "equipe_membros_delete" on public.equipe_membros;
create policy "equipe_membros_delete" on public.equipe_membros for delete
  using (
    user_id = auth.uid()
    or exists (select 1 from public.equipes where id = equipe_id and lider_id = auth.uid())
  );

-- Função para buscar equipe por código (usada na entrada de membros)
create or replace function public.get_equipe_by_codigo(p_codigo text)
returns table(id uuid, nome text, lider_nome text, total_membros bigint)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.nome,
    coalesce(p.display_name, 'Líder') as lider_nome,
    (select count(*) from equipe_membros em where em.equipe_id = e.id) as total_membros
  from equipes e
  join profiles p on p.id = e.lider_id
  where e.codigo = upper(trim(p_codigo))
  limit 1;
$$;
