-- =============================================================================
-- El aviso de "tu compañero aceptó" tiene que ir al compañero, no al que acaba
-- de aceptar.
--
-- La versión anterior daba por hecho que quien acepta de último es siempre
-- `jugador_b`, y le avisaba a `jugador_a`. Pero cuando el organizador inscribe
-- a una pareja ajena, los dos tienen que aceptar y el orden lo deciden ellos:
-- si `jugador_b` acepta primero, el aviso le llegaba a `jugador_a` justo cuando
-- era él quien estaba pulsando el botón.
--
-- Se resuelve mirando cuál de las dos banderas cambió en esta actualización.
-- Ese es quien acaba de aceptar; el aviso va para el otro.
-- =============================================================================

create or replace function public.avisar_pareja_aceptada()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_torneo    public.tournaments;
  v_aceptadas integer;
  v_acepto    uuid;
  v_avisar    uuid;
begin
  if old.estado = new.estado or new.estado <> 'aceptada' then
    return new;
  end if;

  select * into v_torneo from public.tournaments where id = new.tournament_id;

  -- quien acaba de aceptar es aquel cuya bandera cambió en esta actualización
  if new.acepto_a and not old.acepto_a then
    v_acepto := new.jugador_a;
    v_avisar := new.jugador_b;
  else
    v_acepto := new.jugador_b;
    v_avisar := new.jugador_a;
  end if;

  perform public.avisar(
    v_avisar, 'torneo_inscripcion',
    public.nombre_de(v_acepto) || ' aceptó jugar contigo',
    'Ya están inscritos en ' || v_torneo.nombre || '.',
    '/torneos/' || new.tournament_id, v_acepto
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
