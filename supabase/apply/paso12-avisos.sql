-- =============================================================================
-- Los avisos que faltaban.
--
-- Repaso de todo lo que puede pasarle a un jugador sin que nadie se lo diga.
-- El criterio para decidir qué merece aviso es uno solo: si te enteras tarde,
-- ¿pierdes algo? Que alguien se salga de tu partido a dos horas de jugar te
-- deja sin cuarto; que se registre el resultado de tu torneo mueve tu ELO sin
-- que lo veas venir. Eso avisa. El ruido decorativo, no.
--
-- Ninguno de estos avisos lleva entidad. El índice `notifications_sin_repetir`
-- está pensado para eventos que ocurren una sola vez —una insignia se gana una
-- vez, un torneo termina una vez— y ahí evita el duplicado. Estos no son de
-- esos: alguien puede entrar y salirse del mismo partido dos veces, y una
-- pareja puede retirarse, volver a inscribirse y retirarse otra vez. Con
-- entidad, el índice se tragaría el segundo aviso en silencio.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLÓN: alguien se sale
--
-- Entrar avisaba desde el principio; salirse no, que es el que de verdad hace
-- falta. Va como trigger sobre el borrado para que valga también si la salida
-- ocurre por fuera de `salir_publicacion`.
--
-- Si la publicación entera desapareció, el autor sale nulo y `avisar` no hace
-- nada: al borrarse una publicación caen sus inscripciones en cascada, y no
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

  -- cuando el autor se va, `salir_publicacion` asciende antes al heredero, así
  -- que aquí el autor ya es quien borra su inscripción: ese caso lo avisa la
  -- función, con el texto que corresponde
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
-- 2. TABLÓN: la publicación se llenó
--
-- El autor publicó buscando gente; que ya no le falte nadie es justo el
-- desenlace que estaba esperando.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_tablon_completo()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
begin
  if old.estado <> 'completo' and new.estado = 'completo' then
    perform public.avisar(
      new.user_id, 'tablon_completo',
      'Tu partido ya está completo',
      'Ya no falta nadie.',
      '/tablon/' || new.id
    );
  end if;
  return new;
end;
$FN$;

drop trigger if exists board_posts_avisar_completo on public.board_posts;
create trigger board_posts_avisar_completo
  after update on public.board_posts
  for each row execute function public.avisar_tablon_completo();

-- ---------------------------------------------------------------------------
-- 3. TABLÓN: salirse, ahora avisando
--
-- Cambia además el orden del caso 3: el heredero se asciende ANTES de borrar
-- su inscripción. Al revés, el trigger de arriba veía al autor viejo todavía
-- en la publicación y le avisaba de que el heredero "se salió", cuando lo que
-- hizo fue quedarse y heredarla.
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

    -- al que hereda hay que decirle que la publicación es suya, porque de eso
    -- dependen cosas que antes no podía hacer
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

-- ---------------------------------------------------------------------------
-- 4. TORNEOS: la cancelación tiene que llegarle a todos
--
-- Este es el que reportaste. El trigger solo recorría las parejas en estado
-- 'aceptada', así que quien había sido inscrito por su compañero y todavía no
-- aceptaba se quedaba sin enterarse de que el torneo se cayó — y es justo a
-- quien más le sirve saberlo, porque tenía una decisión pendiente.
--
-- Empezar y terminar siguen siendo solo para las aceptadas: quien no llegó a
-- confirmar no juega, y no le importa contra quién le tocaba.
-- ---------------------------------------------------------------------------
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

  if new.estado = 'cancelado' then
    -- todas las parejas, hayan aceptado o no
    for v_jugador in
      select unnest(array[jugador_a, jugador_b])
        from public.tournament_pairs
       where tournament_id = new.id
    loop
      perform public.avisar(
        v_jugador, 'torneo_cancelado',
        'Se canceló ' || new.nombre,
        'El torneo no se va a jugar.', '/torneos/' || new.id, null, new.id
      );
    end loop;
    return new;
  end if;

  for v_jugador in
    select unnest(array[jugador_a, jugador_b])
      from public.tournament_pairs
     where tournament_id = new.id and estado = 'aceptada'
  loop
    if new.estado = 'en_curso' then
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

-- ---------------------------------------------------------------------------
-- 5. TORNEOS: tu compañero aceptó
--
-- Inscribir a alguien avisaba; que ese alguien aceptara, no. Quien inscribió se
-- quedaba mirando un "pendiente" sin saber cuándo dejaba de serlo, y el
-- organizador no se enteraba de que ya tenía una pareja más en firme.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_pareja_aceptada()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_torneo public.tournaments;
begin
  if old.estado = new.estado or new.estado <> 'aceptada' then
    return new;
  end if;

  select * into v_torneo from public.tournaments where id = new.tournament_id;

  perform public.avisar(
    new.jugador_a, 'torneo_inscripcion',
    public.nombre_de(new.jugador_b) || ' aceptó jugar contigo',
    'Ya están inscritos en ' || v_torneo.nombre || '.',
    '/torneos/' || new.tournament_id, new.jugador_b
  );

  perform public.avisar(
    v_torneo.organizador_id, 'torneo_inscripcion',
    'Nueva pareja en ' || v_torneo.nombre,
    public.nombre_de(new.jugador_a) || ' y ' || public.nombre_de(new.jugador_b) || '.',
    '/torneos/' || new.tournament_id
  );

  return new;
end;
$FN$;

drop trigger if exists pairs_avisar_aceptada on public.tournament_pairs;
create trigger pairs_avisar_aceptada
  after update on public.tournament_pairs
  for each row execute function public.avisar_pareja_aceptada();

-- ---------------------------------------------------------------------------
-- 6. TORNEOS: una pareja se retira
--
-- Al organizador le cambia el cuadro y puede que tenga que buscar reemplazo
-- antes de sortear. Al compañero lo deja fuera del torneo sin haber hecho nada.
--
-- Si el torneo entero desapareció, el organizador sale nulo y no se avisa: las
-- parejas caen en cascada y avisar de cada una sería ruido sobre algo que ya no
-- existe.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_pareja_retirada()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_torneo public.tournaments;
  v_quien  uuid := auth.uid();
begin
  select * into v_torneo from public.tournaments where id = old.tournament_id;

  if v_torneo.id is null then
    return old;
  end if;

  perform public.avisar(
    v_torneo.organizador_id, 'torneo_retiro',
    'Una pareja se retiró de ' || v_torneo.nombre,
    public.nombre_de(old.jugador_a) || ' y ' || public.nombre_de(old.jugador_b) || '.',
    '/torneos/' || old.tournament_id, v_quien
  );

  perform public.avisar(
    old.jugador_a, 'torneo_retiro',
    'Tu pareja salió de ' || v_torneo.nombre,
    'Puedes volver a inscribirte con alguien más.',
    '/torneos/' || old.tournament_id, v_quien
  );

  perform public.avisar(
    old.jugador_b, 'torneo_retiro',
    'Tu pareja salió de ' || v_torneo.nombre,
    'Puedes volver a inscribirte con alguien más.',
    '/torneos/' || old.tournament_id, v_quien
  );

  return old;
end;
$FN$;

drop trigger if exists pairs_avisar_retiro on public.tournament_pairs;
create trigger pairs_avisar_retiro
  after delete on public.tournament_pairs
  for each row execute function public.avisar_pareja_retirada();

-- ---------------------------------------------------------------------------
-- 7. TORNEOS: se registró un resultado
--
-- En un torneo el organizador anota el marcador sin que los cuatro confirmen,
-- así que el ELO se mueve sin que el jugador haya tocado nada. Enterarse no es
-- un lujo: es la única forma de reclamar si quedó mal anotado.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_resultado_torneo()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_jugador uuid;
  v_nombre  text;
begin
  if new.ganador_id is null or old.ganador_id is not distinct from new.ganador_id then
    return new;
  end if;

  select nombre into v_nombre from public.tournaments where id = new.tournament_id;

  for v_jugador in
    select unnest(array[jugador_a, jugador_b])
      from public.tournament_pairs
     where id in (new.pareja_a_id, new.pareja_b_id)
  loop
    perform public.avisar(
      v_jugador, 'torneo_resultado',
      'Se registró tu partido de ' || v_nombre,
      case when exists (
        select 1 from public.tournament_pairs
         where id = new.ganador_id
           and v_jugador in (jugador_a, jugador_b)
      ) then 'Ganaste.' else 'Perdiste.' end,
      '/torneos/' || new.tournament_id
    );
  end loop;

  return new;
end;
$FN$;

drop trigger if exists tournament_matches_avisar_resultado on public.tournament_matches;
create trigger tournament_matches_avisar_resultado
  after update on public.tournament_matches
  for each row execute function public.avisar_resultado_torneo();

-- ---------------------------------------------------------------------------
-- 8. TORNEOS: salió tu cruce de la fase final
--
-- Solo la fase final. Al empezar el torneo se crean todos los cruces de grupos
-- de golpe, y avisar de cada uno serían seis notificaciones seguidas para decir
-- lo mismo que ya dijo "el torneo empezó". La fase final es otra cosa: aparece
-- después, depende de cómo quedaron los grupos, y saber contra quién te toca es
-- la razón de estar pendiente.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_cruce_final()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_jugador uuid;
  v_nombre  text;
begin
  if new.fase <> 'final' or new.pareja_a_id is null or new.pareja_b_id is null then
    return new;
  end if;

  select nombre into v_nombre from public.tournaments where id = new.tournament_id;

  for v_jugador in
    select unnest(array[jugador_a, jugador_b])
      from public.tournament_pairs
     where id in (new.pareja_a_id, new.pareja_b_id)
  loop
    perform public.avisar(
      v_jugador, 'torneo_cruce',
      'Pasaste a la fase final de ' || v_nombre,
      'Mira contra quién te toca.',
      '/torneos/' || new.tournament_id, null, new.id
    );
  end loop;

  return new;
end;
$FN$;

drop trigger if exists tournament_matches_avisar_cruce on public.tournament_matches;
create trigger tournament_matches_avisar_cruce
  after insert on public.tournament_matches
  for each row execute function public.avisar_cruce_final();

-- ---------------------------------------------------------------------------
-- 9. RANKING: cambiaste de categoría
--
-- Subir de categoría es lo más importante que le pasa a un jugador en toda la
-- app, y hasta ahora se enteraba solo si entraba a mirar su perfil. El aviso
-- del partido confirmado dice cuántos puntos se movieron, pero no que ese
-- movimiento cruzó un umbral.
--
-- Se compara la categoría antes y después del cambio de ELO con la misma
-- función que usa el resto de la app, así que la histéresis se respeta sola: si
-- la caída no alcanzó los 75 puntos de colchón, la categoría no cambia y no hay
-- nada que avisar.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_cambio_categoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_rankings ranking_tipo[] := array['masculino', 'femenino', 'mixto']::ranking_tipo[];
  v_r        ranking_tipo;
  v_elo_ant  integer;
  v_elo_nue  integer;
  v_peak_ant integer;
  v_peak_nue integer;
  v_ant      text;
  v_nue      text;
begin
  foreach v_r in array v_rankings loop
    v_elo_ant := case v_r
      when 'masculino' then old.elo_masculino
      when 'femenino'  then old.elo_femenino
      else old.elo_mixto end;
    v_elo_nue := case v_r
      when 'masculino' then new.elo_masculino
      when 'femenino'  then new.elo_femenino
      else new.elo_mixto end;

    if v_elo_ant is null or v_elo_nue is null or v_elo_ant = v_elo_nue then
      continue;
    end if;

    v_peak_ant := case v_r
      when 'masculino' then old.peak_elo_masculino
      when 'femenino'  then old.peak_elo_femenino
      else old.peak_elo_mixto end;
    v_peak_nue := case v_r
      when 'masculino' then new.peak_elo_masculino
      when 'femenino'  then new.peak_elo_femenino
      else new.peak_elo_mixto end;

    v_ant := public.categoria_desde_elo(v_elo_ant, v_r, v_peak_ant);
    v_nue := public.categoria_desde_elo(v_elo_nue, v_r, v_peak_nue);

    if v_ant is distinct from v_nue then
      perform public.avisar(
        new.id,
        case when v_elo_nue > v_elo_ant then 'ascenso' else 'descenso' end,
        case when v_elo_nue > v_elo_ant
             then 'Subiste a ' || v_nue
             else 'Bajaste a ' || v_nue end,
        'Ranking ' || v_r::text || '. Antes estabas en ' || v_ant || '.',
        '/perfil'
      );
    end if;
  end loop;

  return new;
end;
$FN$;

drop trigger if exists users_avisar_categoria on public.users;
create trigger users_avisar_categoria
  after update on public.users
  for each row execute function public.avisar_cambio_categoria();
