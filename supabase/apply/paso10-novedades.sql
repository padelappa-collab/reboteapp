-- =============================================================================
-- Novedades: el centro de avisos dentro de la app.
--
-- Todo lo que pasa y le importa a alguien genera una fila aquí. Se crean con
-- triggers, no desde el cliente: si dependiera del navegador de quien provoca
-- el evento, quien cierre la app antes de tiempo dejaría al otro sin enterarse.
--
-- Cada aviso lleva a dónde ir. Sin el enlace, una novedad es un ruido que
-- obliga a buscar a mano de qué está hablando.
-- =============================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  tipo       text not null,
  titulo     text not null,
  cuerpo     text,
  -- ruta interna de la app: /partidos/xxx, /jugador/xxx…
  enlace     text,
  -- quién lo provocó y sobre qué, para no repetir el mismo aviso dos veces
  actor_id   uuid references public.users (id) on delete set null,
  entidad_id uuid,
  leida      boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, leida, created_at desc);

-- El mismo evento sobre la misma cosa no avisa dos veces.
create unique index if not exists notifications_sin_repetir
  on public.notifications (user_id, tipo, entidad_id)
  where entidad_id is not null;

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

-- marcar como leída es lo único que el cliente puede escribir
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notifications_delete on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

revoke insert on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant update (leida) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.avisar(
  p_user     uuid,
  p_tipo     text,
  p_titulo   text,
  p_cuerpo   text default null,
  p_enlace   text default null,
  p_actor    uuid default null,
  p_entidad  uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $FN$
begin
  -- nadie necesita que le avisen de lo que acaba de hacer
  if p_user is null or p_user = p_actor then
    return;
  end if;

  insert into public.notifications
    (user_id, tipo, titulo, cuerpo, enlace, actor_id, entidad_id)
  values
    (p_user, p_tipo, p_titulo, p_cuerpo, p_enlace, p_actor, p_entidad)
  on conflict do nothing;
end;
$FN$;

create or replace function public.nombre_de(p_user uuid)
returns text
language sql
stable
as $FN$
  select coalesce(nombre, 'Alguien') from public.users where id = p_user;
$FN$;

-- ---------------------------------------------------------------------------
-- Insignias
-- ---------------------------------------------------------------------------
create or replace function public.avisar_insignia()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_badge public.badges;
begin
  select * into v_badge from public.badges where id = new.badge_id;

  perform public.avisar(
    new.user_id, 'insignia',
    v_badge.icono || ' Ganaste la insignia ' || v_badge.nombre,
    v_badge.descripcion,
    '/perfil', null, null
  );
  return new;
end;
$FN$;

drop trigger if exists user_badges_avisar on public.user_badges;
create trigger user_badges_avisar
  after insert on public.user_badges
  for each row execute function public.avisar_insignia();

-- ---------------------------------------------------------------------------
-- Seguidores
-- ---------------------------------------------------------------------------
create or replace function public.avisar_seguimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
begin
  if new.estado = 'aceptado' then
    perform public.avisar(
      new.followed_id, 'nuevo_seguidor',
      public.nombre_de(new.follower_id) || ' te sigue',
      null, '/jugador/' || new.follower_id, new.follower_id, new.follower_id
    );
  else
    perform public.avisar(
      new.followed_id, 'solicitud_seguimiento',
      public.nombre_de(new.follower_id) || ' quiere seguirte',
      'Acéptalo desde tu perfil para que vea tus publicaciones.',
      '/perfil', new.follower_id, new.follower_id
    );
  end if;
  return new;
end;
$FN$;

drop trigger if exists follows_avisar on public.follows;
create trigger follows_avisar
  after insert on public.follows
  for each row execute function public.avisar_seguimiento();

create or replace function public.avisar_solicitud_aceptada()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
begin
  if old.estado = 'pendiente' and new.estado = 'aceptado' then
    perform public.avisar(
      new.follower_id, 'solicitud_aceptada',
      public.nombre_de(new.followed_id) || ' aceptó tu solicitud',
      'Ya puedes ver sus publicaciones.',
      '/jugador/' || new.followed_id, new.followed_id, new.followed_id
    );
  end if;
  return new;
end;
$FN$;

drop trigger if exists follows_avisar_aceptada on public.follows;
create trigger follows_avisar_aceptada
  after update on public.follows
  for each row execute function public.avisar_solicitud_aceptada();

-- ---------------------------------------------------------------------------
-- Me gusta y comentarios
-- ---------------------------------------------------------------------------
create or replace function public.avisar_me_gusta()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_autor uuid;
begin
  select user_id into v_autor from public.feed_posts where id = new.post_id;

  perform public.avisar(
    v_autor, 'me_gusta',
    'A ' || public.nombre_de(new.user_id) || ' le gustó tu publicación',
    null, '/perfil', new.user_id, new.post_id
  );
  return new;
end;
$FN$;

drop trigger if exists post_likes_avisar on public.post_likes;
create trigger post_likes_avisar
  after insert on public.post_likes
  for each row execute function public.avisar_me_gusta();

create or replace function public.avisar_comentario()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_autor uuid;
begin
  select user_id into v_autor from public.feed_posts where id = new.post_id;

  perform public.avisar(
    v_autor, 'comentario',
    public.nombre_de(new.user_id) || ' comentó tu publicación',
    left(new.contenido, 120),
    '/perfil', new.user_id, new.id
  );
  return new;
end;
$FN$;

drop trigger if exists comments_avisar on public.comments;
create trigger comments_avisar
  after insert on public.comments
  for each row execute function public.avisar_comentario();

-- ---------------------------------------------------------------------------
-- Partidos
-- ---------------------------------------------------------------------------
create or replace function public.avisar_partido_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_jugador uuid;
begin
  -- los de torneo los registra el organizador; ese aviso va aparte
  if new.tournament_id is not null then
    return new;
  end if;

  foreach v_jugador in array (new.pareja_a || new.pareja_b) loop
    perform public.avisar(
      v_jugador, 'partido_nuevo',
      public.nombre_de(new.creado_por) || ' te agregó a un partido',
      'Revisa el marcador y confírmalo para que cuente en el ranking.',
      '/partidos/' || new.id, new.creado_por, new.id
    );
  end loop;
  return new;
end;
$FN$;

drop trigger if exists matches_avisar_nuevo on public.matches;
create trigger matches_avisar_nuevo
  after insert on public.matches
  for each row execute function public.avisar_partido_nuevo();

create or replace function public.avisar_partido_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_jugador uuid;
  v_delta   integer;
begin
  if old.estado = new.estado then
    return new;
  end if;

  foreach v_jugador in array (new.pareja_a || new.pareja_b) loop
    if new.estado = 'confirmado' then
      select delta into v_delta
        from public.elo_history
       where match_id = new.id and user_id = v_jugador;

      perform public.avisar(
        v_jugador, 'partido_confirmado',
        'Tu partido quedó confirmado',
        case
          when v_delta is null then 'El ranking ya se actualizó.'
          when v_delta >= 0 then 'Ganaste ' || v_delta || ' puntos de ELO.'
          else 'Perdiste ' || abs(v_delta) || ' puntos de ELO.'
        end,
        '/partidos/' || new.id, null, new.id
      );

    elsif new.estado = 'cancelado' then
      perform public.avisar(
        v_jugador, 'partido_cancelado',
        public.nombre_de(new.cancelado_por) || ' se salió del partido',
        'Ese partido ya no cuenta para el ranking.',
        '/partidos/' || new.id, new.cancelado_por, new.id
      );

    elsif new.estado = 'disputado' then
      perform public.avisar(
        v_jugador, 'partido_disputado',
        'Hay un desacuerdo con el marcador',
        'Cualquiera de los cuatro puede corregirlo.',
        '/partidos/' || new.id, null, new.id
      );
    end if;
  end loop;

  return new;
end;
$FN$;

drop trigger if exists matches_avisar_cambio on public.matches;
create trigger matches_avisar_cambio
  after update on public.matches
  for each row execute function public.avisar_partido_cambio();

-- ---------------------------------------------------------------------------
-- Tablón
-- ---------------------------------------------------------------------------
create or replace function public.avisar_tablon()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_autor uuid;
begin
  select user_id into v_autor from public.board_posts where id = new.post_id;

  perform public.avisar(
    v_autor, 'tablon_union',
    public.nombre_de(new.user_id) || ' se unió a tu partido',
    null, '/tablon/' || new.post_id, new.user_id, new.post_id
  );
  return new;
end;
$FN$;

drop trigger if exists board_signups_avisar on public.board_post_signups;
create trigger board_signups_avisar
  after insert on public.board_post_signups
  for each row execute function public.avisar_tablon();

-- ---------------------------------------------------------------------------
-- Torneos
-- ---------------------------------------------------------------------------
create or replace function public.avisar_inscripcion_torneo()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_nombre text;
begin
  select nombre into v_nombre from public.tournaments where id = new.tournament_id;

  perform public.avisar(
    new.jugador_b, 'torneo_inscripcion',
    public.nombre_de(new.jugador_a) || ' te inscribió como su pareja',
    'En ' || v_nombre || '. Tienes que aceptar para que quede en firme.',
    '/torneos/' || new.tournament_id, new.jugador_a, new.id
  );
  return new;
end;
$FN$;

drop trigger if exists pairs_avisar on public.tournament_pairs;
create trigger pairs_avisar
  after insert on public.tournament_pairs
  for each row execute function public.avisar_inscripcion_torneo();

create or replace function public.avisar_torneo_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_jugador uuid;
begin
  if old.estado = new.estado then
    return new;
  end if;

  for v_jugador in
    select unnest(array[jugador_a, jugador_b])
      from public.tournament_pairs
     where tournament_id = new.id and estado = 'aceptada'
  loop
    if new.estado = 'cancelado' then
      perform public.avisar(
        v_jugador, 'torneo_cancelado',
        'Se canceló ' || new.nombre,
        'El torneo no se va a jugar.', '/torneos/' || new.id, null, new.id
      );
    elsif new.estado = 'en_curso' then
      perform public.avisar(
        v_jugador, 'torneo_empezo',
        new.nombre || ' ya empezó',
        'Mira contra quién te tocó.', '/torneos/' || new.id, null, new.id
      );
    elsif new.estado = 'finalizado' then
      perform public.avisar(
        v_jugador, 'torneo_finalizado',
        'Terminó ' || new.nombre,
        'Mira cómo quedó la tabla.', '/torneos/' || new.id, null, new.id
      );
    end if;
  end loop;

  return new;
end;
$FN$;

drop trigger if exists tournaments_avisar on public.tournaments;
create trigger tournaments_avisar
  after update on public.tournaments
  for each row execute function public.avisar_torneo_cambio();

-- ---------------------------------------------------------------------------
-- Lo que depende del calendario: insignias periódicas, partidos que se acercan
-- y jugadores que llevan tiempo sin aparecer.
-- ---------------------------------------------------------------------------
create or replace function public.tareas_periodicas()
returns void
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_user record;
begin
  -- ---------------------------------------------------------- veterano
  insert into public.user_badges (user_id, badge_id)
  select id, 'veterano' from public.users
   where created_at <= now() - interval '1 year'
  on conflict do nothing;

  -- --------------------------------------------- maratón: 3 en una semana
  insert into public.user_badges (user_id, badge_id)
  select jugador, 'maraton_semanal'
    from (
      select unnest(m.pareja_a || m.pareja_b) as jugador,
             date_trunc('week', m.fecha) as semana,
             count(*) over () as ignorar
        from public.matches m
       where m.estado = 'confirmado'
    ) x
   group by jugador, semana
  having count(*) >= 3
  on conflict do nothing;

  -- ------------------------------------------ mes intenso: 15 en un mes
  insert into public.user_badges (user_id, badge_id)
  select jugador, 'mes_intenso'
    from (
      select unnest(m.pareja_a || m.pareja_b) as jugador,
             date_trunc('month', m.fecha) as mes
        from public.matches m
       where m.estado = 'confirmado'
    ) x
   group by jugador, mes
  having count(*) >= 15
  on conflict do nothing;

  -- --------------------- constante: al menos un partido en 4 semanas seguidas
  insert into public.user_badges (user_id, badge_id)
  select jugador, 'racha_semanal'
    from (
      select jugador, semana,
             semana - (dense_rank() over (partition by jugador order by semana)
                       * interval '1 week') as bloque
        from (
          select distinct unnest(m.pareja_a || m.pareja_b) as jugador,
                 date_trunc('week', m.fecha) as semana
            from public.matches m
           where m.estado = 'confirmado'
        ) s
    ) t
   group by jugador, bloque
  having count(*) >= 4
  on conflict do nothing;

  -- ------------------------------------------------ 21 días sin jugar
  for v_user in
    select u.id, u.nombre
      from public.users u
     where not exists (
       select 1 from public.matches m
        where m.estado = 'confirmado'
          and u.id = any (m.pareja_a || m.pareja_b)
          and m.fecha > now() - interval '21 days'
     )
     and u.created_at < now() - interval '21 days'
  loop
    perform public.avisar(
      v_user.id, 'inactividad',
      'Hace rato no juegas',
      'Tu ELO no baja por no jugar, pero el tablón está lleno de gente buscando cuarto.',
      '/tablon', null,
      -- una vez cada 21 días, no todos los días
      ('00000000-0000-0000-0000-' || to_char(now(), 'YYYYMMDD') || '0000')::uuid
    );
  end loop;

  -- ------------------------- todavía sin nombre de usuario, tras 3 días
  for v_user in
    select id from public.users
     where username is null and created_at < now() - interval '3 days'
  loop
    perform public.avisar(
      v_user.id, 'sin_usuario',
      'Ponte un nombre de usuario',
      'Es lo que permite que te encuentren y te sigan. Se cambia desde tu perfil.',
      '/perfil', null, v_user.id
    );
  end loop;
end;
$FN$;

-- Partidos que empiezan dentro de una hora. Se llama cada hora, no cada día.
create or replace function public.avisar_partidos_proximos()
returns void
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_match   public.matches;
  v_jugador uuid;
begin
  for v_match in
    select * from public.matches
     where estado = 'pendiente'
       and fecha between now() + interval '50 minutes' and now() + interval '70 minutes'
  loop
    foreach v_jugador in array (v_match.pareja_a || v_match.pareja_b) loop
      perform public.avisar(
        v_jugador, 'partido_pronto',
        'Tu partido es dentro de una hora',
        null, '/partidos/' || v_match.id, null, v_match.id
      );
    end loop;
  end loop;
end;
$FN$;

-- ---------------------------------------------------------------------------
-- Programación.
--
-- Si pg_cron no está habilitado, esto falla sin romper el resto: se activa
-- desde Database > Extensions en el panel de Supabase y se vuelve a ejecutar.
-- ---------------------------------------------------------------------------
do $CRON$
begin
  create extension if not exists pg_cron;

  perform cron.unschedule('reboteapp-diario')
    where exists (select 1 from cron.job where jobname = 'reboteapp-diario');
  perform cron.unschedule('reboteapp-horario')
    where exists (select 1 from cron.job where jobname = 'reboteapp-horario');

  -- 13:00 UTC = 8 de la mañana en Cartagena
  perform cron.schedule('reboteapp-diario', '0 13 * * *',
                        'select public.tareas_periodicas()');
  perform cron.schedule('reboteapp-horario', '0 * * * *',
                        'select public.avisar_partidos_proximos()');
exception when others then
  raise notice 'pg_cron no disponible: %. Habilítalo y vuelve a ejecutar este bloque.',
    sqlerrm;
end;
$CRON$;
