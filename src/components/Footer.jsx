import React from 'react';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

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

// Sobre el fondo oscuro se usa el acento claro (el acento normal no llega a 4.5:1)
const ENLACE_CLARO = 'no-underline outline-none transition-colors hover:text-acento-claro focus-visible:text-acento-claro';

// Footer corporativo: aparece en la página de inicio de sesión (PublicLayout)
const Footer = () => (
  <footer className="bg-marca px-6 pt-9 text-white">
    <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-6">
      <div>
        <img src="/logo.png" alt="AquaChile" className="mb-2.5 block h-10 object-contain" />
        <p className="m-0 text-[0.85rem] leading-[1.7] tracking-[0.5px] text-slate-200">
          CARDONAL S/N, LOTE B,
          <br />
          PUERTO MONTT, CHILE
          <br />
          <a href="tel:+56652433500" className={`text-inherit ${ENLACE_CLARO}`}>
            +(56) 65 2433 500
          </a>
        </p>
      </div>
      <nav aria-label="Enlaces de AquaChile" className="flex flex-col items-start gap-3.5 sm:items-end">
        {ENLACES.map((enlace) => (
          <a
            key={enlace.texto}
            href={enlace.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[0.95rem] font-medium text-slate-50 hover:-translate-x-1 ${ENLACE_CLARO}`}
          >
            {enlace.texto}
          </a>
        ))}
      </nav>
    </div>

    <div className="mx-auto mt-7 flex max-w-[1100px] flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-4 pb-5 text-[0.8rem] text-slate-300">
      <span>© {new Date().getFullYear()} AquaChile. Todos los derechos reservados.</span>
      <div className="flex items-center gap-2.5">
        <span className="mr-1">Encuéntranos</span>
        {REDES_SOCIALES.map(({ nombre, url, Icono }) => (
          <a
            key={nombre}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`AquaChile en ${nombre} (se abre en una pestaña nueva)`}
            className="inline-flex size-[34px] items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 hover:text-acento-claro focus-visible:ring-2 focus-visible:ring-acento-claro"
          >
            <Icono aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  </footer>
);

export default Footer;
