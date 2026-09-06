-- =============================================================================
-- Las estadísticas de un jugador.
--
-- Todo sale de lo que ya está guardado —`matches` y `elo_history`— y por eso no
-- hay tabla nueva ni contadores que mantener al día. Un contador guardado se
-- desincroniza en cuanto alguien corrige un marcador o se cancela un partido, y
-- entonces el perfil miente sin que nadie se entere. Calcularlo al vuelo cuesta
-- unos milisegundos con estos volúmenes y no puede quedar desfasado.
--
-- Solo cuentan los partidos confirmados. Uno pendiente todavía puede cambiar de
-- marcador o cancelarse, y meterlo en las cuentas haría que las cifras bailaran
-- solas.
-- =============================================================================

create or replace function public.estadisticas_de(p_usuario uuid)
returns table (
  jugados            integer,
  ganados            integer,
  perdidos           integer,
  -- positiva si son victorias seguidas, negativa si son derrotas
  racha              integer,
  elo_movido         integer,
  companero_id       uuid,
  companero_nombre   text,
  companero_jugados  integer,
  companero_ganados  integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_racha integer := 0;
  v_signo boolean;
  v_fila  record;
begin
  -- ---------------------------------------------------------------- la racha
  --
  -- Se recorre del partido más reciente hacia atrás y se corta en cuanto el
  -- resultado cambia. Es lo que la gente entiende por racha: lo que llevas
  -- ahora, no la mejor que tuviste nunca.
  for v_fila in
    select (p_usuario = any (m.pareja_a)) = (m.ganador = 'a') as gano
      from public.matches m
     where m.estado = 'confirmado'
       and p_usuario = any (m.pareja_a || m.pareja_b)
     order by m.fecha desc
  loop
    if v_signo is null then
      v_signo := v_fila.gano;
      v_racha := 1;
    elsif v_fila.gano = v_signo then
      v_racha := v_racha + 1;
    else
      exit;
    end if;
  end loop;

  if v_signo is false then
    v_racha := -v_racha;
  end if;

  return query
  with mios as (
    select (p_usuario = any (m.pareja_a)) = (m.ganador = 'a') as gano,
           case when p_usuario = any (m.pareja_a) then m.pareja_a else m.pareja_b end as mi_pareja
      from public.matches m
     where m.estado = 'confirmado'
       and p_usuario = any (m.pareja_a || m.pareja_b)
  ),
  companeros as (
    -- los alias llevan prefijo a propósito: sin él chocan con las columnas de
    -- salida de la función y Postgres corta por referencia ambigua
    select c.quien as c_id,
           count(*)::integer as c_juntos,
           count(*) filter (where mios.gano)::integer as c_ganados
      from mios
      cross join lateral (select unnest(mios.mi_pareja) as quien) c
     where c.quien <> p_usuario
     group by c.quien
     -- el mejor es con quien más ganas; a igualdad, con quien más juegas
     order by count(*) filter (where mios.gano) desc, count(*) desc
     limit 1
  )
  select
    (select count(*)::integer from mios),
    (select count(*) filter (where mios.gano)::integer from mios),
    (select count(*) filter (where not mios.gano)::integer from mios),
    v_racha,
    (select coalesce(sum(h.delta), 0)::integer
       from public.elo_history h where h.user_id = p_usuario),
    (select c_id from companeros),
    (select u.nombre from public.users u where u.id = (select c_id from companeros)),
    (select c_juntos from companeros),
    (select c_ganados from companeros);
end;
$$;

revoke execute on function public.estadisticas_de(uuid) from anon;
grant execute on function public.estadisticas_de(uuid) to authenticated;
