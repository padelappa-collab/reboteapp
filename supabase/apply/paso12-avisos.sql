-- =============================================================================
-- Los avisos que faltaban, todos de una vez.
--
-- Sale de repasar las siete tablas y las cuarenta funciones buscando lo que le
-- puede pasar a un jugador sin que nadie se lo diga. El criterio para decidir
-- qué merece aviso fue uno solo: si te enteras tarde, ¿pierdes algo? Que
-- alguien se salga de tu partido a dos horas de jugar te deja sin cuarto; que
-- se registre el resultado de tu torneo te mueve el ELO sin que lo veas venir.
-- Eso avisa. Que alguien te pase en el ranking, no: no hay nada que hacer al
-- respecto y solo invita a mirar la app por ansiedad.
--
-- Sobre la entidad de cada aviso. El índice `notifications_sin_repetir` impide
-- que el mismo evento avise dos veces, y para eso hay que decidir en cada caso
-- si el evento puede repetirse de verdad:
--
--   · Con entidad los que ocurren una sola vez: un torneo se sortea una vez, se
--     cancela una vez, termina una vez.
--   · Sin entidad los que sí se repiten: alguien puede entrar y salirse del
--     mismo partido dos veces, una pareja puede retirarse y volver a
--     inscribirse, un marcador se puede corregir varias veces. Ahí el índice
--     se tragaría el segundo aviso en silencio, que es exactamente el fallo
--     que nos costó encontrar por qué no llegaban las solicitudes de seguir.
-- =============================================================================


-- ===========================================================================
-- PARTIDOS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Corrigieron el marcador.
--
-- El más importante de los que faltaban. `corregir_marcador` deja el partido en
-- 'pendiente' y borra las confirmaciones de los otros tres: tu confirmación
-- desapareció y el marcador que confirmaste ya no es el mismo. Hasta ahora eso
-- pasaba sin que nadie se enterara, porque 'pendiente' es justo el único estado
-- que el trigger de cambios no contempla.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_marcador_corregido()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_jugador uuid;
  v_actor   uuid;
begin
  if new.sets is not distinct from old.sets or new.estado = 'confirmado' then
    return new;
  end if;

  -- quien corrige queda como única confirmación
  v_actor := new.resultado_confirmado_por[1];

  foreach v_jugador in array (new.pareja_a || new.pareja_b) loop
    perform public.avisar(
      v_jugador, 'partido_corregido',
      public.nombre_de(v_actor) || ' corrigió el marcador',
      'Tienes que volver a confirmarlo para que cuente en el ranking.',
      '/partidos/' || new.id, v_actor
    );
  end loop;

  return new;
end;
$FN$;

drop trigger if exists matches_avisar_correccion on public.matches;
create trigger matches_avisar_correccion
  after update on public.matches
  for each row execute function public.avisar_marcador_corregido();

-- ---------------------------------------------------------------------------
-- Avanzan las confirmaciones.
--
-- Solo le llega a quien todavía no ha confirmado: el que ya confirmó no tiene
-- nada que hacer con la noticia. Y cuando queda uno solo, ese recibe el texto
-- que dice lo que de verdad está en juego, porque el partido depende
-- enteramente de él.
--
-- No se dispara al llegar a cuatro: de eso ya avisa 'partido_confirmado', con
-- el ELO incluido. Ni al corregir el marcador, porque ahí el número de
-- confirmaciones baja en vez de subir.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_confirmaciones()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_jugador uuid;
  v_actor   uuid;
  v_faltan  integer;
begin
  if new.estado <> 'pendiente'
     or cardinality(new.resultado_confirmado_por)
        <= cardinality(old.resultado_confirmado_por) then
    return new;
  end if;

  v_faltan := 4 - cardinality(new.resultado_confirmado_por);
  if v_faltan <= 0 then
    return new;
  end if;

  -- el que acaba de confirmar es el que aparece de más
  select x into v_actor
    from unnest(new.resultado_confirmado_por) x
   where x <> all (old.resultado_confirmado_por)
   limit 1;

  for v_jugador in
    select x from unnest(new.pareja_a || new.pareja_b) x
     where x <> all (new.resultado_confirmado_por)
  loop
    if v_faltan = 1 then
      perform public.avisar(
        v_jugador, 'partido_falta_confirmar',
        'Solo faltas tú por confirmar',
        'Hasta que confirmes, el partido no cuenta para el ranking de nadie.',
        '/partidos/' || new.id, v_actor
      );
    else
      perform public.avisar(
        v_jugador, 'partido_confirmacion',
        public.nombre_de(v_actor) || ' confirmó el marcador',
        'Faltan ' || v_faltan || ', contándote a ti.',
        '/partidos/' || new.id, v_actor
      );
    end if;
  end loop;

  return new;
end;
$FN$;

drop trigger if exists matches_avisar_confirmaciones on public.matches;
create trigger matches_avisar_confirmaciones
  after update on public.matches
  for each row execute function public.avisar_confirmaciones();


-- ===========================================================================
-- TABLÓN
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Alguien se sale.
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
-- La publicación se llenó: es el desenlace que el autor estaba esperando.
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
-- Salirse de una publicación, ahora avisando.
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


-- ===========================================================================
-- RANKING
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Cambiaste de categoría.
--
-- Es lo más importante que le pasa a un jugador en toda la app, y hasta ahora
-- se enteraba solo si entraba a mirar su perfil. El aviso del partido
-- confirmado dice cuántos puntos se movieron, pero no que ese movimiento cruzó
-- un umbral.
--
-- Se compara la categoría antes y después con la misma función que usa el
-- resto de la app, así que la histéresis se respeta sola: si la caída no
-- alcanzó los 75 puntos de colchón, la categoría no cambia y no hay nada que
-- avisar.
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


-- ===========================================================================
-- SOCIAL
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Respondieron donde tú comentaste.
--
-- Al autor de la publicación ya le avisa 'comentario'. Este es para los demás
-- que están en la misma conversación, que hoy solo se enteran si vuelven a
-- entrar a mirar.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_respuesta_comentario()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_autor uuid;
  v_otro  uuid;
begin
  select user_id into v_autor from public.feed_posts where id = new.post_id;

  for v_otro in
    select distinct c.user_id
      from public.comments c
     where c.post_id = new.post_id
       and c.user_id <> new.user_id
       -- al dueño de la publicación le llega el aviso de comentario, no este
       and c.user_id is distinct from v_autor
  loop
    perform public.avisar(
      v_otro, 'comentario_respuesta',
      public.nombre_de(new.user_id) || ' también comentó',
      left(new.contenido, 120),
      '/jugador/' || v_autor, new.user_id, new.id
    );
  end loop;

  return new;
end;
$FN$;

drop trigger if exists comments_avisar_respuesta on public.comments;
create trigger comments_avisar_respuesta
  after insert on public.comments
  for each row execute function public.avisar_respuesta_comentario();

-- ---------------------------------------------------------------------------
-- Avisar de las publicaciones de alguien en concreto.
--
-- Apagado siempre, y se prende jugador por jugador desde su perfil. Avisar de
-- todo lo que publica todo el que sigues es lo que hace que la gente termine
-- apagando las notificaciones enteras, y entonces se pierden también las que
-- de verdad importan, como que le falte su confirmación a un partido.
--
-- Vive en `follows` y no en `users` porque la decisión es sobre una relación,
-- no sobre una persona: quieres que te avisen de tu pareja de dobles, no de
-- los ochenta que sigues.
-- ---------------------------------------------------------------------------
alter table public.follows
  add column if not exists avisar_publicaciones boolean not null default false;

create or replace function public.alternar_avisos_de(p_usuario uuid, p_activo boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;

  update public.follows
     set avisar_publicaciones = p_activo
   where follower_id = v_uid
     and followed_id = p_usuario
     and estado = 'aceptado';

  if not found then
    raise exception 'Tienes que seguirlo primero';
  end if;

  return p_activo;
end;
$$;

revoke execute on function public.alternar_avisos_de(uuid, boolean) from anon;
grant execute on function public.alternar_avisos_de(uuid, boolean) to authenticated;

create or replace function public.avisar_publicacion_nueva()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_seguidor uuid;
begin
  for v_seguidor in
    select follower_id from public.follows
     where followed_id = new.user_id
       and estado = 'aceptado'
       and avisar_publicaciones
  loop
    perform public.avisar(
      v_seguidor, 'publicacion_nueva',
      public.nombre_de(new.user_id) || ' publicó algo',
      left(coalesce(new.contenido, ''), 120),
      '/jugador/' || new.user_id, new.user_id, new.id
    );
  end loop;

  return new;
end;
$FN$;

drop trigger if exists feed_posts_avisar on public.feed_posts;
create trigger feed_posts_avisar
  after insert on public.feed_posts
  for each row execute function public.avisar_publicacion_nueva();


-- ===========================================================================
-- TORNEOS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Quién ganó el torneo.
--
-- Sirve para los dos caminos por los que un torneo puede terminar: si hubo
-- fase final, gana quien ganó el último cruce; si se cerró a mano —un americano
-- o una fase de grupos sin llave—, la pareja con más partidos ganados.
-- ---------------------------------------------------------------------------
create or replace function public.campeon_de(p_torneo uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select tm.ganador_id
       from public.tournament_matches tm
      where tm.tournament_id = p_torneo
        and tm.fase = 'final'
        and tm.ganador_id is not null
      order by tm.ronda desc, tm.orden desc
      limit 1),
    (select p.id
       from public.tournament_pairs p
      where p.tournament_id = p_torneo
      order by (select count(*) from public.tournament_matches m
                 where m.ganador_id = p.id) desc, p.created_at
      limit 1)
  );
$$;

-- ---------------------------------------------------------------------------
-- Cambios de estado del torneo.
--
-- Tres arreglos sobre lo que había:
--
--   · La cancelación le llega ahora a TODAS las parejas, no solo a las que ya
--     habían aceptado. Quien fue inscrito por su compañero y aún no aceptaba se
--     quedaba sin enterarse de que el torneo se cayó, y es justo a quien más le
--     sirve saberlo porque tenía una decisión pendiente. Este era el que
--     reportaste.
--   · 'en_curso' ya no dice "empezó" sino "se sorteó", que es lo que de verdad
--     acaba de pasar: el sorteo suele hacerse días antes de jugar. Que el
--     torneo empieza lo avisa el calendario, más abajo.
--   · Al terminar, el campeón recibe un aviso distinto del resto. Es el momento
--     que la gente quiere ver, y meterlo en el genérico "terminó el torneo" era
--     desperdiciarlo.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_torneo_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_jugador  uuid;
  v_campeon  uuid;
  v_ganadora uuid[];
begin
  if old.estado = new.estado then
    return new;
  end if;

  -- la cancelación no distingue: todas las parejas, hayan aceptado o no
  if new.estado = 'cancelado' then
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

  if new.estado = 'finalizado' then
    v_campeon := public.campeon_de(new.id);
    select array[jugador_a, jugador_b] into v_ganadora
      from public.tournament_pairs where id = v_campeon;
  end if;

  for v_jugador in
    select unnest(array[jugador_a, jugador_b])
      from public.tournament_pairs
     where tournament_id = new.id and estado = 'aceptada'
  loop
    if new.estado = 'en_curso' then
      perform public.avisar(
        v_jugador, 'torneo_sorteo',
        'Ya se sorteó ' || new.nombre,
        'Revisa contra quién te toca.', '/torneos/' || new.id, null, new.id
      );

    elsif new.estado = 'finalizado' then
      if v_jugador = any (coalesce(v_ganadora, '{}'::uuid[])) then
        perform public.avisar(
          v_jugador, 'torneo_campeon',
          '🏆 Ganaste ' || new.nombre,
          'Quedaste campeón.', '/torneos/' || new.id, null, new.id
        );
      else
        perform public.avisar(
          v_jugador, 'torneo_finalizado',
          'Terminó ' || new.nombre,
          'Mira cómo quedó la tabla.', '/torneos/' || new.id, null, new.id
        );
      end if;
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
-- Tu compañero aceptó, y el cuadro se llenó.
--
-- Inscribir a alguien avisaba; que ese alguien aceptara, no. Quien inscribió se
-- quedaba mirando un "pendiente" sin saber cuándo dejaba de serlo, y el
-- organizador no se enteraba de que tenía una pareja más en firme.
--
-- Y cuando las parejas aceptadas llegan al máximo, el organizador necesita
-- saberlo para sortear: hoy tiene que entrar a mirar si ya se llenó.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_pareja_aceptada()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_torneo    public.tournaments;
  v_aceptadas integer;
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
    v_torneo.creado_por, 'torneo_inscripcion',
    'Nueva pareja en ' || v_torneo.nombre,
    public.nombre_de(new.jugador_a) || ' y ' || public.nombre_de(new.jugador_b) || '.',
    '/torneos/' || new.tournament_id
  );

  select count(*) into v_aceptadas
    from public.tournament_pairs
   where tournament_id = new.tournament_id and estado = 'aceptada';

  if v_aceptadas >= v_torneo.max_parejas then
    perform public.avisar(
      v_torneo.creado_por, 'torneo_lleno',
      'Ya se llenaron los cupos de ' || v_torneo.nombre,
      'Puedes hacer el sorteo cuando quieras.',
      '/torneos/' || new.tournament_id, null, new.tournament_id
    );
  end if;

  return new;
end;
$FN$;

drop trigger if exists pairs_avisar_aceptada on public.tournament_pairs;
create trigger pairs_avisar_aceptada
  after update on public.tournament_pairs
  for each row execute function public.avisar_pareja_aceptada();

-- ---------------------------------------------------------------------------
-- Una pareja se retira.
--
-- Al organizador le cambia el cuadro y puede que tenga que buscar reemplazo
-- antes de sortear. Al compañero lo deja fuera del torneo sin haber hecho nada.
--
-- Si el torneo entero desapareció, no se avisa: las parejas caen en cascada y
-- sería ruido sobre algo que ya no existe.
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
    v_torneo.creado_por, 'torneo_retiro',
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
-- Se registró un resultado.
--
-- En un torneo el organizador anota el marcador sin que los cuatro confirmen,
-- así que el ELO se mueve sin que el jugador toque nada. Enterarse no es un
-- lujo: es la única forma de reclamar si quedó mal anotado.
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
  if new.ganador_id is null
     or old.ganador_id is not distinct from new.ganador_id then
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
-- Salió tu cruce de la fase final.
--
-- Solo la fase final. Al sortear se crean todos los cruces de grupos de golpe,
-- y avisar de cada uno serían seis notificaciones seguidas para decir lo que ya
-- dijo el aviso del sorteo. La fase final es otra cosa: aparece después,
-- depende de cómo quedaron los grupos, y saber contra quién te toca es la razón
-- de estar pendiente.
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
  if new.fase <> 'final'
     or new.pareja_a_id is null or new.pareja_b_id is null then
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
-- El torneo empieza mañana.
--
-- Separado del sorteo a propósito: el sorteo se hace días antes, y un aviso que
-- llegó el martes no sirve para acordarse del sábado. Lo dispara el calendario
-- sobre `fecha_inicio`, no una acción del organizador.
--
-- La fecha se compara en hora de Colombia. Guardada en UTC, un torneo de las
-- seis de la tarde cae al día siguiente y el aviso llegaría con un día de
-- diferencia.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_torneos_proximos()
returns void
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_torneo  public.tournaments;
  v_jugador uuid;
begin
  for v_torneo in
    select * from public.tournaments
     where estado in ('inscripciones', 'en_curso')
       and (fecha_inicio at time zone 'America/Bogota')::date
           = ((now() at time zone 'America/Bogota') + interval '1 day')::date
  loop
    for v_jugador in
      select unnest(array[jugador_a, jugador_b])
        from public.tournament_pairs
       where tournament_id = v_torneo.id and estado = 'aceptada'
    loop
      perform public.avisar(
        v_jugador, 'torneo_manana',
        v_torneo.nombre || ' es mañana',
        'Revisa la hora y la cancha.',
        '/torneos/' || v_torneo.id, null, v_torneo.id
      );
    end loop;
  end loop;
end;
$FN$;


-- ===========================================================================
-- CUENTA
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Bienvenida.
--
-- Es el primer aviso que verá cualquiera del piloto, y llega a una campana que
-- de otro modo estaría vacía. Dice el primer paso —registrar un partido— y
-- explica que el nombre de usuario es lo que abre la parte social, que es la
-- pregunta que todo el mundo hace al llegar.
-- ---------------------------------------------------------------------------
create or replace function public.avisar_bienvenida()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
begin
  perform public.avisar(
    new.id, 'bienvenida',
    '¡Bienvenido a REBOTEAPP!',
    'Registra tu primer partido para que arranque tu ELO. Y si quieres hacer '
    || 'parte del social de REBOTEAPP —seguir gente, publicar tus partidos y '
    || 'comentar— ponte un nombre de usuario desde tu perfil: es lo que '
    || 'permite que te encuentren.',
    '/perfil', null, new.id
  );
  return new;
end;
$FN$;

drop trigger if exists users_avisar_bienvenida on public.users;
create trigger users_avisar_bienvenida
  after insert on public.users
  for each row execute function public.avisar_bienvenida();


-- ===========================================================================
-- CALENDARIO
--
-- Se añade el repaso de torneos al horario diario. Si pg_cron no está
-- habilitado esto avisa sin romper el resto del archivo.
-- ===========================================================================
do $CRON$
begin
  create extension if not exists pg_cron;

  perform cron.unschedule('reboteapp-torneos')
    where exists (select 1 from cron.job where jobname = 'reboteapp-torneos');

  -- 13:00 UTC = 8 de la mañana en Cartagena
  perform cron.schedule('reboteapp-torneos', '0 13 * * *',
                        'select public.avisar_torneos_proximos()');
exception when others then
  raise notice 'pg_cron no disponible: %. Habilítalo y vuelve a ejecutar este bloque.',
    sqlerrm;
end;
$CRON$;
