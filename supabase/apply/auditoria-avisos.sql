-- =============================================================================
-- AUDITORÍA DE AVISOS
--
-- Simula cada evento de la app y comprueba que nace el aviso que le toca.
--
-- NO TOCA NADA REAL. Todo ocurre dentro de un bloque que termina lanzando un
-- error a propósito, y un error deshace la transacción entera: los partidos,
-- torneos y publicaciones de prueba desaparecen, y los avisos que se borraron
-- para poder contar vuelven a estar donde estaban. Que el informe salga como
-- "ERROR" en el editor es la señal de que funcionó, no de que algo se rompió.
--
-- Los push tampoco salen: la petición se encola dentro de la misma transacción
-- y se va con ella.
--
-- Cada sección va en su propio bloque con captura de errores, así que si una
-- falla las demás siguen y el informe sale completo de una sola pasada.
-- =============================================================================

do $AUDIT$
declare
  j        uuid[];
  v_m1     uuid;
  v_m2     uuid;
  v_post   uuid;
  v_torneo uuid;
  v_pa1    uuid;
  v_pa2    uuid;
  v_cruce  uuid;
  v_feed   uuid;
  n        integer;
  rep      text := E'\n\n========== AUDITORÍA DE AVISOS ==========\n\n';

begin
  select array_agg(id order by created_at)
    into j
    from (select id, created_at from public.users order by created_at limit 4) t;

  if j is null or cardinality(j) < 4 then
    raise exception 'La auditoría necesita 4 jugadores registrados y solo hay %',
      coalesce(cardinality(j), 0);
  end if;

  -- =========================================================================
  -- PARTIDOS
  -- =========================================================================

  -- ------------------------------------------------- te agregaron a un partido
  begin
    delete from public.notifications;

    insert into public.matches (fecha, creado_por, pareja_a, pareja_b, sets)
    values (now() + interval '3 days', j[1],
            array[j[1], j[2]], array[j[3], j[4]],
            '[{"a":6,"b":4},{"a":6,"b":3}]'::jsonb)
    returning id into v_m1;

    select count(*) into n from public.notifications where tipo = 'partido_nuevo';
    rep := rep || rpad('partido_nuevo', 26)
               || case when n = 3 then '[OK]  ' else '[!!]  ' end || n || '/3' || E'\n';
  exception when others then
    rep := rep || rpad('partido_nuevo', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- ------------------------------------------------ avanzan las confirmaciones
  begin
    delete from public.notifications;

    update public.matches
       set resultado_confirmado_por = array[j[1], j[2]]
     where id = v_m1;

    select count(*) into n from public.notifications where tipo = 'partido_confirmacion';
    rep := rep || rpad('partido_confirmacion', 26)
               || case when n = 2 then '[OK]  ' else '[!!]  ' end || n || '/2' || E'\n';
  exception when others then
    rep := rep || rpad('partido_confirmacion', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- --------------------------------------------------------- solo faltas tú
  begin
    delete from public.notifications;

    update public.matches
       set resultado_confirmado_por = array[j[1], j[2], j[3]]
     where id = v_m1;

    select count(*) into n from public.notifications where tipo = 'partido_falta_confirmar';
    rep := rep || rpad('partido_falta_confirmar', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';
  exception when others then
    rep := rep || rpad('partido_falta_confirmar', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- ---------------------------------------------------- corrigieron el marcador
  begin
    delete from public.notifications;

    update public.matches
       set sets = '[{"a":4,"b":6},{"a":3,"b":6}]'::jsonb,
           ganador = 'b',
           resultado_confirmado_por = array[j[2]]
     where id = v_m1;

    select count(*) into n from public.notifications where tipo = 'partido_corregido';
    rep := rep || rpad('partido_corregido', 26)
               || case when n = 3 then '[OK]  ' else '[!!]  ' end || n || '/3' || E'\n';
  exception when others then
    rep := rep || rpad('partido_corregido', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- ------------------------------------------------------------- confirmado
  begin
    delete from public.notifications;

    update public.matches
       set resultado_confirmado_por = array[j[1], j[2], j[3], j[4]],
           estado = 'confirmado',
           confirmado_at = now()
     where id = v_m1;

    select count(*) into n from public.notifications where tipo = 'partido_confirmado';
    rep := rep || rpad('partido_confirmado', 26)
               || case when n = 4 then '[OK]  ' else '[!!]  ' end || n || '/4' || E'\n';
  exception when others then
    rep := rep || rpad('partido_confirmado', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- -------------------------------------------------------------- cancelado
  begin
    delete from public.notifications;

    insert into public.matches (fecha, creado_por, pareja_a, pareja_b, sets)
    values (now() + interval '9 days', j[1],
            array[j[1], j[3]], array[j[2], j[4]],
            '[{"a":6,"b":2},{"a":6,"b":1}]'::jsonb)
    returning id into v_m2;

    delete from public.notifications;

    update public.matches
       set estado = 'cancelado', cancelado_por = j[1]
     where id = v_m2;

    select count(*) into n from public.notifications where tipo = 'partido_cancelado';
    rep := rep || rpad('partido_cancelado', 26)
               || case when n = 3 then '[OK]  ' else '[!!]  ' end || n || '/3' || E'\n';
  exception when others then
    rep := rep || rpad('partido_cancelado', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- =========================================================================
  -- TABLÓN
  -- =========================================================================
  rep := rep || E'\n';

  -- ------------------------------------------------------------ se unió / lleno
  begin
    delete from public.notifications;

    -- `faltan` es una columna generada (3 - acompanantes): con dos acompañantes
    -- queda en 1, y una sola inscripción completa la publicación
    insert into public.board_posts (user_id, fecha_partido, acompanantes)
    values (j[1], now() + interval '2 days', array[j[3], j[4]])
    returning id into v_post;

    insert into public.board_post_signups (post_id, user_id) values (v_post, j[2]);

    select count(*) into n from public.notifications where tipo = 'tablon_union';
    rep := rep || rpad('tablon_union', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';

    select count(*) into n from public.notifications where tipo = 'tablon_completo';
    rep := rep || rpad('tablon_completo', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';
  exception when others then
    rep := rep || rpad('tablon_union/completo', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- --------------------------------------------------------------- se salió
  begin
    delete from public.notifications;

    delete from public.board_post_signups where post_id = v_post and user_id = j[2];

    select count(*) into n from public.notifications where tipo = 'tablon_salida';
    rep := rep || rpad('tablon_salida', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';
  exception when others then
    rep := rep || rpad('tablon_salida', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- =========================================================================
  -- RANKING
  -- =========================================================================
  rep := rep || E'\n';

  begin
    delete from public.notifications;

    update public.users
       set elo_mixto = elo_mixto + 400,
           peak_elo_mixto = greatest(peak_elo_mixto, elo_mixto + 400)
     where id = j[1];

    select count(*) into n from public.notifications where tipo = 'ascenso';
    rep := rep || rpad('ascenso', 26)
               || case when n >= 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';
  exception when others then
    rep := rep || rpad('ascenso', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- =========================================================================
  -- SOCIAL
  -- =========================================================================
  rep := rep || E'\n';

  -- ------------------------------------------------- solicitud y aceptación
  begin
    delete from public.notifications;
    delete from public.follows where follower_id = j[3] and followed_id = j[4];

    insert into public.follows (follower_id, followed_id, estado)
    values (j[3], j[4], 'pendiente');

    select count(*) into n from public.notifications where tipo = 'solicitud_seguimiento';
    rep := rep || rpad('solicitud_seguimiento', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';

    delete from public.notifications;

    update public.follows set estado = 'aceptado'
     where follower_id = j[3] and followed_id = j[4];

    select count(*) into n from public.notifications where tipo = 'solicitud_aceptada';
    rep := rep || rpad('solicitud_aceptada', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';
  exception when others then
    rep := rep || rpad('seguimiento', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- --------------------------------------- publicación, me gusta, comentarios
  begin
    delete from public.notifications;

    update public.follows set avisar_publicaciones = true
     where follower_id = j[3] and followed_id = j[4];

    insert into public.feed_posts (user_id, contenido)
    values (j[4], 'Publicación de prueba de la auditoría')
    returning id into v_feed;

    select count(*) into n from public.notifications where tipo = 'publicacion_nueva';
    rep := rep || rpad('publicacion_nueva', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';

    delete from public.notifications;
    insert into public.post_likes (post_id, user_id) values (v_feed, j[1]);

    select count(*) into n from public.notifications where tipo = 'me_gusta';
    rep := rep || rpad('me_gusta', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';

    delete from public.notifications;
    insert into public.comments (post_id, user_id, contenido)
    values (v_feed, j[1], 'Primer comentario');

    select count(*) into n from public.notifications where tipo = 'comentario';
    rep := rep || rpad('comentario', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';

    delete from public.notifications;
    insert into public.comments (post_id, user_id, contenido)
    values (v_feed, j[2], 'Segundo comentario');

    select count(*) into n from public.notifications where tipo = 'comentario_respuesta';
    rep := rep || rpad('comentario_respuesta', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';
  exception when others then
    rep := rep || rpad('feed', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- =========================================================================
  -- TORNEOS
  -- =========================================================================
  rep := rep || E'\n';

  begin
    delete from public.notifications;

    insert into public.tournaments
      (nombre, formato, ranking, modalidad, suma, fecha_inicio, creado_por, max_parejas)
    values ('Torneo de auditoría', 'americano', 'mixto', 'suma', 2,
            now() + interval '5 days', j[1], 2)
    returning id into v_torneo;

    insert into public.tournament_pairs (tournament_id, jugador_a, jugador_b)
    values (v_torneo, j[1], j[2]) returning id into v_pa1;

    -- ninguno de los dos ha aceptado todavia, asi que el aviso va a los dos
    select count(*) into n from public.notifications where tipo = 'torneo_inscripcion';
    rep := rep || rpad('torneo_inscripcion', 26)
               || case when n = 2 then '[OK]  ' else '[!!]  ' end || n || '/2' || E'\n';
  exception when others then
    rep := rep || rpad('torneo_inscripcion', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- --------------------------------------------- aceptó la pareja y se llenó
  begin
    delete from public.notifications;

    update public.tournament_pairs set estado = 'aceptada' where id = v_pa1;

    insert into public.tournament_pairs (tournament_id, jugador_a, jugador_b)
    values (v_torneo, j[3], j[4]) returning id into v_pa2;

    update public.tournament_pairs set estado = 'aceptada' where id = v_pa2;

    select count(*) into n from public.notifications where tipo = 'torneo_lleno';
    rep := rep || rpad('torneo_lleno', 26)
               || case when n = 1 then '[OK]  ' else '[!!]  ' end || n || '/1' || E'\n';
  exception when others then
    rep := rep || rpad('torneo_lleno', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- ------------------------------------------------------------- se sorteó
  begin
    delete from public.notifications;

    update public.tournaments set estado = 'en_curso' where id = v_torneo;

    select count(*) into n from public.notifications where tipo = 'torneo_sorteo';
    rep := rep || rpad('torneo_sorteo', 26)
               || case when n = 4 then '[OK]  ' else '[!!]  ' end || n || '/4' || E'\n';
  exception when others then
    rep := rep || rpad('torneo_sorteo', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- ------------------------------------------------ cruce final y resultado
  begin
    delete from public.notifications;

    insert into public.tournament_matches
      (tournament_id, fase, ronda, orden, pareja_a_id, pareja_b_id)
    values (v_torneo, 'final', 1, 0, v_pa1, v_pa2)
    returning id into v_cruce;

    select count(*) into n from public.notifications where tipo = 'torneo_cruce';
    rep := rep || rpad('torneo_cruce', 26)
               || case when n = 4 then '[OK]  ' else '[!!]  ' end || n || '/4' || E'\n';

    delete from public.notifications;
    update public.tournament_matches set ganador_id = v_pa1 where id = v_cruce;

    select count(*) into n from public.notifications where tipo = 'torneo_resultado';
    rep := rep || rpad('torneo_resultado', 26)
               || case when n = 4 then '[OK]  ' else '[!!]  ' end || n || '/4' || E'\n';
  exception when others then
    rep := rep || rpad('torneo_cruce/resultado', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- ------------------------------------------------- campeón y fin del torneo
  begin
    delete from public.notifications;

    update public.tournaments set estado = 'finalizado' where id = v_torneo;

    select count(*) into n from public.notifications where tipo = 'torneo_campeon';
    rep := rep || rpad('torneo_campeon', 26)
               || case when n = 2 then '[OK]  ' else '[!!]  ' end || n || '/2' || E'\n';

    select count(*) into n from public.notifications where tipo = 'torneo_finalizado';
    rep := rep || rpad('torneo_finalizado', 26)
               || case when n = 2 then '[OK]  ' else '[!!]  ' end || n || '/2' || E'\n';
  exception when others then
    rep := rep || rpad('torneo_campeon/final', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- -------------------------------------------------------------- se retiró
  begin
    delete from public.notifications;

    delete from public.tournament_pairs where id = v_pa2;

    select count(*) into n from public.notifications where tipo = 'torneo_retiro';
    rep := rep || rpad('torneo_retiro', 26)
               || case when n = 3 then '[OK]  ' else '[!!]  ' end || n || '/3' || E'\n';
  exception when others then
    rep := rep || rpad('torneo_retiro', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- ------------------------------------------------------------- cancelado
  begin
    delete from public.notifications;

    update public.tournaments set estado = 'cancelado' where id = v_torneo;

    select count(*) into n from public.notifications where tipo = 'torneo_cancelado';
    rep := rep || rpad('torneo_cancelado', 26)
               || case when n = 2 then '[OK]  ' else '[!!]  ' end || n || '/2' || E'\n';
  exception when others then
    rep := rep || rpad('torneo_cancelado', 26) || '[ERROR] ' || sqlerrm || E'\n';
  end;

  -- =========================================================================
  rep := rep || E'\n[OK] = el aviso se generó   [!!] = no se generó o salieron'
             || E' otros tantos\n\n'
             || E'Sin probar aquí, porque dependen de cosas que no se pueden\n'
             || E'simular en una transacción:\n'
             || E'  bienvenida        (hace falta crear una cuenta de verdad)\n'
             || E'  torneo_manana     (lo dispara el cron a las 8 a.m.)\n'
             || E'  partido_pronto    (lo dispara el cron cada hora)\n'
             || E'  inactividad       (21 dias sin jugar)\n'
             || E'  sin_usuario       (3 dias sin nombre de usuario)\n'
             || E'  insignia          (probado en produccion)\n'
             || E'  nuevo_seguidor    (cuenta publica; aqui se probo la privada)\n'
             || E'  partido_disputado (probado en produccion)\n\n'
             || E'Todo lo de arriba se deshizo. No quedo nada guardado.\n';

  raise exception '%', rep;
end;
$AUDIT$;
