-- =============================================================================
-- Quitar la versión vieja de inscribir_pareja.
--
-- La nueva recibe tres parámetros y el tercero tiene valor por defecto, así que
-- al llamarla con dos convive con la antigua y la base no sabe cuál elegir:
-- "could not choose the best candidate function".
--
-- `create or replace` no reemplaza una firma distinta, la añade. Había que
-- borrar la anterior a mano.
-- =============================================================================

drop function if exists public.inscribir_pareja(uuid, uuid);
