-- El numero de fundador, sin huecos.
--
-- Venia de una secuencia, y una secuencia no se deshace: cada intento de
-- registro que falla --el nombre de usuario ya tomado, un corte de red, la
-- sesion caducada-- se queda con su numero para siempre. El resultado es que
-- alguien es el Fundador #7 sin que exista ningun #6, y como el numero sale en
-- el perfil, dos amigos que los comparan ven un hueco que no corresponde a
-- nadie.
--
-- Ahora se calcula contando: el siguiente es el mayor que haya mas uno. El
-- bloqueo serializa los registros simultaneos, que es lo unico que podria dar
-- dos veces el mismo numero. Se libera solo al acabar la transaccion, y como
-- registrarse es raro y rapidisimo, nadie va a esperar por esto.
--
-- El precio: si alguien borra su cuenta, su numero vuelve a estar libre y lo
-- hereda el siguiente. Preferible a los huecos, porque borrarse es raro y
-- fallar al registrarse no lo es.

create or replace function public.users_before_insert()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_base integer;
begin
  v_base := public.elo_inicial(new.categoria_inicial, new.genero);

  new.elo_masculino := case when new.genero = 'masculino' then v_base end;
  new.elo_femenino  := case when new.genero = 'femenino'  then v_base end;
  new.elo_mixto     := v_base;

  new.peak_elo_masculino := new.elo_masculino;
  new.peak_elo_femenino  := new.elo_femenino;
  new.peak_elo_mixto     := v_base;

  new.partidos_jugados := 0;

  perform pg_advisory_xact_lock(hashtext('reboteapp:numero_registro'));
  new.numero_registro :=
    (select coalesce(max(numero_registro), 0) + 1 from public.users);

  return new;
end;
$$;
