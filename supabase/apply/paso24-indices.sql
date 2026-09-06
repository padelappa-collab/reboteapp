-- =============================================================================
-- Índices para las claves foráneas que no los tenían.
--
-- Postgres indexa sola la columna a la que APUNTA una clave foránea, pero no la
-- que apunta. Sin ese índice, dos cosas se vuelven lentas a la vez: los join por
-- esa columna —que es la mitad de las consultas de la app— y los borrados en
-- cascada, que tienen que recorrer la tabla entera para saber qué arrastran.
--
-- Con cuatro jugadores no se nota nada. Con cuatrocientos y unos miles de
-- mensajes sí, y para entonces crear un índice sobre una tabla viva es una
-- operación que hay que pensar. Ahora es gratis.
--
-- No están todas las que marcó el asesor: se dejan fuera las que nunca se
-- consultan por ese lado —`matches.cancelado_por`, `notifications.actor_id`—
-- porque un índice que nadie usa no sale gratis: ocupa espacio y hay que
-- mantenerlo en cada escritura.
-- =============================================================================

-- --------------------------------------------------------------- mensajería
create index if not exists messages_emisor_idx
  on public.messages (sender_id);
create index if not exists messages_post_idx
  on public.messages (post_compartido_id) where post_compartido_id is not null;

-- ------------------------------------------------------------------- social
create index if not exists comments_usuario_idx
  on public.comments (user_id);
create index if not exists post_likes_usuario_idx
  on public.post_likes (user_id);
create index if not exists story_likes_usuario_idx
  on public.story_likes (user_id);
create index if not exists feed_posts_partido_idx
  on public.feed_posts (match_id) where match_id is not null;

-- ------------------------------------------------------------------ tablón
create index if not exists board_signups_usuario_idx
  on public.board_post_signups (user_id);
create index if not exists board_posts_cancha_idx
  on public.board_posts (cancha_id) where cancha_id is not null;
create index if not exists board_posts_partido_idx
  on public.board_posts (match_id) where match_id is not null;

-- ---------------------------------------------------------------- partidos
create index if not exists matches_creador_idx
  on public.matches (creado_por);
create index if not exists matches_torneo_idx
  on public.matches (tournament_id) where tournament_id is not null;
create index if not exists elo_history_partido_idx
  on public.elo_history (match_id);

-- ----------------------------------------------------------------- torneos
create index if not exists pares_jugador_a_idx
  on public.tournament_pairs (jugador_a);
create index if not exists pares_jugador_b_idx
  on public.tournament_pairs (jugador_b);
create index if not exists cruces_pareja_a_idx
  on public.tournament_matches (pareja_a_id);
create index if not exists cruces_pareja_b_idx
  on public.tournament_matches (pareja_b_id);
create index if not exists cruces_ganador_idx
  on public.tournament_matches (ganador_id) where ganador_id is not null;
create index if not exists cruces_partido_idx
  on public.tournament_matches (match_id) where match_id is not null;
create index if not exists torneos_creador_idx
  on public.tournaments (creado_por);
create index if not exists torneos_cancha_idx
  on public.tournaments (cancha_id) where cancha_id is not null;

-- --------------------------------------------------------------- insignias
create index if not exists user_badges_insignia_idx
  on public.user_badges (badge_id);
