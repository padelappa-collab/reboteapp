-- =============================================================================
-- Historias: lo que se publica para que dure un día.
--
-- El feed guarda lo que quieres que quede —el partido que ganaste, la foto con
-- tu pareja— y las historias son para lo otro: "estoy en la cancha", "falta uno
-- para las 7". Cosas que a las veinticuatro horas ya no le importan a nadie, y
-- que por eso mismo se publican sin pensarlas tanto.
--
-- Solo se ven las de quien sigues. No hay listas de mejores amigos ni círculos:
-- la relación de seguir que ya existe decide quién ve qué, igual que en el feed.
-- =============================================================================

create table if not exists public.stories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  imagen_url text not null,
  created_at timestamptz not null default now(),
  -- columna normal y no generada: `timestamptz + interval` no está marcada como
  -- inmutable y Postgres no la admite en una columna generada
  expira_at  timestamptz not null default (now() + interval '24 hours')
);

create index if not exists stories_autor_idx on public.stories (user_id, created_at desc);
create index if not exists stories_expira_idx on public.stories (expira_at);

create table if not exists public.story_views (
  story_id  uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null references public.users (id) on delete cascade,
  visto_at  timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create index if not exists story_views_viewer_idx on public.story_views (viewer_id);

-- ---------------------------------------------------------------------------
-- Quién ve qué
--
-- Las mismas reglas del feed: `puede_ver_feed_de` ya sabe si una cuenta es
-- pública o si la sigues con la solicitud aceptada. Reutilizarla evita que la
-- privacidad se defina dos veces y acabe diciendo cosas distintas en cada
-- sitio.
--
-- Y las vencidas no las ve nadie, ni siquiera antes de que pase el limpiador:
-- que una historia caduque no puede depender de a qué hora corrió un cron.
-- ---------------------------------------------------------------------------
alter table public.stories enable row level security;
alter table public.story_views enable row level security;

drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to authenticated
  using (expira_at > now() and public.puede_ver_feed_de(user_id));

drop policy if exists stories_insert on public.stories;
create policy stories_insert on public.stories
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists stories_delete on public.stories;
create policy stories_delete on public.stories
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- quien publicó puede ver quién la vio; cada quien puede ver sus propias vistas
drop policy if exists story_views_select on public.story_views;
create policy story_views_select on public.story_views
  for select to authenticated
  using (
    viewer_id = (select auth.uid())
    or exists (
      select 1 from public.stories s
       where s.id = story_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists story_views_insert on public.story_views;
create policy story_views_insert on public.story_views
  for insert to authenticated
  with check (viewer_id = (select auth.uid()));

revoke update on public.stories from anon, authenticated;
revoke update on public.story_views from anon, authenticated;

-- ---------------------------------------------------------------------------
-- La barra de historias: una entrada por persona, no por historia.
--
-- Va ordenada por lo que hace falta mirar: primero la tuya —para poder subir
-- una—, después quien tiene algo sin ver, y dentro de cada grupo lo más
-- reciente. Es el orden que hace que no haya que recorrer la fila entera para
-- encontrar lo nuevo.
-- ---------------------------------------------------------------------------
create or replace function public.historias_activas()
returns table (
  user_id  uuid,
  nombre   text,
  username text,
  foto_url text,
  total    integer,
  sin_ver  integer,
  ultima   timestamptz,
  soy_yo   boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with yo as (select auth.uid() as id)
  select u.id, u.nombre, u.username, u.foto_url,
         count(*)::integer,
         count(*) filter (where v.story_id is null)::integer,
         max(s.created_at),
         u.id = (select id from yo)
    from public.stories s
    join public.users u on u.id = s.user_id
    left join public.story_views v
           on v.story_id = s.id and v.viewer_id = (select id from yo)
   where s.expira_at > now()
     and (
       u.id = (select id from yo)
       or exists (
         select 1 from public.follows f
          where f.follower_id = (select id from yo)
            and f.followed_id = u.id
            and f.estado = 'aceptado'
       )
     )
   group by u.id, u.nombre, u.username, u.foto_url
   order by (u.id = (select id from yo)) desc,
            (count(*) filter (where v.story_id is null) > 0) desc,
            max(s.created_at) desc;
$$;

revoke execute on function public.historias_activas() from anon;
grant execute on function public.historias_activas() to authenticated;

-- ---------------------------------------------------------------------------
-- Las historias de una persona, en orden, diciendo cuáles ya viste.
-- ---------------------------------------------------------------------------
create or replace function public.historias_de(p_usuario uuid)
returns table (
  id         uuid,
  imagen_url text,
  created_at timestamptz,
  visto      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.imagen_url, s.created_at,
         v.story_id is not null
    from public.stories s
    left join public.story_views v
           on v.story_id = s.id and v.viewer_id = auth.uid()
   where s.user_id = p_usuario
     and s.expira_at > now()
     and (p_usuario = auth.uid() or public.puede_ver_feed_de(p_usuario))
   order by s.created_at;
$$;

revoke execute on function public.historias_de(uuid) from anon;
grant execute on function public.historias_de(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Marcar como vista. Idempotente: verla otra vez no cambia nada.
-- ---------------------------------------------------------------------------
create or replace function public.ver_historia(p_story uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.story_views (story_id, viewer_id)
  values (p_story, auth.uid())
  on conflict do nothing;
end;
$$;

revoke execute on function public.ver_historia(uuid) from anon;
grant execute on function public.ver_historia(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- El limpiador.
--
-- Cada hora y no cada día: una historia que caducó a las nueve de la mañana no
-- puede seguir ocupando espacio hasta el día siguiente. Las vistas se van solas
-- por la cascada de la clave foránea.
--
-- Las imágenes del storage no se borran aquí. Se podrían, pero hacerlo desde
-- SQL exige credenciales de servicio dentro de la base, y no compensa: son
-- fotos pequeñas en un bucket que ya guarda las del feed.
-- ---------------------------------------------------------------------------
create or replace function public.limpiar_historias()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_borradas integer;
begin
  delete from public.stories where expira_at <= now();
  get diagnostics v_borradas = row_count;
  return v_borradas;
end;
$$;

do $CRON$
begin
  create extension if not exists pg_cron;

  perform cron.unschedule('reboteapp-historias')
    where exists (select 1 from cron.job where jobname = 'reboteapp-historias');

  perform cron.schedule('reboteapp-historias', '7 * * * *',
                        'select public.limpiar_historias()');
exception when others then
  raise notice 'pg_cron no disponible: %', sqlerrm;
end;
$CRON$;
