-- Ajustes generales del sitio (clave → valor) que el moderador cambia desde el panel.
-- Por ahora: vista_galeria = vista con la que abre la galería ('wall' | 'dome' | 'flight').
-- Solo el servidor (service role) lee y escribe: RLS activo y sin políticas para anon.

create table if not exists public.ajustes (
  clave text primary key,
  valor text not null,
  actualizado_en timestamptz not null default now()
);

alter table public.ajustes enable row level security;

insert into public.ajustes (clave, valor)
values ('vista_galeria', 'wall')
on conflict (clave) do nothing;
