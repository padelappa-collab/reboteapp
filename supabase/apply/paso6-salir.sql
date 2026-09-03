-- =============================================================================
-- PENDIENTE: salir de una publicacion, quitar el borrado de partidos y
-- enlazar la publicacion con el partido que sale de ella.
-- Ejecutar completo, una sola vez.
-- =============================================================================

-- =============================================================================
-- Un partido no se borra: se sale de él.
--
-- Antes quien lo creaba podía borrarlo entero, lo que le daba poder sobre un
-- registro que también es de los otros tres. Ahora la única salida es salirse
-- uno mismo, que queda anotado con nombre y deja rastro de lo que pasó.
-- =============================================================================

drop policy if exists matches_delete_creador on public.matches;

revoke delete on public.matches from anon, authenticated;

-- =============================================================================
-- Salirse de una publicación del tablón.
--
-- Antes solo podía bajarse quien se había apuntado. Quien publicó únicamente
-- podía cancelar la publicación entera, o sea decidir por los demás, y quien
-- iba como acompañante no tenía salida ninguna.
--
-- Ahora cualquiera de los que van puede salirse solo, y la publicación sigue en
-- pie para el resto con un cupo más libre. Si el que se va es el autor, la
-- publicación pasa a nombre de otro de los que quedan; si no queda nadie, se
-- borra, porque una publicación sin jugadores no es nada.
-- =============================================================================

create or replace function public.salir_publicacion(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post      public.board_posts;
  v_uid       uuid := auth.uid();
  v_heredero  uuid;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;

  select * into v_post from public.board_posts where id = p_post_id for update;

  if v_post.id is null then
    raise exception 'La publicación no existe';
  end if;

  -- Caso 1: me había apuntado. Basta con quitar la inscripción.
  if exists (
    select 1 from public.board_post_signups
     where post_id = p_post_id and user_id = v_uid
  ) then
    delete from public.board_post_signups
     where post_id = p_post_id and user_id = v_uid;
    return;
  end if;

  -- Caso 2: iba como acompañante. Salgo del arreglo y se libera un cupo.
  if v_uid = any (v_post.acompanantes) then
    update public.board_posts
       set acompanantes = array_remove(acompanantes, v_uid),
           estado = case when estado = 'completo' then 'abierto' else estado end
     where id = p_post_id;
    return;
  end if;

  -- Caso 3: soy quien publicó. La publicación pasa a otro de los que quedan.
  if v_uid = v_post.user_id then
    -- primero un acompañante; si no hay, alguien de los apuntados
    v_heredero := v_post.acompanantes[1];

    if v_heredero is null then
      select user_id into v_heredero
        from public.board_post_signups
       where post_id = p_post_id
       order by created_at
       limit 1;
    end if;

    if v_heredero is null then
      -- nadie más va: la publicación deja de tener sentido
      delete from public.board_posts where id = p_post_id;
      return;
    end if;

    -- el heredero deja de ocupar su puesto anterior y pasa a ser el autor
    delete from public.board_post_signups
     where post_id = p_post_id and user_id = v_heredero;

    update public.board_posts
       set user_id = v_heredero,
           acompanantes = array_remove(acompanantes, v_heredero),
           estado = case when estado = 'completo' then 'abierto' else estado end
     where id = p_post_id;
    return;
  end if;

  raise exception 'No estás en esta publicación';
end;
$$;

revoke execute on function public.salir_publicacion(uuid) from anon;

-- =============================================================================
-- La publicación recuerda qué partido salió de ella.
--
-- Sin este enlace, el tablón seguía ofreciendo "salirme del partido" incluso
-- después de que el resultado ya estaba registrado, cuando salirse ya no
-- significa nada: el partido existe con esos cuatro jugadores y lo que toca es
-- confirmarlo o salirse desde su propia ficha.
-- =============================================================================

alter table public.board_posts
  add column if not exists match_id uuid
    references public.matches (id) on delete set null;

comment on column public.board_posts.match_id is
  'El partido que se registró desde esta publicación, si ya se registró.';

-- Cualquiera de los cuatro puede registrar el partido, no solo quien publicó,
-- así que el enlace no puede depender de la política de escritura del autor.
create or replace function public.vincular_partido(p_post_id uuid, p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post  public.board_posts;
  v_match public.matches;
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;

  select * into v_post from public.board_posts where id = p_post_id for update;
  select * into v_match from public.matches where id = p_match_id;

  if v_post.id is null or v_match.id is null then
    raise exception 'La publicación o el partido no existen';
  end if;

  -- quien enlaza tiene que estar en el partido
  if not (v_uid = any (v_match.pareja_a || v_match.pareja_b)) then
    raise exception 'Solo los jugadores del partido pueden enlazarlo';
  end if;

  -- y tiene que estar también en la publicación
  if not (
    v_uid = v_post.user_id
    or v_uid = any (v_post.acompanantes)
    or exists (
      select 1 from public.board_post_signups
       where post_id = p_post_id and user_id = v_uid
    )
  ) then
    raise exception 'No estás en esta publicación';
  end if;

  update public.board_posts
     set match_id = p_match_id,
         estado = 'completo'
   where id = p_post_id;
end;
$$;

revoke execute on function public.vincular_partido(uuid, uuid) from anon;
