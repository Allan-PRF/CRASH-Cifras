-- Indicação: lookup de código só via API (service role), não via anon no cliente.

revoke execute on function public.get_public_referrer_by_code(text)
  from anon, authenticated;

grant execute on function public.get_public_referrer_by_code(text)
  to service_role;
