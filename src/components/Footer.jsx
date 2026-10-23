import React from 'react';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import './Footer.css';

// Enlaces oficiales de AquaChile (se abren en pestaña nueva)
const ENLACES = [
  { texto: 'Contacto comercial', url: 'https://es.aquachile.com/contacto-comercial/' },
  { texto: 'Trabaja con nosotros', url: 'https://trabajos.aquachile.com/' },
  { texto: 'Canal de Denuncias', url: 'https://secure.ethicspoint.com/domain/media/es/gui/90628/index.html' },
];

const REDES_SOCIALES = [
  { nombre: 'Facebook', url: 'https://www.facebook.com/TiendaAquaChile', Icono: FaFacebookF },
  { nombre: 'Instagram', url: 'https://www.instagram.com/aqua_chile/', Icono: FaInstagram },
  { nombre: 'X', url: 'https://x.com/aqua_chile', Icono: FaXTwitter },
];

// Footer corporativo: aparece en la página de inicio de sesión (PublicLayout)
const Footer = () => (
  <footer className="aquachile-footer">
    <div className="footer-content">
      <div className="footer-logo">
        <img src="/logo.png" alt="AquaChile" className="footer-logo-img" />
        <p>
          CARDONAL S/N, LOTE B,<br />
          PUERTO MONTT, CHILE<br />
          <a href="tel:+56652433500" className="footer-phone">+(56) 65 2433 500</a>
        </p>
      </div>
      <div className="footer-links">
        {ENLACES.map((enlace) => (
          <a key={enlace.texto} href={enlace.url} target="_blank" rel="noopener noreferrer">
            {enlace.texto}
          </a>
        ))}
      </div>
    </div>

    <div className="footer-bottom">
      <div className="footer-bottom-left">
        <span>© {new Date().getFullYear()} AquaChile. Todos los derechos reservados.</span>
      </div>
      <div className="footer-social">
        <span className="footer-social-label">Encuéntranos</span>
        {REDES_SOCIALES.map(({ nombre, url, Icono }) => (
          <a
            key={nombre}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`AquaChile en ${nombre} (se abre en una pestaña nueva)`}
            className="social-link"
          >
            <Icono aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  </footer>
);

export default Footer;
