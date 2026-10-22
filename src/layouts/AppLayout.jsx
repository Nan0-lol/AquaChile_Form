import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './AppLayout.css';

const AppLayout = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

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
            {/* Lógica dinámica: Cambia el botón según la página donde estés */}
            {isLoginPage ? (
              <Link to="/formulario" className="nav-link btn-login">
                Volver a Postular
              </Link>
            ) : (
              <Link to="/login" className="nav-link btn-login">
                Iniciar Sesión
              </Link>
            )}
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