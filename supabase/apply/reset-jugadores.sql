-- =============================================================================
-- BORRAR TODOS LOS JUGADORES Y EMPEZAR DE CERO
--
-- Para cuando terminen las pruebas del piloto y quieras abrir la app con la
-- base limpia. NO borra las canchas: esas se quedan.
--
-- Qué se va, por efecto cascada al borrar la cuenta:
--   perfiles, partidos, historial de ELO, publicaciones del tablón e
--   inscripciones a publicaciones.
--
-- Qué se queda:
--   el directorio de canchas y todo el esquema (tablas, funciones, políticas).
--
-- Esto NO se puede deshacer. Ejecutar solo cuando de verdad se quiera vaciar.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- OPCIÓN A — borrar absolutamente todos los jugadores.
-- ---------------------------------------------------------------------------
delete from auth.users;

-- La numeración de registro vuelve a empezar, así que el próximo jugador real
-- será el fundador #1. Sin esto, el primero que entre recibiría un número alto
-- y la insignia de fundador quedaría descuadrada.
alter sequence public.users_numero_registro_seq restart with 1;

-- ---------------------------------------------------------------------------
-- OPCIÓN B — borrar todos MENOS tu propia cuenta.
--
-- Comenta las dos sentencias de arriba y descomenta estas dos. Cambia el correo
-- por el tuyo. Ojo: si te quedas con tu cuenta, tu numero_registro sigue siendo
-- el que ya tenías; reiniciar la secuencia podría repetir números, por eso aquí
-- se deja donde está.
-- ---------------------------------------------------------------------------
-- delete from auth.users where email <> 'tu-correo@ejemplo.com';
--
-- -- los partidos guardan a los otros jugadores en un arreglo sin llave foránea,
-- -- así que hay que limpiar los que quedaron con gente borrada
-- delete from public.matches m
--  where exists (
--    select 1 from unnest(m.pareja_a || m.pareja_b) as jugador
--     where jugador not in (select id from public.users)
--  );

-- ---------------------------------------------------------------------------
-- Comprobación: las tres deben quedar en 0 y las canchas intactas.
-- ---------------------------------------------------------------------------
select
  (select count(*) from auth.users)          as cuentas,
  (select count(*) from public.users)        as perfiles,
  (select count(*) from public.matches)      as partidos,
  (select count(*) from public.elo_history)  as historial_elo,
  (select count(*) from public.board_posts)  as publicaciones,
  (select count(*) from public.courts)       as canchas;
