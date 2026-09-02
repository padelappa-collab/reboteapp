import { CORREO_CONTACTO, LegalLayout } from './LegalLayout'

export default function PrivacyPage() {
  return (
    <LegalLayout titulo="Política de privacidad">
      <p>
        REBOTEAPP es una aplicación para jugadores amateur de pádel que registra
        partidos y lleva un ranking. Esta política explica qué datos guardamos, para
        qué, y cómo puedes pedir que los borremos. Está redactada conforme a la Ley
        1581 de 2012 de protección de datos personales de Colombia y su decreto
        reglamentario 1377 de 2013.
      </p>

      <h2>Quién responde por tus datos</h2>
      <p>
        REBOTEAPP, con operación en Cartagena de Indias, Colombia. Para cualquier
        asunto relacionado con tus datos escribe a{' '}
        <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>.
      </p>

      <h2>Qué datos guardamos</h2>
      <p>Solo lo necesario para que el ranking funcione:</p>
      <ul>
        <li>
          <strong>De tu cuenta:</strong> correo electrónico y, si entras con Google,
          tu nombre y tu foto de perfil de Google. No recibimos ni guardamos tu
          contraseña de Google.
        </li>
        <li>
          <strong>De tu perfil de jugador:</strong> nombre con el que quieres
          aparecer, ciudad, género y categoría inicial que declaras al registrarte.
        </li>
        <li>
          <strong>De tu juego:</strong> los partidos en los que participas (fecha,
          cancha, compañeros, rivales y marcador), tu puntaje ELO en cada uno de los
          tres rankings y el historial de cómo ha cambiado.
        </li>
        <li>
          <strong>De tu actividad:</strong> las publicaciones que hagas en el tablón
          de buscar pareja o cuarto, y a cuáles te apuntas.
        </li>
      </ul>
      <p>
        No pedimos ni guardamos documento de identidad, dirección, teléfono ni datos
        de pago. No rastreamos tu ubicación. No usamos cookies de publicidad ni
        analítica de terceros.
      </p>

      <h2>Por qué el género es obligatorio</h2>
      <p>
        REBOTEAPP lleva tres rankings separados: masculino, femenino y mixto. El tipo
        de cada partido se determina según el género de los cuatro jugadores, así que
        sin ese dato el sistema no puede clasificar el partido ni asignar los puntos.
        Es la única razón por la que lo pedimos.
      </p>

      <h2>Qué es público dentro de la app</h2>
      <p>
        REBOTEAPP es una comunidad: los demás jugadores registrados pueden ver tu
        nombre, foto, ciudad, categoría, puntaje ELO, tu posición en el ranking y los
        partidos en los que participaste con su marcador. Esto es parte del propósito
        de la aplicación y no se puede desactivar por separado. Tu correo electrónico
        nunca se muestra a otros jugadores.
      </p>

      <h2>Para qué usamos los datos</h2>
      <ul>
        <li>Identificarte y mantener tu sesión abierta.</li>
        <li>Calcular tu ELO, tu categoría y tu posición en el ranking.</li>
        <li>Mostrar tus partidos a los demás jugadores que participaron en ellos.</li>
        <li>Permitir que otros jugadores te encuentren para armar un partido.</li>
        <li>Avisarte si llevas tiempo sin jugar.</li>
      </ul>
      <p>
        No vendemos tus datos, no los cedemos a terceros con fines comerciales y no te
        enviamos publicidad.
      </p>

      <h2>Quién más los procesa</h2>
      <ul>
        <li>
          <strong>Supabase</strong> aloja la base de datos y gestiona el inicio de
          sesión. Los servidores están fuera de Colombia, lo que implica una
          transferencia internacional de datos que aceptas al registrarte.
        </li>
        <li>
          <strong>Google</strong> interviene únicamente si eliges entrar con tu cuenta
          de Google, y solo nos entrega tu nombre, correo y foto de perfil.
        </li>
      </ul>

      <h2>Cuánto tiempo los conservamos</h2>
      <p>
        Mientras tengas la cuenta activa. Si pides que la borremos, eliminamos tu
        perfil, tus publicaciones y tu historial de ELO. Los partidos en los que
        jugaste no se borran por completo, porque afectan el ranking de otros tres
        jugadores: se conservan sin tu nombre ni tus datos personales.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Como titular de tus datos puedes, en cualquier momento y de forma gratuita:
      </p>
      <ul>
        <li>Conocer qué datos tuyos tenemos y cómo los usamos.</li>
        <li>Pedir que se corrijan si están mal.</li>
        <li>Pedir que se borren, salvo lo indicado en el punto anterior.</li>
        <li>Revocar tu autorización y cerrar tu cuenta.</li>
        <li>
          Presentar una queja ante la Superintendencia de Industria y Comercio si
          consideras que no atendimos tu solicitud.
        </li>
      </ul>
      <p>
        Escribe a <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a> desde el
        correo con el que te registraste. Respondemos en un plazo máximo de 15 días
        hábiles.
      </p>

      <h2>Seguridad</h2>
      <p>
        La conexión con la aplicación viaja cifrada. La base de datos aplica reglas que
        impiden que un jugador modifique el perfil, el puntaje o los partidos de otro:
        el ELO solo lo mueve el sistema cuando los cuatro jugadores confirman el
        resultado, nunca la aplicación en tu teléfono. Aun así, ningún sistema es
        infalible; si detectamos un incidente que afecte tus datos, te avisaremos.
      </p>

      <h2>Menores de edad</h2>
      <p>
        Si eres menor de 18 años necesitas la autorización de tu padre, madre o
        acudiente para usar REBOTEAPP. No creamos cuentas a menores de 14 años.
      </p>

      <h2>Cambios</h2>
      <p>
        Si cambiamos esta política te avisaremos dentro de la aplicación antes de que
        entre en vigor. La fecha de la última revisión aparece al inicio de esta
        página.
      </p>

      <h2>Aviso</h2>
      <p>
        Este documento describe con honestidad el funcionamiento actual de la
        aplicación, pero no ha sido revisado por un abogado. Antes de abrir el registro
        al público conviene que un profesional lo valide.
      </p>
    </LegalLayout>
  )
}
