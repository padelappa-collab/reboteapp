import { Link } from 'react-router-dom'
import { CORREO_CONTACTO, LegalLayout } from './LegalLayout'

export default function TermsPage() {
  return (
    <LegalLayout titulo="Términos y condiciones">
      <p>
        Al crear una cuenta en REBOTEAPP aceptas estos términos. Si no estás de
        acuerdo con alguno, no uses la aplicación.
      </p>

      <h2>Qué es REBOTEAPP</h2>
      <p>
        Una aplicación para que jugadores amateur de pádel registren sus partidos,
        lleven un ranking por puntaje ELO y encuentren con quién jugar. El servicio se
        presta de forma gratuita y está en fase de piloto en Cartagena.
      </p>

      <h2>Qué NO es</h2>
      <ul>
        <li>
          <strong>No reservamos canchas.</strong> El directorio de canchas es
          informativo. Los botones de reserva te llevan a la página del club o a
          plataformas externas como Playtomic, y lo que pase ahí se rige por los
          términos de esos terceros, no por los nuestros.
        </li>
        <li>
          <strong>No organizamos los partidos.</strong> Lo que acuerdes con otros
          jugadores es entre ustedes.
        </li>
        <li>
          <strong>No somos una federación.</strong> Las categorías de REBOTEAPP son
          internas y no equivalen a una categoría oficial de FECOLPA ni de ningún otro
          organismo, aunque usen nombres parecidos.
        </li>
      </ul>

      <h2>Tu cuenta</h2>
      <ul>
        <li>Necesitas ser mayor de 18 años o contar con autorización de un acudiente.</li>
        <li>Una persona, una cuenta. Las cuentas duplicadas distorsionan el ranking.</li>
        <li>
          Los datos que declaras al registrarte —nombre, género y categoría inicial—
          deben ser reales. El género y la categoría inicial no se pueden cambiar
          después, porque de ellos dependen tu puntaje de partida y la clasificación de
          tus partidos.
        </li>
        <li>Eres responsable de lo que pase con tu cuenta.</li>
      </ul>

      <h2>Resultados y ranking</h2>
      <ul>
        <li>
          Un partido lo registra uno de los cuatro jugadores y{' '}
          <strong>solo cuenta cuando los cuatro confirman el marcador</strong>. Hasta
          entonces no mueve ningún puntaje.
        </li>
        <li>
          Si alguno no está de acuerdo, el partido queda en disputa y no afecta el
          ranking. Quien lo creó puede borrarlo y registrarlo bien.
        </li>
        <li>
          Registrar resultados falsos, pactar partidos para inflar puntos o crear
          cuentas para regalarse victorias son motivo de suspensión y de corrección
          manual de los puntajes afectados.
        </li>
        <li>
          El puntaje ELO es un número calculado por una fórmula. No es una medida
          oficial de tu nivel y puede ajustarse si detectamos un error en el cálculo o
          resultados manipulados.
        </li>
      </ul>

      <h2>Convivencia</h2>
      <p>
        En el tablón y en los espacios donde puedas escribir: nada de insultos, acoso,
        contenido sexual, discriminación, spam ni publicidad. Podemos retirar
        contenido y suspender cuentas que incumplan esto.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        REBOTEAPP se ofrece tal como está, sin garantía de disponibilidad
        ininterrumpida. No respondemos por lesiones, accidentes, pérdidas económicas ni
        conflictos que surjan de partidos acordados a través de la aplicación, ni por
        el comportamiento de otros jugadores o de las canchas listadas.
      </p>

      <h2>Cierre de cuenta</h2>
      <p>
        Puedes pedir que borremos tu cuenta cuando quieras escribiendo a{' '}
        <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>. Podemos suspender
        cuentas que incumplan estos términos. Al cerrarse una cuenta se aplica lo
        descrito en la{' '}
        <Link to="/privacidad">política de privacidad</Link> sobre conservación de
        partidos.
      </p>

      <h2>Cambios</h2>
      <p>
        Podemos ajustar estos términos y las reglas del ranking —incluida la fórmula
        del ELO— mientras el piloto avanza. Los cambios importantes se avisan dentro de
        la aplicación.
      </p>

      <h2>Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República de Colombia. Cualquier
        controversia se someterá a los jueces de Cartagena de Indias.
      </p>

      <h2>Aviso</h2>
      <p>
        Este documento no ha sido revisado por un abogado. Antes de abrir el registro
        al público conviene que un profesional lo valide.
      </p>
    </LegalLayout>
  )
}
