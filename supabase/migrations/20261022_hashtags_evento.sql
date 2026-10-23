-- Hashtags de cada evento (texto ya normalizado, p. ej. "#Shift2025 #Trading"): se agregan al final
-- del texto al compartir una foto y de la descripción en el visor.
alter table public.events add column if not exists hashtags text not null default '';
