-- CRASH Cifras — Fase 10: assinaturas via InfinitPay

alter table public.user_settings
  add column if not exists assinatura_status varchar(20) not null default 'inativa'
    check (assinatura_status in ('inativa', 'pendente', 'ativa', 'atrasada', 'cancelada')),
  add column if not exists assinatura_expira_em timestamptz,
  add column if not exists assinatura_provider text;

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plano varchar(20) not null check (plano in ('musico', 'banda', 'igreja')),
  status varchar(20) not null default 'pendente'
    check (status in ('pendente', 'ativa', 'atrasada', 'cancelada', 'expirada')),
  provider varchar(30) not null default 'infinitpay',
  provider_reference text,
  checkout_url text,
  valor_centavos integer not null check (valor_centavos > 0),
  moeda varchar(3) not null default 'BRL',
  periodo varchar(20) not null default 'mensal',
  inicia_em timestamptz,
  expira_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assinaturas_user_status_idx
  on public.assinaturas (user_id, status, created_at desc);

create table if not exists public.pagamentos_assinatura (
  id uuid primary key default gen_random_uuid(),
  assinatura_id uuid references public.assinaturas (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  plano varchar(20) not null check (plano in ('musico', 'banda', 'igreja')),
  provider varchar(30) not null default 'infinitpay',
  provider_reference text,
  status varchar(30) not null default 'checkout_criado',
  valor_centavos integer not null check (valor_centavos > 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pagamentos_assinatura_user_idx
  on public.pagamentos_assinatura (user_id, created_at desc);

alter table public.assinaturas enable row level security;
alter table public.pagamentos_assinatura enable row level security;

drop policy if exists "assinaturas_select_own" on public.assinaturas;
create policy "assinaturas_select_own"
  on public.assinaturas for select
  using (auth.uid() = user_id);

drop policy if exists "pagamentos_assinatura_select_own" on public.pagamentos_assinatura;
create policy "pagamentos_assinatura_select_own"
  on public.pagamentos_assinatura for select
  using (auth.uid() = user_id);

create or replace function public.current_user_plan()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select plano
      from public.user_settings
      where user_id = auth.uid()
        and assinatura_status = 'ativa'
        and (assinatura_expira_em is null or assinatura_expira_em > now())
      limit 1
    ),
    'gratuito'
  );
$$;
