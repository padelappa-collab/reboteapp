-- =============================================================================
-- El organizador puede armar las parejas, y cada jugador confirma la suya.
--
-- Antes solo podías inscribirte a ti mismo con un compañero. Pero quien organiza
-- suele tener el cuadro medio armado de antemano —conoce a las parejas, las
-- apuntó por WhatsApp— y obligar a que cada una entre a la app a inscribirse es
-- fricción que mata el torneo antes de empezar.
--
-- Ahora hay dos caminos, y conviven:
--   * un jugador se inscribe con su compañero
--   * el organizador inscribe una pareja de la que puede no formar parte
--
-- En ambos casos hace falta el visto bueno de los dos jugadores. Quien inscribe
-- ya cuenta como que aceptó, si es uno de los dos; si el organizador arma una
-- pareja ajena, los dos tienen que confirmar. Nadie amanece inscrito en un
-- torneo sin saberlo.
-- =============================================================================

alter table public.tournament_pairs
  add column if not exists acepto_a boolean not null default false,
  add column if not exists acepto_b boolean not null default false;

-- Las que ya estaban aceptadas siguen estándolo.
update public.tournament_pairs
   set acepto_a = true, acepto_b = true
 where estado = 'aceptada';

update public.tournament_pairs
   set acepto_a = true
 where estado = 'pendiente' and not acepto_a;

-- ---------------------------------------------------------------------------
create or replace function public.inscribir_pareja(
  p_torneo    uuid,
  p_companero uuid,
  -- solo lo manda el organizador cuando arma una pareja ajena
  p_jugador_a uuid default null
)
returns public.tournament_pairs
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_uid     uuid := auth.uid();
  v_torneo  public.tournaments;
  v_a       uuid;
  v_cuantas integer;
  v_suma    integer;
  v_pareja  public.tournament_pairs;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;

  select * into v_torneo from public.tournaments where id = p_torneo for update;

  if v_torneo.id is null then
    raise exception 'El torneo no existe';
  end if;
  if v_torneo.estado <> 'inscripciones' then
    raise exception 'Las inscripciones de este torneo están cerradas';
  end if;

  v_a := coalesce(p_jugador_a, v_uid);

  -- armar una pareja ajena es cosa del organizador
  if v_a <> v_uid and v_torneo.creado_por <> v_uid then
    raise exception 'Solo quien organiza puede inscribir a otras parejas';
  end if;

  if v_a = p_companero then
    raise exception 'Una pareja son dos jugadores distintos';
  end if;

  select count(*) into v_cuantas
    from public.tournament_pairs
   where tournament_id = p_torneo and estado = 'aceptada';

  if v_cuantas >= v_torneo.max_parejas then
    raise exception 'El torneo ya está lleno';
  end if;

  if not public.pareja_cuadra_con_ranking(v_a, p_companero, v_torneo.ranking) then
    raise exception
      'Este torneo es %: la pareja no cumple esa condición', v_torneo.ranking;
  end if;

  if v_torneo.modalidad = 'categoria' then
    if not public.elegible_en_torneo(v_a, v_torneo.ranking, v_torneo.categoria) then
      raise exception 'Un jugador no entra en la categoría % de este torneo',
        v_torneo.categoria;
    end if;
    if not public.elegible_en_torneo(p_companero, v_torneo.ranking, v_torneo.categoria) then
      raise exception 'Un jugador no entra en la categoría % de este torneo',
        v_torneo.categoria;
    end if;
  else
    v_suma := coalesce(public.numero_categoria_de(v_a, v_torneo.ranking), 0)
            + coalesce(public.numero_categoria_de(p_companero, v_torneo.ranking), 0);

    if v_suma < v_torneo.suma then
      raise exception
        'La pareja suma %, y este torneo es de suma % o más', v_suma, v_torneo.suma;
    end if;
  end if;

  insert into public.tournament_pairs
    (tournament_id, jugador_a, jugador_b, acepto_a, acepto_b)
  values
    (p_torneo, v_a, p_companero, v_a = v_uid, p_companero = v_uid)
  returning * into v_pareja;

  -- si quien inscribe es uno de los dos, ya solo falta el otro
  if v_pareja.acepto_a and v_pareja.acepto_b then
    update public.tournament_pairs set estado = 'aceptada'
     where id = v_pareja.id
     returning * into v_pareja;
  end if;

  return v_pareja;
end;
$FN$;

-- ---------------------------------------------------------------------------
create or replace function public.aceptar_inscripcion(p_pareja uuid)
returns public.tournament_pairs
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_uid    uuid := auth.uid();
  v_pareja public.tournament_pairs;
begin
  select * into v_pareja from public.tournament_pairs where id = p_pareja for update;

  if v_pareja.id is null then
    raise exception 'Esa inscripción no existe';
  end if;

  if v_uid = v_pareja.jugador_a then
    update public.tournament_pairs set acepto_a = true where id = p_pareja;
  elsif v_uid = v_pareja.jugador_b then
    update public.tournament_pairs set acepto_b = true where id = p_pareja;
  else
    raise exception 'No estás en esa pareja';
  end if;

  update public.tournament_pairs
     set estado = case when acepto_a and acepto_b then 'aceptada'::pareja_estado
                       else estado end
   where id = p_pareja
   returning * into v_pareja;

  if v_pareja.estado = 'aceptada' then
    perform public.otorgar_insignia(v_pareja.jugador_a, 'primer_torneo');
    perform public.otorgar_insignia(v_pareja.jugador_b, 'primer_torneo');
  end if;

  return v_pareja;
end;
$FN$;

-- Aviso a quien le falte confirmar, no solo al segundo jugador.
create or replace function public.avisar_inscripcion_torneo()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_nombre text;
  v_quien  text := public.nombre_de(auth.uid());
begin
  select nombre into v_nombre from public.tournaments where id = new.tournament_id;

  if not new.acepto_a then
    perform public.avisar(
      new.jugador_a, 'torneo_inscripcion',
      v_quien || ' te inscribió en un torneo',
      'En ' || v_nombre || ' con ' || public.nombre_de(new.jugador_b) ||
      '. Tienes que aceptar para que quede en firme.',
      '/torneos/' || new.tournament_id, auth.uid(), new.id
    );
  end if;

  if not new.acepto_b then
    perform public.avisar(
      new.jugador_b, 'torneo_inscripcion',
      v_quien || ' te inscribió en un torneo',
      'En ' || v_nombre || ' con ' || public.nombre_de(new.jugador_a) ||
      '. Tienes que aceptar para que quede en firme.',
      '/torneos/' || new.tournament_id, auth.uid(), new.id
    );
  end if;

  return new;
end;
$FN$;

-- ---------------------------------------------------------------------------
-- Un americano de dos parejas es, sencillamente, un partido. No rompe nada y
-- deja armar un torneo pequeño sin necesitar seis jugadores.
-- ---------------------------------------------------------------------------
create or replace function public.iniciar_torneo(p_torneo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_torneo  public.tournaments;
  v_parejas uuid[];
  v_n       integer;
  v_grupos  integer;
  v_tam     integer;
  v_grupo   integer;
  v_desde   integer;
  i         integer;
  j         integer;
  v_orden   smallint;
begin
  select * into v_torneo from public.tournaments where id = p_torneo for update;

  if v_torneo.id is null then
    raise exception 'El torneo no existe';
  end if;
  if v_torneo.creado_por <> auth.uid() then
    raise exception 'Solo quien organiza puede empezar el torneo';
  end if;
  if v_torneo.estado <> 'inscripciones' then
    raise exception 'El torneo ya empezó';
  end if;

  select array_agg(p.id order by random())
    into v_parejas
    from public.tournament_pairs p
   where p.tournament_id = p_torneo and p.estado = 'aceptada';

  v_n := coalesce(cardinality(v_parejas), 0);

  if v_torneo.formato = 'cuadrangular' and v_n not in (4, 8, 16, 32) then
    raise exception 'Un cuadrangular admite 4, 8, 16 o 32 parejas, hay %', v_n;
  end if;

  if v_torneo.formato = 'grupos' and (v_n < 8 or v_n % 4 <> 0) then
    raise exception 'Para fase de grupos hacen falta 8, 12, 16... parejas. Hay %', v_n;
  end if;

  if v_torneo.formato = 'americano' and v_n < 2 then
    raise exception 'Un americano necesita al menos 2 parejas, hay %', v_n;
  end if;

  v_grupos := case when v_torneo.formato = 'americano' then 1 else v_n / 4 end;
  v_tam := v_n / v_grupos;

  for v_grupo in 1 .. v_grupos loop
    v_desde := (v_grupo - 1) * v_tam;
    v_orden := 0;

    for i in 1 .. v_tam - 1 loop
      for j in i + 1 .. v_tam loop
        insert into public.tournament_matches
          (tournament_id, fase, grupo, ronda, orden, pareja_a_id, pareja_b_id)
        values
          (p_torneo, 'grupos', v_grupo, 1, v_orden,
           v_parejas[v_desde + i], v_parejas[v_desde + j]);
        v_orden := v_orden + 1;
      end loop;
    end loop;

    for i in 1 .. v_tam loop
      update public.tournament_pairs
         set grupo = v_grupo
       where id = v_parejas[v_desde + i];
    end loop;
  end loop;

  update public.tournaments set estado = 'en_curso' where id = p_torneo;
end;
$FN$;
