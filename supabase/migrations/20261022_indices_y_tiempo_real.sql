-- Índices para las búsquedas que hace el sitio. Las llaves primarias son de varias columnas y la que
-- se busca no va primero, así que no servían (cada consulta recorría la tabla completa).
create unique index if not exists imageinfo_imghash_key on public."imageInfo" (imghash);
create unique index if not exists events_ruta_key on public.events (ruta);
create unique index if not exists moderators_email_key on public.moderators (email);

-- Fotos en vivo: al aprobar una foto se marca aquí (al rechazarla se vacía) y la galería abierta
-- la recibe por Realtime sin recargar. Las fotos aprobadas antes de esto no necesitan valor.
alter table public."imageInfo" add column if not exists aprobada_en timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'imageInfo'
  ) then
    alter publication supabase_realtime add table public."imageInfo";
  end if;
end $$;
