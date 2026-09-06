-- =============================================================================
-- Fijar el `search_path` de las funciones que no lo tenían.
--
-- Sin un `search_path` fijo, una función resuelve los nombres de tabla contra
-- el que traiga quien la llama. Alguien que pueda crear un esquema propio y
-- ponerlo delante consigue que `users` signifique SU tabla `users`, y la
-- función acaba leyendo o escribiendo donde no debe.
--
-- En las SECURITY DEFINER es un agujero serio y esas ya lo tenían desde el
-- principio. Las que faltaban son las de cálculo y las de trigger, donde el
-- riesgo es menor pero el arreglo es gratis: una línea por función y ningún
-- cambio de comportamiento, porque todas trabajan solo con objetos de `public`.
--
-- Se aplica recorriendo el catálogo en vez de escribir 28 `alter` a mano: así
-- vale igual para las que existan hoy y no hay que acordarse de ninguna.
-- =============================================================================

do $FIJAR$
declare f record;
begin
  for f in
    select p.oid::regprocedure as firma
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and not exists (
         select 1 from unnest(coalesce(p.proconfig, '{}')) c
          where c like 'search_path=%'
       )
  loop
    execute format('alter function %s set search_path = public', f.firma);
  end loop;
end;
$FIJAR$;
