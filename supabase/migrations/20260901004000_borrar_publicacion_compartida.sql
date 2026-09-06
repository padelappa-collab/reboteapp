-- =============================================================================
-- Poder borrar una publicación que ya compartiste por mensaje.
--
-- `messages` exigía que cada mensaje tuviera texto o una publicación. Un mensaje
-- que ES una publicación compartida no lleva texto, así que al borrar la
-- publicación la clave foránea ponía la referencia en nulo, el mensaje se
-- quedaba sin ninguna de las dos cosas y la restricción abortaba el borrado.
--
-- El resultado era que ciertas publicaciones —justo las que compartiste— no se
-- dejaban borrar, sin ninguna explicación en pantalla.
--
-- La restricción se cambia de sitio. Deja de vivir en la tabla, donde se aplica
-- también a los cambios que hace el propio sistema, y pasa a la política de
-- inserción, que es donde de verdad importa: lo que hay que impedir es que
-- alguien mande un mensaje vacío, no que un mensaje viejo se quede huérfano
-- porque borraron lo que enseñaba.
--
-- El chat ya sabe pintar ese caso: cuando la publicación no está, muestra "La
-- publicación ya no está disponible" en vez de un hueco.
-- =============================================================================

alter table public.messages drop constraint if exists mensaje_con_algo;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.es_participante(conversation_id)
    -- un mensaje tiene que decir algo: texto o publicación
    and (contenido is not null or post_compartido_id is not null)
  );
