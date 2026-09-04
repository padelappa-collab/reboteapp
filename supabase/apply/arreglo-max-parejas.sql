-- =============================================================================
-- La tabla también tiene que aceptar torneos de dos parejas.
--
-- Al bajar el mínimo del americano se cambiaron la función y el formulario,
-- pero no la restricción de la columna, que seguía exigiendo tres. El
-- formulario ofrecía una opción que la base rechazaba.
-- =============================================================================

alter table public.tournaments
  drop constraint if exists tournaments_max_parejas_check;

alter table public.tournaments
  add constraint tournaments_max_parejas_check check (max_parejas between 2 and 32);
