import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './AppLayout.css';

const AppLayout = () => {
  const location = useLocation();

  return (
    <div className="layout-wrapper">
      {/* Barra de Navegación Superior */}
      <nav className="global-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <Link to="/formulario">
              <img src="/logo.png" alt="AquaChile Logo" className="navbar-logo" />
            </Link>
          </div>
          
          <div className="navbar-menu">
            {/* Solo dejamos el botón de Iniciar Sesión para ir a la zona privada */}
            <Link 
              to="/login" 
              className={`nav-link btn-login ${location.pathname === '/login' ? 'active' : ''}`}
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* Área donde se carga el formulario o el login */}
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;