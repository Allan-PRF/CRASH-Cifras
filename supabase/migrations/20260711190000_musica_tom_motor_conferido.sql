-- Etapa C: conferência do tom detectado pelo motor na cópia pessoal.

alter table public.musicas
  add column if not exists tom_motor_conferido_em timestamptz;

comment on column public.musicas.tom_motor_conferido_em is
  'Quando o usuário confirmou o tom detectado pelo motor (banner de conferência).';
