-- =============================================================================
-- Clasificación del partido y validación del marcador.
--
-- Regla de match_type:
--   4 hombres            -> masculino
--   4 mujeres            -> femenino
--   cualquier otra mezcla-> mixto   (1H+3M, 2H+2M, 3H+1M)
-- Único motivo de rechazo: falta el género de alguno de los 4 jugadores
-- (dato incompleto), nunca la proporción de géneros.
-- =============================================================================

create or replace function public.infer_match_type(p_jugadores uuid[])
returns ranking_tipo
language plpgsql
stable
as $$
declare
  v_total     integer;
  v_hombres   integer;
  v_mujeres   integer;
begin
  if cardinality(p_jugadores) <> 4 then
    raise exception 'Un partido necesita exactamente 4 jugadores, llegaron %',
      cardinality(p_jugadores);
  end if;

  select count(*),
         count(*) filter (where u.genero = 'masculino'),
         count(*) filter (where u.genero = 'femenino')
    into v_total, v_hombres, v_mujeres
    from public.users u
   where u.id = any (p_jugadores);

  -- users.genero es NOT NULL, así que el único hueco posible es un jugador sin
  -- perfil. En el MVP los 4 tienen que estar registrados: no hay jugadores
  -- invitados ni fantasma. Para conseguir gente nueva está el tablón.
  if v_total <> 4 then
    raise exception 'Los 4 jugadores deben estar registrados en la app: faltan % perfil(es)',
      4 - v_total;
  end if;

  if v_hombres = 4 then
    return 'masculino';
  elsif v_mujeres = 4 then
    return 'femenino';
  else
    return 'mixto';
  end if;
end;
$$;

-- Valida el marcador y devuelve el ganador ('a' o 'b') contando sets.
create or replace function public.ganador_de_sets(p_sets jsonb)
returns char(1)
language plpgsql
immutable
as $$
declare
  v_set    jsonb;
  v_a      integer;
  v_b      integer;
  v_sets_a integer := 0;
  v_sets_b integer := 0;
  v_n      integer;
begin
  if jsonb_typeof(p_sets) <> 'array' then
    raise exception 'El marcador debe ser un arreglo de sets';
  end if;

  v_n := jsonb_array_length(p_sets);
  if v_n < 1 or v_n > 5 then
    raise exception 'Un partido tiene entre 1 y 5 sets, llegaron %', v_n;
  end if;

  for v_set in select * from jsonb_array_elements(p_sets) loop
    if jsonb_typeof(v_set -> 'a') <> 'number' or jsonb_typeof(v_set -> 'b') <> 'number' then
      raise exception 'Cada set necesita los juegos de ambas parejas: %', v_set;
    end if;

    v_a := (v_set ->> 'a')::integer;
    v_b := (v_set ->> 'b')::integer;

    if v_a < 0 or v_b < 0 or v_a > 20 or v_b > 20 then
      raise exception 'Juegos fuera de rango en el set %', v_set;
    end if;
    if v_a = v_b then
      raise exception 'Un set no puede quedar empatado: %', v_set;
    end if;

    if v_a > v_b then
      v_sets_a := v_sets_a + 1;
    else
      v_sets_b := v_sets_b + 1;
    end if;
  end loop;

  if v_sets_a = v_sets_b then
    raise exception 'El partido no puede quedar empatado en sets';
  end if;

  return case when v_sets_a > v_sets_b then 'a' else 'b' end;
end;
$$;

-- Al crear el partido: clasificar, derivar el ganador y dejarlo pendiente.
-- Todos estos campos son derivados, así que ignoramos lo que mande el cliente.
-- Quien registra el marcador lo está confirmando de entrada; faltan los otros 3.
create or replace function public.matches_before_insert()
returns trigger
language plpgsql
as $$
begin
  new.match_type := public.infer_match_type(new.pareja_a || new.pareja_b);
  new.ganador := public.ganador_de_sets(new.sets);
  new.estado := 'pendiente';
  new.confirmado_at := null;
  new.resultado_confirmado_por := array[new.creado_por];
  return new;
end;
$$;

create trigger matches_clasificar
  before insert on public.matches
  for each row execute function public.matches_before_insert();
