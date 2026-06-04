-- Permite checkout InfinitPay com JWT do usuário (sem service role no dev)

drop policy if exists "assinaturas_insert_own" on public.assinaturas;
create policy "assinaturas_insert_own"
  on public.assinaturas for insert
  with check (auth.uid() = user_id);

drop policy if exists "assinaturas_update_own" on public.assinaturas;
create policy "assinaturas_update_own"
  on public.assinaturas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "pagamentos_assinatura_insert_own" on public.pagamentos_assinatura;
create policy "pagamentos_assinatura_insert_own"
  on public.pagamentos_assinatura for insert
  with check (auth.uid() = user_id);
