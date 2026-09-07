-- El emoji que quedaba, y los avisos ya escritos.
--
-- Buscando si el patron de `badges.icono` se repetia en otro sitio aparecio uno
-- distinto pero igual de visible: el aviso de campeon de torneo llevaba el
-- trofeo escrito a mano en el titulo. No lo detecto la prueba de punta a punta
-- porque nunca llegue a finalizar un torneo, solo a cargar una ronda.
--
-- Se comprobo recorriendo el codigo de TODAS las funciones del esquema en busca
-- de bytes de emoji, no leyendolas de una en una: avisar_insignia (corregida en
-- la migracion anterior) y esta eran las unicas dos.
--
-- Ademas se reescriben los avisos que ya estaban guardados con el emoji viejo.
-- Se recorta por la palabra "Ganaste" en vez de listar emojis, asi que vale
-- igual para los dos tipos y para cualquiera que se hubiera colado.

create or replace function public.avisar_torneo_cambio()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_jugador  uuid;
  v_campeon  uuid;
  v_ganadora uuid[];
begin
  if old.estado = new.estado then
    return new;
  end if;

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
          'Ganaste ' || new.nombre,
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
$$;

update public.notifications
   set titulo = btrim(substring(titulo from position('Ganaste' in titulo)))
 where tipo in ('insignia', 'torneo_campeon')
   and position('Ganaste' in titulo) > 1;
