-- El anti-duplicado, reducido a lo que de verdad tiene que evitar.
--
-- Antes bloqueaba cualquier partido entre los mismos cuatro jugadores dentro de
-- tres horas, sin mirar como se emparejaban ni como quedo. En padel eso es lo
-- normal: se juegan dos o tres seguidos y se cambian las parejas para la
-- revancha. La regla estaba impidiendo registrar partidos legitimos, y en el
-- piloto la gente se topaba con "Este partido ya esta registrado" sin entender
-- por que.
--
-- Lo unico que hay que evitar es el doble toque en "Registrar partido": el
-- mismo formulario enviado dos veces. Eso produce dos filas identicas en
-- cuestion de segundos, asi que se bloquea solo cuando coincide TODO:
--
--   . el tipo de partido
--   . el emparejamiento exacto (esta pareja contra esta otra, no el grupo de 4)
--   . el marcador exacto
--   . la fecha del partido
--   . y se registro hace menos de diez minutos
--
-- Cambiar de pareja o que el marcador sea otro basta para que pase, jueguen los
-- que jueguen ese dia.
--
-- La ventana se mide sobre `created_at` --cuando se guardo-- y no sobre
-- `fecha` --cuando se jugo--, porque lo que se persigue es el envio repetido,
-- no la cercania entre partidos.
--
-- Los jugadores de cada pareja se ordenan antes de comparar: el mismo duo puede
-- llegar en distinto orden segun como se toque en la pantalla, y eso no lo
-- convierte en otra pareja.

create or replace function public.matches_sin_duplicado()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_a          uuid[] := (select array_agg(x order by x) from unnest(new.pareja_a) x);
  v_b          uuid[] := (select array_agg(x order by x) from unnest(new.pareja_b) x);
  v_existente  uuid;
begin
  if new.tournament_id is not null then
    return new;
  end if;

  select m.id into v_existente
    from public.matches m
   where m.estado <> 'cancelado'
     and m.tournament_id is null
     and m.created_at > now() - interval '10 minutes'
     and m.fecha = new.fecha
     and m.match_type is not distinct from new.match_type
     and m.sets = new.sets
     and (select array_agg(x order by x) from unnest(m.pareja_a) x) = v_a
     and (select array_agg(x order by x) from unnest(m.pareja_b) x) = v_b
   limit 1;

  if v_existente is not null then
    raise exception
      'Ese partido lo acabas de registrar. Miralo en tus partidos antes de volver a guardarlo.'
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;
