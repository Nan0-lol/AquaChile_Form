import React from 'react';
import { Link } from 'react-router-dom';
import './NavBar.css';

// Barra superior de las páginas públicas (formulario y login).
// El acceso de administradores está en el Footer, para no confundir a los postulantes.
const NavBar = () => (
  <header className="site-navbar">
    <Link to="/formulario" className="site-navbar-logo" aria-label="AquaChile, ir al inicio">
      <img src="/logo.png" alt="AquaChile" />
    </Link>
  </header>
);

export default NavBar;
