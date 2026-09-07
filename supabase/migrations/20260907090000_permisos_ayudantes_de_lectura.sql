-- Devolver el permiso a los ayudantes de solo lectura.
--
-- Cuando cerramos las funciones al publico, se devolvio el permiso solo a las
-- IMMUTABLE. Estas seis son STABLE porque consultan tablas, y se quedaron
-- fuera. No se noto hasta hoy porque casi todas se llaman desde funciones
-- SECURITY DEFINER, que corren con los permisos de su dueno y no piden nada al
-- que llama.
--
-- La excepcion es `infer_match_type`, que se llama desde `matches_before_insert`
-- --un disparador normal, sin SECURITY DEFINER-- y por tanto corre con los
-- permisos del jugador. Resultado: registrar un partido reventaba con
-- "permission denied for function infer_match_type", que es el flujo central de
-- la app. Se descubrio con usuarios reales dentro.
--
-- Abrirlas no ensena nada nuevo: todas leen de `users` y `matches`, que
-- cualquiera con sesion ya puede consultar por sus politicas. Lo que hacen es
-- resumir esos datos, no destaparlos.

grant execute on function public.infer_match_type(uuid[])                        to authenticated;
grant execute on function public.companeros_distintos(uuid)                      to authenticated;
grant execute on function public.nombre_de(uuid)                                 to authenticated;
grant execute on function public.numero_categoria_de(uuid, ranking_tipo)         to authenticated;
grant execute on function public.pareja_cuadra_con_ranking(uuid, uuid, ranking_tipo) to authenticated;
grant execute on function public.racha_de_victorias(uuid)                        to authenticated;
