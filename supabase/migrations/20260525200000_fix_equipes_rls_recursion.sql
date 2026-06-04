-- CRASH Cifras — Fix: recursão infinita no RLS de equipe_membros
-- Causa: policies de equipe_membros consultavam equipe_membros (self-reference)
--        e equipes_select consultava equipe_membros que disparava equipes_select (cross-reference)
-- Solução: função security definer my_equipe_ids() que bypassa RLS

-- 1. Função security definer (bypassa RLS, quebra o ciclo)
create or replace function public.my_equipe_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select equipe_id from public.equipe_membros where user_id = auth.uid();
$$;

-- 2. Recriar policies de equipes (usa my_equipe_ids em vez de subquery direta)
drop policy if exists "equipes_select" on public.equipes;
create policy "equipes_select" on public.equipes for select using (
  lider_id = auth.uid()
  or id in (select public.my_equipe_ids())
);

-- insert/update/delete permanecem iguais (só líder), mas recriamos por segurança
drop policy if exists "equipes_insert" on public.equipes;
create policy "equipes_insert" on public.equipes for insert
  with check (lider_id = auth.uid());

drop policy if exists "equipes_update" on public.equipes;
create policy "equipes_update" on public.equipes for update
  using (lider_id = auth.uid());

drop policy if exists "equipes_delete" on public.equipes;
create policy "equipes_delete" on public.equipes for delete
  using (lider_id = auth.uid());

-- 3. Recriar policies de equipe_membros (sem self-reference)
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
