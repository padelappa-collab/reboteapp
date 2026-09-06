-- =============================================================================
-- Cerrar las funciones que estaban abiertas a cualquiera.
--
-- El asesor de seguridad de Supabase encontró 69 funciones SECURITY DEFINER que
-- podía ejecutar `anon`, es decir, cualquiera con la clave pública —que va
-- dentro del JavaScript de la web y está a la vista de todo el mundo—.
--
-- El motivo es una trampa clásica de Postgres: al crear una función, EXECUTE se
-- concede automáticamente a PUBLIC, y tanto `anon` como `authenticated` heredan
-- de ahí. Los `revoke ... from anon` que fui poniendo no servían de nada,
-- porque el permiso no venía de `anon`: venía de PUBLIC.
--
-- La mayoría son funciones de trigger y llamarlas sueltas falla, pero unas
-- cuantas eran aprovechables de verdad:
--
--   · `avisar` inserta en `notifications` saltándose las políticas: cualquiera
--     podía mandarle avisos —y push al teléfono— a cualquier jugador.
--   · `otorgar_insignia` concede una insignia a quien se le pase.
--   · `tareas_periodicas` reparte insignias y avisos de golpe.
--
-- La regla nueva es la de siempre en seguridad: cerrar todo y abrir solo lo que
-- se usa. Se revoca sobre TODAS las funciones del esquema y se vuelve a conceder
-- una por una, así que una función nueva nace cerrada salvo que alguien la
-- abra a propósito.
-- =============================================================================

do $CERRAR$
declare
  f record;

  -- Lo que el cliente llama de verdad, más las dos que usan las políticas.
  -- `puede_ver_feed_de` y `es_participante` se evalúan dentro de un RLS, y ahí
  -- la expresión corre como quien consulta: sin EXECUTE, el feed y los mensajes
  -- dejarían de leerse.
  de_la_app text[] := array[
    'aceptar_inscripcion', 'alternar_avisos_de', 'buscar_jugadores',
    'buscar_para_mensaje', 'cancel_match', 'compartir_post', 'confirm_match',
    'conversacion_con', 'corregir_marcador', 'dispute_match',
    'elegible_en_torneo', 'estadisticas_de', 'generar_fase_final',
    'gente_para_compartir', 'historias_activas', 'historias_de',
    'iniciar_torneo', 'inscribir_pareja', 'likes_de_historia',
    'marcar_conversacion_leida', 'mis_conversaciones',
    'registrar_resultado_torneo', 'retirar_pareja', 'salir_publicacion',
    'seguir', 'ver_historia', 'vincular_partido',
    'puede_ver_feed_de', 'es_participante'
  ];

  -- Las que comparan SQL y TypeScript en las pruebas de paridad. Corren sin
  -- sesión, así que necesitan seguir abiertas a `anon`. Son cálculo puro: no
  -- leen ni escriben nada, y lo peor que se puede hacer con ellas es preguntar
  -- cuánto ELO daría un partido imaginario.
  de_las_pruebas text[] := array[
    'categoria_desde_elo', 'delta_elo', 'elo_inicial', 'k_factor',
    'nivel_estrella', 'puntaje_esperado'
  ];
begin
  for f in
    select p.oid::regprocedure as firma, p.proname as nombre
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
  loop
    execute format('revoke execute on function %s from public', f.firma);
    execute format('revoke execute on function %s from anon', f.firma);
    execute format('revoke execute on function %s from authenticated', f.firma);

    if f.nombre = any (de_la_app) then
      execute format('grant execute on function %s to authenticated', f.firma);
    elsif f.nombre = any (de_las_pruebas) then
      execute format('grant execute on function %s to anon, authenticated', f.firma);
    end if;
  end loop;
end;
$CERRAR$;

-- ---------------------------------------------------------------------------
-- Las funciones de cálculo puro se quedan abiertas.
--
-- `categoria_desde_elo` y compañía llaman por dentro a otras —`categorias_de`,
-- `umbral_categoria`, `numero_de_categoria`— y como NO son SECURITY DEFINER,
-- esa llamada corre con los permisos de quien preguntó. Cerrando solo las de
-- fuera, las pruebas de paridad se caían con "permiso denegado" en la de
-- dentro.
--
-- Se abren todas las inmutables que no son SECURITY DEFINER, que es exactamente
-- el conjunto de las que solo hacen cuentas: no leen ni escriben ninguna tabla,
-- y lo peor que se puede sacar de ellas es cuánto ELO daría un partido
-- inventado.
-- ---------------------------------------------------------------------------
do $PURAS$
declare f record;
begin
  for f in
    select p.oid::regprocedure as firma
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.provolatile = 'i'
       and not p.prosecdef
  loop
    execute format('grant execute on function %s to anon, authenticated', f.firma);
  end loop;
end;
$PURAS$;

-- Y que las que nazcan de aquí en adelante no vuelvan a abrirse solas.
alter default privileges in schema public revoke execute on functions from public;
