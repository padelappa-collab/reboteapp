-- Que nadie pueda escribir columnas que no le tocan.
--
-- Dos agujeros distintos, los dos por permisos de mas:
--
-- 1. `authenticated` podia INSERTAR cualquier columna de `users`. Los ELO los
--    reescribe el disparador al crear la fila, asi que por ahi no se colaba
--    nada, pero `numero_registro` no: quien se registrara mandando
--    numero_registro=1 se quedaba con el "Fundador #1" aunque llegara el
--    ultimo. La politica solo miraba de quien es la fila, no que columnas trae.
--
-- 2. `anon` tenia INSERT/UPDATE/DELETE en 16 tablas. Hoy no hace nada porque
--    todas las politicas son de `authenticated` y RLS lo frena --comprobado
--    contra la API, devuelve 42501--, pero es un permiso esperando a que
--    alguien anada una politica permisiva y lo abra sin darse cuenta.
--
-- El cliente solo manda seis columnas al registrarse; el resto las pone la base.

revoke insert on public.users from authenticated;
grant insert (id, nombre, username, ciudad, genero, categoria_inicial)
  on public.users to authenticated;

do $ANON$
declare t text;
begin
  for t in
    select table_name from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
      and privilege_type in ('INSERT','UPDATE','DELETE')
    group by table_name
  loop
    execute format('revoke insert, update, delete on public.%I from anon', t);
  end loop;
end;
$ANON$;
