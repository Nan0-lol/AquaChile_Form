import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './NavBar.css';

// Navbar público: solo el logo.
// - El acceso de administradores está en el footer ("Acceso administradores")
//   para no confundir a los postulantes con un botón de login destacado.
// - En el dashboard no se muestra: el panel tiene su propio header.
const NavBar = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/dashboard')) return null;

  return (
    <header className="site-navbar">
      <Link to="/formulario" className="site-navbar-logo" aria-label="AquaChile, ir al inicio">
        <img src="/logo.png" alt="AquaChile" />
      </Link>
    </header>
  );
};

export default NavBar;