-- =============================================================================
-- Un partido no se borra: se sale de él.
--
-- Antes quien lo creaba podía borrarlo entero, lo que le daba poder sobre un
-- registro que también es de los otros tres. Ahora la única salida es salirse
-- uno mismo, que queda anotado con nombre y deja rastro de lo que pasó.
-- =============================================================================

drop policy if exists matches_delete_creador on public.matches;

revoke delete on public.matches from anon, authenticated;
