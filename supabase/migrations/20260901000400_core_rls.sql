-- =============================================================================
-- Row Level Security del núcleo.
--
-- Criterio general:
--  * Todo lo que alimenta el ranking (ELO, partidos confirmados, historial) es
--    de lectura para cualquier jugador autenticado: es un ranking público.
--  * Nada que afecte al ranking se puede escribir desde el cliente. El ELO solo
--    se mueve dentro de confirm_match(), que corre como SECURITY DEFINER.
--  * El directorio de canchas es de lectura incluso sin sesión (pantalla
--    informativa), y solo se administra con la service role.
-- =============================================================================

alter table public.users             enable row level security;
alter table public.courts            enable row level security;
alter table public.matches           enable row level security;
alter table public.elo_history       enable row level security;
alter table public.board_posts       enable row level security;
alter table public.board_post_signups enable row level security;

-- ----------------------------------------------------------------------- users
create policy users_select on public.users
  for select to authenticated
  using (true);

create policy users_insert_propio on public.users
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy users_update_propio on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- El jugador solo puede tocar sus datos de presentación. Género y categoría
-- inicial quedan fijos tras el registro (cambiarlos manipularía el ranking), y
-- los ELO solo los mueve confirm_match().
revoke update on public.users from authenticated;
grant update (nombre, ciudad, foto_url) on public.users to authenticated;

-- ---------------------------------------------------------------------- courts
create policy courts_select on public.courts
  for select to anon, authenticated
  using (true);

revoke insert, update, delete on public.courts from anon, authenticated;

-- --------------------------------------------------------------------- matches
create policy matches_select on public.matches
  for select to authenticated
  using (true);

-- Solo se puede registrar un partido propio: quien lo crea tiene que estar en
-- la cancha. Los campos derivados los fija el trigger, no el cliente.
create policy matches_insert_participante on public.matches
  for insert to authenticated
  with check (
    creado_por = (select auth.uid())
    and (select auth.uid()) = any (pareja_a || pareja_b)
  );

-- Corregir un partido mal registrado: solo quien lo creó y solo mientras nadie
-- más haya confirmado.
create policy matches_delete_creador on public.matches
  for delete to authenticated
  using (
    creado_por = (select auth.uid())
    and estado = 'pendiente'
    and cardinality(resultado_confirmado_por) <= 1
  );

-- Confirmar un resultado pasa por confirm_match(), nunca por un UPDATE directo.
revoke update on public.matches from anon, authenticated;

-- ----------------------------------------------------------------- elo_history
create policy elo_history_select on public.elo_history
  for select to authenticated
  using (true);

revoke insert, update, delete on public.elo_history from anon, authenticated;

-- ----------------------------------------------------------------- board_posts
create policy board_posts_select on public.board_posts
  for select to authenticated
  using (true);

create policy board_posts_insert_propio on public.board_posts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy board_posts_update_propio on public.board_posts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy board_posts_delete_propio on public.board_posts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------- board_post_signups
create policy board_signups_select on public.board_post_signups
  for select to authenticated
  using (true);

create policy board_signups_insert_propio on public.board_post_signups
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- apuntarse y desapuntarse; el dueño del post también puede sacar a alguien
create policy board_signups_delete on public.board_post_signups
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.board_posts p
       where p.id = post_id and p.user_id = (select auth.uid())
    )
  );
