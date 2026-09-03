-- =============================================================================
-- Limpiar inscripciones repetidas que quedaron antes de la validación.
--
-- El trigger nuevo impide que alguien se apunte a una publicación en la que ya
-- iba, pero las que se crearon antes siguen guardadas: por eso una publicación
-- puede mostrar a la misma persona dos veces.
--
-- Esto borra solo esas inscripciones sobrantes. No toca las publicaciones ni a
-- quienes se apuntaron legítimamente.
-- =============================================================================

-- Quién estaba apuntado a una publicación donde ya iba (como autor o como
-- acompañante). Conviene mirarlo antes de borrar.
select p.id as publicacion,
       u.nombre as jugador,
       case when s.user_id = p.user_id then 'es el autor' else 'ya iba como acompañante' end as motivo
  from public.board_post_signups s
  join public.board_posts p on p.id = s.post_id
  join public.users u on u.id = s.user_id
 where s.user_id = p.user_id
    or s.user_id = any (p.acompanantes);

-- Y ahora sí, borrarlas.
delete from public.board_post_signups s
 using public.board_posts p
 where p.id = s.post_id
   and (s.user_id = p.user_id or s.user_id = any (p.acompanantes));

-- Las publicaciones que se habían cerrado por un cupo que en realidad no estaba
-- lleno vuelven a quedar abiertas.
update public.board_posts p
   set estado = 'abierto'
 where p.estado = 'completo'
   and (select count(*) from public.board_post_signups s where s.post_id = p.id) < p.faltan;
