-- =============================================================================
-- Me gusta en historias, mensajes directos y compartir publicaciones.
--
-- Lo delicado aquí son las políticas de las conversaciones. La regla es simple
-- —solo lees lo tuyo— pero escrita de la forma obvia se muerde la cola: la
-- política de `conversation_participants` tendría que consultar
-- `conversation_participants` para saber si puedes verla, y Postgres corta con
-- un error de recursión infinita.
--
-- Se resuelve con `es_participante`, una función SECURITY DEFINER. Al ejecutarse
-- con los permisos de quien la creó, la consulta de dentro no vuelve a pasar por
-- las políticas y la recursión no llega a existir.
-- =============================================================================


-- ===========================================================================
-- ME GUSTA EN HISTORIAS
-- ===========================================================================
create table if not exists public.story_likes (
  story_id   uuid not null references public.stories (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create index if not exists story_likes_story_idx
  on public.story_likes (story_id, created_at desc);

alter table public.story_likes enable row level security;

-- se puede dar me gusta a lo que se puede ver, y nada más
drop policy if exists story_likes_insert on public.story_likes;
create policy story_likes_insert on public.story_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.stories s
       where s.id = story_id
         and s.expira_at > now()
         and public.puede_ver_feed_de(s.user_id)
    )
  );

drop policy if exists story_likes_delete on public.story_likes;
create policy story_likes_delete on public.story_likes
  for delete to authenticated using (user_id = (select auth.uid()));

-- quien publicó ve quién le dio me gusta; cada quien ve los suyos
drop policy if exists story_likes_select on public.story_likes;
create policy story_likes_select on public.story_likes
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.stories s
       where s.id = story_id and s.user_id = (select auth.uid())
    )
  );

revoke update on public.story_likes from anon, authenticated;

/** Quiénes le dieron me gusta a una historia. Solo para quien la publicó. */
create or replace function public.likes_de_historia(p_story uuid)
returns table (user_id uuid, nombre text, username text, foto_url text, cuando timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.nombre, u.username, u.foto_url, l.created_at
    from public.story_likes l
    join public.users u on u.id = l.user_id
   where l.story_id = p_story
     and exists (
       select 1 from public.stories s
        where s.id = p_story and s.user_id = auth.uid()
     )
   order by l.created_at desc;
$$;

revoke execute on function public.likes_de_historia(uuid) from anon;
grant execute on function public.likes_de_historia(uuid) to authenticated;


-- ===========================================================================
-- CONVERSACIONES
-- ===========================================================================
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  es_grupal  boolean not null default false,
  -- Para las de dos: los dos ids ordenados. Es lo que impide que existan dos
  -- conversaciones entre las mismas personas si dos mensajes salen a la vez.
  -- Un índice único vale más que comprobarlo antes de insertar, que siempre
  -- deja una rendija entre la comprobación y la escritura.
  clave      text unique,
  created_at timestamptz not null default now(),
  constraint clave_solo_en_las_de_dos check (es_grupal or clave is not null)
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create index if not exists participantes_usuario_idx
  on public.conversation_participants (user_id);

create table if not exists public.messages (
  id                 uuid primary key default gen_random_uuid(),
  conversation_id    uuid not null references public.conversations (id) on delete cascade,
  sender_id          uuid not null references public.users (id) on delete cascade,
  contenido          text check (contenido is null or char_length(contenido) between 1 and 2000),
  -- cuando el mensaje ES una publicación compartida, se guarda la referencia y
  -- no una copia: si el autor la borra o le cambia el pie, el chat no se queda
  -- enseñando algo que ya no existe
  post_compartido_id uuid references public.feed_posts (id) on delete set null,
  created_at         timestamptz not null default now(),
  constraint mensaje_con_algo check (contenido is not null or post_compartido_id is not null)
);

create index if not exists messages_conversacion_idx
  on public.messages (conversation_id, created_at desc);

create table if not exists public.message_reads (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  leido_at   timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_reads_usuario_idx on public.message_reads (user_id);

-- ---------------------------------------------------------------------------
-- La función que rompe la recursión
-- ---------------------------------------------------------------------------
create or replace function public.es_participante(p_conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
     where conversation_id = p_conv and user_id = auth.uid()
  );
$$;

revoke execute on function public.es_participante(uuid) from anon;
grant execute on function public.es_participante(uuid) to authenticated;

-- ------------------------------------------------------------------- políticas
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated using (public.es_participante(id));

drop policy if exists participantes_select on public.conversation_participants;
create policy participantes_select on public.conversation_participants
  for select to authenticated using (public.es_participante(conversation_id));

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated using (public.es_participante(conversation_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid()) and public.es_participante(conversation_id)
  );

drop policy if exists lecturas_select on public.message_reads;
create policy lecturas_select on public.message_reads
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists lecturas_insert on public.message_reads;
create policy lecturas_insert on public.message_reads
  for insert to authenticated with check (user_id = (select auth.uid()));

-- crear conversaciones y meter participantes es cosa de las funciones de abajo
revoke insert, update, delete on public.conversations from anon, authenticated;
revoke insert, update, delete on public.conversation_participants from anon, authenticated;
revoke update, delete on public.messages from anon, authenticated;
revoke update, delete on public.message_reads from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Abrir la conversación con alguien, creándola si hace falta.
--
-- No se puede escribir a cualquiera: hace falta que alguno de los dos siga al
-- otro. Sin esa condición, el buzón se convierte en la puerta por la que entra
-- todo el que quiera escribirle a una desconocida.
-- ---------------------------------------------------------------------------
create or replace function public.conversacion_con(p_usuario uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_clave text;
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  if v_uid = p_usuario then
    raise exception 'No puedes escribirte a ti mismo';
  end if;

  if not exists (
    select 1 from public.follows
     where estado = 'aceptado'
       and ((follower_id = v_uid and followed_id = p_usuario)
         or (follower_id = p_usuario and followed_id = v_uid))
  ) then
    raise exception 'Solo puedes escribirle a alguien que sigues o que te sigue';
  end if;

  v_clave := least(v_uid::text, p_usuario::text) || ':' ||
             greatest(v_uid::text, p_usuario::text);

  select id into v_id from public.conversations where clave = v_clave;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.conversations (es_grupal, clave)
  values (false, v_clave)
  on conflict (clave) do nothing
  returning id into v_id;

  -- si dos mensajes salieron a la vez, el índice único dejó pasar solo uno y
  -- aquí se recoge el que ganó
  if v_id is null then
    select id into v_id from public.conversations where clave = v_clave;
    return v_id;
  end if;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_id, v_uid), (v_id, p_usuario);

  return v_id;
end;
$$;

revoke execute on function public.conversacion_con(uuid) from anon;
grant execute on function public.conversacion_con(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- La bandeja: una fila por conversación, con lo justo para pintarla.
-- ---------------------------------------------------------------------------
create or replace function public.mis_conversaciones()
returns table (
  conversation_id uuid,
  otro_id         uuid,
  otro_nombre     text,
  otro_username   text,
  otro_foto       text,
  ultimo_texto    text,
  ultimo_es_post  boolean,
  ultimo_at       timestamptz,
  ultimo_mio      boolean,
  sin_leer        integer
)
language sql
stable
security definer
set search_path = public
as $$
  with yo as (select auth.uid() as id),
  mias as (
    select p.conversation_id
      from public.conversation_participants p, yo
     where p.user_id = yo.id
  ),
  otro as (
    select p.conversation_id, u.id, u.nombre, u.username, u.foto_url
      from public.conversation_participants p
      join public.users u on u.id = p.user_id, yo
     where p.conversation_id in (select conversation_id from mias)
       and p.user_id <> yo.id
  ),
  ultimo as (
    select distinct on (m.conversation_id)
           m.conversation_id, m.contenido, m.post_compartido_id, m.created_at, m.sender_id
      from public.messages m
     where m.conversation_id in (select conversation_id from mias)
     order by m.conversation_id, m.created_at desc
  ),
  pendientes as (
    select m.conversation_id, count(*)::integer as n
      from public.messages m, yo
     where m.conversation_id in (select conversation_id from mias)
       and m.sender_id <> yo.id
       and not exists (
         select 1 from public.message_reads r
          where r.message_id = m.id and r.user_id = yo.id
       )
     group by m.conversation_id
  )
  select o.conversation_id, o.id, o.nombre, o.username, o.foto_url,
         u.contenido,
         u.post_compartido_id is not null,
         u.created_at,
         u.sender_id = (select id from yo),
         coalesce(p.n, 0)
    from otro o
    left join ultimo u on u.conversation_id = o.conversation_id
    left join pendientes p on p.conversation_id = o.conversation_id
   -- las que nunca tuvieron mensaje van al final; el resto por lo más reciente
   order by u.created_at desc nulls last;
$$;

revoke execute on function public.mis_conversaciones() from anon;
grant execute on function public.mis_conversaciones() to authenticated;

-- ---------------------------------------------------------------------------
-- Marcar como leído todo lo que falte de una conversación.
-- ---------------------------------------------------------------------------
create or replace function public.marcar_conversacion_leida(p_conv uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.es_participante(p_conv) then
    return;
  end if;

  insert into public.message_reads (message_id, user_id)
  select m.id, v_uid
    from public.messages m
   where m.conversation_id = p_conv
     and m.sender_id <> v_uid
  on conflict do nothing;
end;
$$;

revoke execute on function public.marcar_conversacion_leida(uuid) from anon;
grant execute on function public.marcar_conversacion_leida(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Compartir una publicación con varias personas de una vez.
--
-- Crea la conversación con quien haga falta. Devuelve a cuántas llegó, que es
-- lo único que el cliente necesita para responder.
-- ---------------------------------------------------------------------------
create or replace function public.compartir_post(p_post uuid, p_usuarios uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_destino uuid;
  v_conv    uuid;
  v_n       integer := 0;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  if not exists (select 1 from public.feed_posts where id = p_post) then
    raise exception 'Esa publicación no existe';
  end if;

  foreach v_destino in array coalesce(p_usuarios, '{}'::uuid[]) loop
    v_conv := public.conversacion_con(v_destino);
    insert into public.messages (conversation_id, sender_id, post_compartido_id)
    values (v_conv, v_uid, p_post);
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

revoke execute on function public.compartir_post(uuid, uuid[]) from anon;
grant execute on function public.compartir_post(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- A quién se le puede compartir: primero los mutuos.
--
-- Quien te sigue y a quien sigues es con quien de verdad hablas. Los demás
-- salen después, porque también valen, pero no son los primeros que uno busca.
-- ---------------------------------------------------------------------------
create or replace function public.gente_para_compartir()
returns table (
  user_id  uuid,
  nombre   text,
  username text,
  foto_url text,
  mutuo    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with yo as (select auth.uid() as id),
  sigo as (
    select followed_id as id from public.follows, yo
     where follower_id = yo.id and estado = 'aceptado'
  ),
  siguen as (
    select follower_id as id from public.follows, yo
     where followed_id = yo.id and estado = 'aceptado'
  ),
  todos as (
    select id, true as mutuo from sigo where id in (select id from siguen)
    union
    select id, false from sigo where id not in (select id from siguen)
    union
    select id, false from siguen where id not in (select id from sigo)
  )
  select u.id, u.nombre, u.username, u.foto_url, t.mutuo
    from todos t
    join public.users u on u.id = t.id
   order by t.mutuo desc, u.nombre;
$$;

revoke execute on function public.gente_para_compartir() from anon;
grant execute on function public.gente_para_compartir() to authenticated;


-- ===========================================================================
-- AVISOS
--
-- Los dos usan la misma tabla `notifications` y la misma función `avisar` que
-- el resto de la app, así que salen al teléfono por el mismo camino que todo lo
-- demás. No hay cola aparte ni entrega distinta.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Mensaje nuevo.
--
-- Todos los avisos de una misma conversación comparten entidad, así que el
-- índice `notifications_sin_repetir` deja una sola fila por conversación: si te
-- escriben quince veces seguidas, tienes un aviso que se actualiza, no quince.
-- Por eso aquí se actualiza a mano en vez de usar `avisar`, que descarta el
-- duplicado en silencio y te dejaría viendo el primer mensaje para siempre.
--
-- Y se vuelve a marcar como no leída para que reaparezca arriba: un mensaje
-- nuevo es nuevo aunque el anterior ya lo hubieras visto.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_mensaje()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_destino uuid;
  v_titulo  text;
  v_cuerpo  text;
begin
  select user_id into v_destino
    from public.conversation_participants
   where conversation_id = new.conversation_id
     and user_id <> new.sender_id
   limit 1;

  if v_destino is null then
    return new;
  end if;

  v_titulo := public.nombre_de(new.sender_id) ||
              case when new.post_compartido_id is not null
                   then ' te compartió una publicación'
                   else ' te escribió' end;

  v_cuerpo := case when new.post_compartido_id is not null
                   then null
                   else left(new.contenido, 120) end;

  update public.notifications
     set titulo = v_titulo,
         cuerpo = v_cuerpo,
         actor_id = new.sender_id,
         leida = false,
         created_at = now()
   where user_id = v_destino
     and tipo = 'mensaje'
     and entidad_id = new.conversation_id;

  if not found then
    insert into public.notifications
      (user_id, tipo, titulo, cuerpo, enlace, actor_id, entidad_id)
    values
      (v_destino, 'mensaje', v_titulo, v_cuerpo,
       '/mensajes/' || new.conversation_id, new.sender_id, new.conversation_id);
  end if;

  return new;
end;
$FN$;

drop trigger if exists messages_avisar on public.messages;
create trigger messages_avisar
  after insert on public.messages
  for each row execute function public.avisar_mensaje();

-- ---------------------------------------------------------------------------
-- Me gusta en una historia, agrupado.
--
-- Una historia dura un día y puede recibir muchos me gusta seguidos. Mandar uno
-- por cada uno sería la forma más rápida de que alguien apague los avisos, así
-- que hay una sola fila por historia y lo que cambia es el texto: "a Juan le
-- gustó", después "a Juan y 2 más". Es el mismo criterio del aviso de mensajes.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_like_historia()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_autor  uuid;
  v_otros  integer;
  v_titulo text;
begin
  select user_id into v_autor from public.stories where id = new.story_id;

  if v_autor is null or v_autor = new.user_id then
    return new;
  end if;

  -- los demás, sin contar a quien acaba de darlo
  select count(*)::integer - 1 into v_otros
    from public.story_likes where story_id = new.story_id;

  v_titulo := 'A ' || public.nombre_de(new.user_id) ||
              case
                when v_otros <= 0 then ' le gustó tu historia'
                when v_otros = 1 then ' y 1 más les gustó tu historia'
                else ' y ' || v_otros || ' más les gustó tu historia'
              end;

  update public.notifications
     set titulo = v_titulo,
         actor_id = new.user_id,
         leida = false,
         created_at = now()
   where user_id = v_autor
     and tipo = 'like_historia'
     and entidad_id = new.story_id;

  if not found then
    insert into public.notifications
      (user_id, tipo, titulo, cuerpo, enlace, actor_id, entidad_id)
    values
      (v_autor, 'like_historia', v_titulo, null, '/social', new.user_id, new.story_id);
  end if;

  return new;
end;
$FN$;

drop trigger if exists story_likes_avisar on public.story_likes;
create trigger story_likes_avisar
  after insert on public.story_likes
  for each row execute function public.avisar_like_historia();


-- ===========================================================================
-- TIEMPO REAL
--
-- Solo `messages`. Es lo único que tiene que llegar mientras la pantalla está
-- abierta; el resto se recarga al entrar y no necesita un canal abierto.
-- ===========================================================================
do $RT$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then
  null;
end;
$RT$;
