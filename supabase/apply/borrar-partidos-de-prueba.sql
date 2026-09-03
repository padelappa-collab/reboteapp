-- =============================================================================
-- BORRAR TODO RASTRO DE LOS PARTIDOS Y PUBLICACIONES DE PRUEBA.
--
-- Deja las cuentas y los perfiles, pero devuelve a cada jugador a su ELO de
-- partida, como si nunca hubiera jugado. Sirve para arrancar limpio sin tener
-- que registrar de nuevo a los cuatro.
--
-- Se queda: usuarios, canchas y todo el esquema.
-- Se va: partidos, historial de ELO, publicaciones del tablón e inscripciones.
--
-- Al final incluye el cambio que quita el borrado de partidos: de ahora en
-- adelante un partido no se borra, se sale uno de él.
-- =============================================================================

delete from public.elo_history;
delete from public.matches;
delete from public.board_post_signups;
delete from public.board_posts;

-- Cada jugador vuelve al ELO con el que se registró, en los tres rankings.
update public.users u
   set elo_masculino = case when u.genero = 'masculino'
                            then public.elo_inicial(u.categoria_inicial, u.genero) end,
       elo_femenino  = case when u.genero = 'femenino'
                            then public.elo_inicial(u.categoria_inicial, u.genero) end,
       elo_mixto     = public.elo_inicial(u.categoria_inicial, u.genero),
       peak_elo_masculino = case when u.genero = 'masculino'
                            then public.elo_inicial(u.categoria_inicial, u.genero) end,
       peak_elo_femenino  = case when u.genero = 'femenino'
                            then public.elo_inicial(u.categoria_inicial, u.genero) end,
       peak_elo_mixto     = public.elo_inicial(u.categoria_inicial, u.genero),
       partidos_jugados = 0;

-- ---------------------------------------------------------------------------
-- Un partido ya no se puede borrar, ni siquiera por quien lo creó.
-- ---------------------------------------------------------------------------
drop policy if exists matches_delete_creador on public.matches;

revoke delete on public.matches from anon, authenticated;

-- Comprobación: las cuatro primeras en cero, usuarios y canchas intactos.
select
  (select count(*) from public.matches)      as partidos,
  (select count(*) from public.elo_history)  as historial_elo,
  (select count(*) from public.board_posts)  as publicaciones,
  (select count(*) from public.board_post_signups) as inscripciones,
  (select count(*) from public.users)        as jugadores,
  (select count(*) from public.courts)       as canchas;
