-- Evento destacado: el que la galería muestra por defecto al cargar.
-- Si ninguno está destacado, la galería muestra todos los eventos.

alter table public.events
  add column if not exists destacado boolean not null default false;

-- Solo un evento puede estar destacado a la vez
create unique index if not exists events_un_solo_destacado
  on public.events (destacado)
  where destacado;
