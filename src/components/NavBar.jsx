import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Barra superior de las páginas públicas.
//   - En el login es transparente y va encima de la foto (solo se ve el logo).
//   - En /postular es la franja corporativa de siempre.
// El logo lleva al inicio de la página en que se está: quien postula nunca llega al login por aquí.
const NavBar = ({ transparente = false }) => {
  const { pathname } = useLocation();
  const inicio = pathname.startsWith('/postular') ? '/postular' : '/login';
  return (
    <header
      className={
        transparente
          ? 'absolute inset-x-0 top-0 z-20 flex min-h-16 items-center bg-linear-to-b from-[#1e2d38]/55 to-transparent px-5 md:min-h-[88px] md:px-8'
          : 'relative z-20 flex min-h-16 items-center bg-marca px-5 shadow-[0_4px_12px_rgb(0_0_0/0.12)] md:min-h-[72px] md:px-8'
      }
    >
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
