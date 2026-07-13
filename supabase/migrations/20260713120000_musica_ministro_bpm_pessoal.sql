-- Preferência pessoal de andamento (óculos de BPM), por ministro + música.

alter table public.musica_ministro
  add column if not exists bpm_pessoal integer
    check (bpm_pessoal is null or (bpm_pessoal > 0 and bpm_pessoal < 400));

comment on column public.musica_ministro.bpm_pessoal is
  'BPM preferido do ministro nesta música (só execução). Null = usa musicas.bpm.';
