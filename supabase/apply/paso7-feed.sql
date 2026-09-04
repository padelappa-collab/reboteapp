-- =============================================================================
-- Feed: seguir a jugadores, publicar, comentar y dar me gusta.
--
-- Decisiones que dan forma a todo lo demás:
--
--  * Una cuenta privada esconde SOLO el feed. El ranking, los partidos y las
--    categorías siguen siendo públicos: un ranking del que la gente se puede
--    esconder deja de ser el retrato de la ciudad, que es justamente su valor.
--
--  * Seguir es asimétrico, como en Instagram. Si la cuenta es privada, la
--    solicitud queda pendiente hasta que su dueño la acepte.
--
--  * Nada se publica solo. Al confirmarse un partido se le sugiere a cada
--    jugador publicarlo, y cada quien decide si lo sube y si le pone foto.
-- =============================================================================

alter table public.users
  add column if not exists cuenta_privada boolean not null default false;

comment on column public.users.cuenta_privada is
  'Solo afecta al feed. El ranking y los partidos siguen siendo públicos.';

-- ------------------------------------------------------------------- seguir
create type follow_estado as enum ('pendiente', 'aceptado');

create table if not exists public.follows (
  follower_id uuid not null references public.users (id) on delete cascade,
  followed_id uuid not null references public.users (id) on delete cascade,
  estado      follow_estado not null default 'aceptado',
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint no_seguirse_a_si_mismo check (follower_id <> followed_id)
);

create index if not exists follows_followed_idx on public.follows (followed_id, estado);

-- -------------------------------------------------------------- publicaciones
create table if not exists public.feed_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  contenido  text check (contenido is null or char_length(contenido) <= 500),
  -- si viene de un partido, la publicación muestra su marcador
  match_id   uuid references public.matches (id) on delete set null,
  imagen_url text,
  created_at timestamptz not null default now(),
  -- una publicación vacía no es nada: o dice algo, o trae foto, o es un partido
  constraint publicacion_con_algo check (
    contenido is not null or imagen_url is not null or match_id is not null
  )
);

create index if not exists feed_posts_user_fecha_idx
  on public.feed_posts (user_id, created_at desc);
create index if not exists feed_posts_fecha_idx on public.feed_posts (created_at desc);

-- Cada jugador publica un partido una sola vez.
create unique index if not exists feed_posts_partido_unico
  on public.feed_posts (user_id, match_id) where match_id is not null;

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.feed_posts (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  contenido  text not null check (char_length(btrim(contenido)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);

create table if not exists public.post_likes (
  post_id    uuid not null references public.feed_posts (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Quién puede ver el feed de quién.
-- ---------------------------------------------------------------------------
create or replace function public.puede_ver_feed_de(p_autor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_autor = (select auth.uid()) then true
    when not (select cuenta_privada from public.users where id = p_autor) then true
    else exists (
      select 1 from public.follows f
       where f.followed_id = p_autor
         and f.follower_id = (select auth.uid())
         and f.estado = 'aceptado'
    )
  end;
$$;

-- ------------------------------------------------------------------------ RLS
alter table public.follows enable row level security;
alter table public.feed_posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;

-- follows: se ven todos (para contar seguidores), cada quien crea y borra los suyos
create policy follows_select on public.follows
  for select to authenticated using (true);

create policy follows_insert on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()));

create policy follows_delete on public.follows
  for delete to authenticated
  using (
    follower_id = (select auth.uid()) or followed_id = (select auth.uid())
  );

-- aceptar una solicitud es cosa de quien la recibe
create policy follows_update_aceptar on public.follows
  for update to authenticated
  using (followed_id = (select auth.uid()))
  with check (followed_id = (select auth.uid()));

-- publicaciones
create policy feed_posts_select on public.feed_posts
  for select to authenticated
  using (public.puede_ver_feed_de(user_id));

create policy feed_posts_insert on public.feed_posts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy feed_posts_update on public.feed_posts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy feed_posts_delete on public.feed_posts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- comentarios: se ven si se puede ver la publicación
create policy comments_select on public.comments
  for select to authenticated
  using (
    exists (
      select 1 from public.feed_posts p
       where p.id = post_id and public.puede_ver_feed_de(p.user_id)
    )
  );

create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.feed_posts p
       where p.id = post_id and public.puede_ver_feed_de(p.user_id)
    )
  );

-- borra el suyo, o el dueño de la publicación limpia la suya
create policy comments_delete on public.comments
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.feed_posts p
       where p.id = post_id and p.user_id = (select auth.uid())
    )
  );

-- me gusta
create policy post_likes_select on public.post_likes
  for select to authenticated
  using (
    exists (
      select 1 from public.feed_posts p
       where p.id = post_id and public.puede_ver_feed_de(p.user_id)
    )
  );

create policy post_likes_insert on public.post_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.feed_posts p
       where p.id = post_id and public.puede_ver_feed_de(p.user_id)
    )
  );

create policy post_likes_delete on public.post_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Seguir a alguien: la solicitud queda pendiente si su cuenta es privada.
-- ---------------------------------------------------------------------------
create or replace function public.seguir(p_usuario uuid)
returns follow_estado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_privada boolean;
  v_estado  follow_estado;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  if v_uid = p_usuario then
    raise exception 'No puedes seguirte a ti mismo';
  end if;

  select cuenta_privada into v_privada from public.users where id = p_usuario;
  if v_privada is null then
    raise exception 'Ese jugador no existe';
  end if;

  v_estado := case when v_privada then 'pendiente' else 'aceptado' end::follow_estado;

  insert into public.follows (follower_id, followed_id, estado)
  values (v_uid, p_usuario, v_estado)
  on conflict (follower_id, followed_id) do nothing;

  select estado into v_estado
    from public.follows
   where follower_id = v_uid and followed_id = p_usuario;

  return v_estado;
end;
$$;

revoke execute on function public.seguir(uuid) from anon;

-- ---------------------------------------------------------------------------
-- Insignias del feed.
-- ---------------------------------------------------------------------------
create or replace function public.badges_al_publicar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.otorgar_insignia(new.user_id, 'primer_post');
  return new;
end;
$$;

drop trigger if exists feed_posts_insignia on public.feed_posts;

create trigger feed_posts_insignia
  after insert on public.feed_posts
  for each row execute function public.badges_al_publicar();

create or replace function public.badges_al_comentar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mios integer;
begin
  -- solo cuentan los comentarios en publicaciones ajenas
  select count(*) into v_mios
    from public.comments c
    join public.feed_posts p on p.id = c.post_id
   where c.user_id = new.user_id and p.user_id <> new.user_id;

  if v_mios >= 10 then
    perform public.otorgar_insignia(new.user_id, 'comentarista');
  end if;

  return new;
end;
$$;

drop trigger if exists comments_insignia on public.comments;

create trigger comments_insignia
  after insert on public.comments
  for each row execute function public.badges_al_comentar();

-- ---------------------------------------------------------------------------
-- Almacenamiento de imágenes.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('feed-images', 'feed-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada jugador escribe solo en su propia carpeta, que lleva su id.
create policy "imagenes propias: subir"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('feed-images', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "imagenes propias: borrar"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('feed-images', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "imagenes: leer"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('feed-images', 'avatars'));
