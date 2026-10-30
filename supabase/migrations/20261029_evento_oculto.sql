-- Evento oculto: no sale en la galería pública ni al subir fotos; el moderador lo sigue viendo y
-- puede volver a mostrarlo. Sus fotos y datos se conservan.
alter table public.events
  add column if not exists oculto boolean not null default false;
