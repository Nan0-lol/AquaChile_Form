import React from 'react';
import { Link } from 'react-router-dom';
import './NavBar.css';

// Barra superior de la página pública (inicio de sesión).
const NavBar = () => (
  <header className="site-navbar">
    <Link to="/login" className="site-navbar-logo" aria-label="AquaChile, ir al inicio">
      <img src="/logo.png" alt="AquaChile" />
    </Link>
  </header>
);

export default NavBar;
