-- =============================================================================
-- Avisar cuando alguien se sale de una publicación del tablón.
--
-- Entrar avisaba; salirse no. Y es el aviso que más falta hace: quien se queda
-- con un cupo libre a dos horas del partido necesita enterarse para buscar
-- reemplazo, mientras que enterarse de que alguien se unió puede esperar.
--
-- Los avisos de salida no llevan entidad. El índice `notifications_sin_repetir`
-- existe para los eventos que solo ocurren una vez —una insignia se gana una
-- sola vez, un torneo termina una sola vez— y ahí evita el aviso duplicado.
-- Salirse no es de esos: alguien puede entrar y salirse dos veces la misma
-- semana, y el segundo aviso importa tanto como el primero. Con entidad, el
-- índice se lo tragaría en silencio.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Alguien que se había apuntado se baja.
--
-- Este trigger cubre también la salida hecha por fuera de salir_publicacion,
-- que es justo el motivo de ponerlo en la base y no en el cliente.
--
-- Si la publicación entera desapareció, el autor sale nulo y `avisar` no hace
-- nada: al borrarse la publicación, sus inscripciones caen en cascada y no
-- tiene sentido avisar de cada una.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_salida_tablon()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_autor uuid;
begin
  select user_id into v_autor from public.board_posts where id = old.post_id;

  -- cuando el autor se va, salir_publicacion asciende primero al heredero, así
  -- que aquí el autor ya es quien se está borrando la inscripción: ese caso lo
  -- avisa la función, con el texto que corresponde
  if v_autor is not null and v_autor <> old.user_id then
    perform public.avisar(
      v_autor, 'tablon_salida',
      public.nombre_de(old.user_id) || ' se salió de tu partido',
      'Quedó un cupo libre.',
      '/tablon/' || old.post_id, old.user_id
    );
  end if;

  return old;
end;
$FN$;

drop trigger if exists board_signups_avisar_salida on public.board_post_signups;
create trigger board_signups_avisar_salida
  after delete on public.board_post_signups
  for each row execute function public.avisar_salida_tablon();

-- ---------------------------------------------------------------------------
-- Salirse de una publicación, ahora avisando.
--
-- Cambia además el orden del caso 3: el heredero se asciende ANTES de borrar su
-- inscripción. Al revés, el trigger de arriba veía al autor viejo todavía en la
-- publicación y le avisaba de que el heredero "se salió", cuando lo que hizo
-- fue quedarse y heredarla.
-- ---------------------------------------------------------------------------
create or replace function public.salir_publicacion(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post     public.board_posts;
  v_uid      uuid := auth.uid();
  v_heredero uuid;
  v_otro     uuid;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;

  select * into v_post from public.board_posts where id = p_post_id for update;

  if v_post.id is null then
    raise exception 'La publicación no existe';
  end if;

  -- Caso 1: me había apuntado. Basta con quitar la inscripción; el aviso lo
  -- manda el trigger.
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

    perform public.avisar(
      v_post.user_id, 'tablon_salida',
      public.nombre_de(v_uid) || ' se salió de tu partido',
      'Quedó un cupo libre.',
      '/tablon/' || p_post_id, v_uid
    );
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

    update public.board_posts
       set user_id = v_heredero,
           acompanantes = array_remove(acompanantes, v_heredero),
           estado = case when estado = 'completo' then 'abierto' else estado end
     where id = p_post_id;

    -- ya es el autor: borrar su inscripción no dispara el aviso de salida
    delete from public.board_post_signups
     where post_id = p_post_id and user_id = v_heredero;

    -- al que hereda hay que decirle que ahora la publicación es suya, porque
    -- de eso dependen cosas que antes no podía hacer
    perform public.avisar(
      v_heredero, 'tablon_salida',
      public.nombre_de(v_uid) || ' se salió del partido',
      'La publicación quedó a tu nombre.',
      '/tablon/' || p_post_id, v_uid
    );

    -- y a los demás, que se fue uno
    for v_otro in
      select user_id from public.board_post_signups where post_id = p_post_id
      union
      select unnest(acompanantes) from public.board_posts where id = p_post_id
    loop
      perform public.avisar(
        v_otro, 'tablon_salida',
        public.nombre_de(v_uid) || ' se salió del partido',
        'Quedó un cupo libre.',
        '/tablon/' || p_post_id, v_uid
      );
    end loop;
    return;
  end if;

  raise exception 'No estás en esta publicación';
end;
$$;

revoke execute on function public.salir_publicacion(uuid) from anon;
