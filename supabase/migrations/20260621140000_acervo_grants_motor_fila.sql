-- Garante leitura/escrita do acervo via PostgREST (service role + fila do motor).
-- Sem GRANT explícito, inserts podem funcionar mas SELECT via API retorna vazio.

grant select, insert, update, delete on table public.acervo_musicas to service_role;
grant select on table public.acervo_musicas to anon, authenticated;

grant select, insert, update, delete on table public.acervo_versoes to service_role;
grant select on table public.acervo_versoes to anon, authenticated;

-- Fila do motor: SECURITY DEFINER evita RLS/grants incompletos na leitura.
create or replace function public.motor_fila_acervo()
returns table (
  id uuid,
  titulo text,
  artista text,
  fonte_url text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, titulo, artista, fonte_url, status, created_at
  from public.acervo_musicas
  where status in ('pending', 'processing')
  order by created_at asc
  limit 50;
$$;

grant execute on function public.motor_fila_acervo() to service_role, authenticated, anon;

notify pgrst, 'reload schema';
