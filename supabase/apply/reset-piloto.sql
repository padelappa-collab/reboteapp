-- =============================================================================
-- RESETEO PARA EL PILOTO DE CARTAGENA
--
-- Deja la base como recién instalada: sin jugadores, sin partidos, sin nada de
-- lo que se generó probando. Conserva las canchas y las insignias, que son
-- catálogo y no datos de nadie.
--
-- ES IRREVERSIBLE. No hay papelera ni borrado suave en ningún sitio: lo que
-- este script borra, desaparece.
--
-- -----------------------------------------------------------------------------
-- ORDEN DE LOS TRES PASOS
--
--   1. Este archivo, en el SQL Editor.
--   2. Borrar las cuentas en Authentication > Users (instrucciones aparte).
--   3. Vaciar el almacenamiento: al final de este archivo.
--
-- Los pasos 1 y 2 se pueden hacer en cualquier orden. `public.users.id` apunta
-- a `auth.users` con borrado en cascada, así que borrar las cuentas del panel
-- se lleva por delante casi todo esto por su cuenta. Se hace igualmente aquí
-- porque `conversations` es la única tabla que no cuelga de ningún jugador (se
-- relaciona por sus participantes) y se quedaría con filas vacías flotando.
--
-- Ejecutar este archivo dos veces no rompe nada: la segunda vez no hay nada que
-- borrar y los conteos salen igual.
-- -----------------------------------------------------------------------------

begin;

-- ------------------------------------------------------------------ mensajería
delete from public.message_reads;
delete from public.messages;
delete from public.conversation_participants;
delete from public.conversations;

-- ------------------------------------------------------------------- historias
delete from public.story_likes;
delete from public.story_views;
delete from public.stories;

-- ------------------------------------------------------------------------ feed
delete from public.post_likes;
delete from public.comments;
delete from public.feed_posts;

-- ---------------------------------------------------------------------- tablón
delete from public.board_post_signups;
delete from public.board_posts;

-- --------------------------------------------------------------------- torneos
delete from public.tournament_matches;
delete from public.tournament_pairs;
delete from public.tournaments;

-- -------------------------------------------------------------------- partidos
delete from public.elo_history;
delete from public.matches;

-- ------------------------------------------------------- insignias concedidas
-- Solo las otorgadas. Las 30 definiciones de `badges` son catálogo y se quedan.
delete from public.user_badges;

-- ------------------------------------------------------- rastro de cada jugador
delete from public.notifications;
delete from public.follows;
delete from public.push_subscriptions;

-- ------------------------------------------------------------------- perfiles
delete from public.users;

-- ---------------------------------------------------- el próximo es Fundador #1
-- `is_called = false` hace que el siguiente nextval() devuelva 1 y no 2.
--
-- OJO si alguna vez ensayas este archivo dentro de una transacción que piensas
-- deshacer: `setval` NO es transaccional. El rollback devuelve las filas pero
-- deja la secuencia movida, y los siguientes registros chocarían con números ya
-- usados. Para restaurarla a mano:
--
--   select setval('public.users_numero_registro_seq',
--                 (select coalesce(max(numero_registro), 0) from public.users), true);
select setval('public.users_numero_registro_seq', 1, false);

commit;

-- =============================================================================
-- COMPROBACIÓN
--
-- Todo lo de arriba tiene que salir en 0, y las dos últimas filas con su
-- semilla intacta: 8 canchas y 30 insignias.
-- =============================================================================

select 'users' as tabla, count(*) as filas from public.users
union all select 'matches', count(*) from public.matches
union all select 'elo_history', count(*) from public.elo_history
union all select 'board_posts', count(*) from public.board_posts
union all select 'board_post_signups', count(*) from public.board_post_signups
union all select 'tournaments', count(*) from public.tournaments
union all select 'tournament_pairs', count(*) from public.tournament_pairs
union all select 'tournament_matches', count(*) from public.tournament_matches
union all select 'feed_posts', count(*) from public.feed_posts
union all select 'comments', count(*) from public.comments
union all select 'post_likes', count(*) from public.post_likes
union all select 'stories', count(*) from public.stories
union all select 'story_likes', count(*) from public.story_likes
union all select 'story_views', count(*) from public.story_views
union all select 'conversations', count(*) from public.conversations
union all select 'conversation_participants', count(*) from public.conversation_participants
union all select 'messages', count(*) from public.messages
union all select 'message_reads', count(*) from public.message_reads
union all select 'notifications', count(*) from public.notifications
union all select 'follows', count(*) from public.follows
union all select 'user_badges', count(*) from public.user_badges
union all select 'push_subscriptions', count(*) from public.push_subscriptions
union all select '--- SEMILLA: courts (esperado 8)', count(*) from public.courts
union all select '--- SEMILLA: badges (esperado 30)', count(*) from public.badges
union all select '--- proximo numero_registro (esperado 1)',
                 last_value from public.users_numero_registro_seq
order by 1;

-- =============================================================================
-- PASO 3: VACIAR EL ALMACENAMIENTO
--
-- Ejecutar DESPUÉS de que los pasos 1 y 2 estén hechos y comprobados.
--
-- No borra filas: llama a la función `limpiar-historias`, que borra los
-- archivos de verdad por la API de Storage. Quitar filas de `storage.objects`
-- a mano no libera el archivo; solo lo esconde del catálogo.
--
-- Sin jugadores, ninguna fila menciona ya ninguna foto, así que todo el
-- contenido de `avatars` y `feed-images` queda huérfano y entra en el barrido.
-- La función deja fuera lo subido en la última hora, que es la red de seguridad
-- para no borrarle la foto a quien está publicando en ese momento; si acabas de
-- subir algo probando, espera una hora o vuelve a lanzarlo mañana.
--
-- Es asíncrono: la petición se encola y sale al confirmar. Dale unos segundos
-- antes de comprobar.
-- =============================================================================

-- select public.limpiar_historias();

-- Y para comprobar que no quedó nada (unos segundos después):
-- select bucket_id, count(*) as archivos from storage.objects group by bucket_id;
