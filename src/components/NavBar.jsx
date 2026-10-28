import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Barra superior de las páginas públicas (formulario de postulación e inicio de sesión).
// El logo lleva al inicio de la página en que se está: quien postula nunca llega al login por aquí.
const NavBar = () => {
  const { pathname } = useLocation();
  const inicio = pathname.startsWith('/postular') ? '/postular' : '/login';
  return (
    <header className="relative z-20 flex min-h-16 items-center justify-between bg-marca px-5 shadow-[0_4px_12px_rgb(0_0_0/0.12)] md:min-h-[72px] md:px-[6%]">
      <Link
        to={inicio}
        aria-label="AquaChile, ir al inicio"
        className="inline-flex items-center rounded outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acento-claro"
      >
        <img src="/logo.png" alt="AquaChile" className="block h-[34px] w-auto object-contain md:h-[42px]" />
      </Link>
    </header>
  );
};

export default NavBar;
