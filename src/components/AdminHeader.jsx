import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaExternalLinkAlt, FaMoon, FaSun } from 'react-icons/fa';
import { obtenerUsuario, cerrarSesion } from '../auth';
import './AdminHeader.css';

const iniciales = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

// Barra superior del panel de administración: logo, sección, cambio de tema y menú de usuario.
const AdminHeader = ({ tema = 'light', onAlternarTema }) => {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const usuario = obtenerUsuario() || 'Administrador';

  // Cerrar el menú con Escape
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alPresionar = (e) => e.key === 'Escape' && setMenuAbierto(false);
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [menuAbierto]);

  const salir = () => {
    cerrarSesion();
    navigate('/login', { replace: true });
  };

  return (
    <header className="db-header">
      <div className="db-header-left">
        <img src="/logo.png" alt="AquaChile" className="db-logo" />
        <span className="db-header-divider" aria-hidden="true"></span>
        <span className="db-header-section">Panel de Reclutamiento</span>
      </div>

      <div className="db-header-right">
        <a href="/formulario" target="_blank" rel="noopener noreferrer" className="db-header-link">
          Ver formulario público <FaExternalLinkAlt aria-hidden="true" />
        </a>

        {onAlternarTema && (
          <button
            type="button"
            className="db-theme-btn"
            onClick={onAlternarTema}
            aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {tema === 'dark' ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
          </button>
        )}

        <div className="db-user">
          <button
            type="button"
            className="db-user-btn"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-expanded={menuAbierto}
            aria-haspopup="menu"
          >
            <span className="db-avatar--light">{iniciales(usuario)}</span>
            <span className="db-user-name">{usuario}</span>
          </button>
          {menuAbierto && (
            <>
              <div className="db-menu-backdrop" onClick={() => setMenuAbierto(false)} />
              <div className="db-user-menu" role="menu">
                <div className="db-user-menu-head">
                  <strong>{usuario}</strong>
                  <span>Reclutamiento AquaChile</span>
                </div>
                <button type="button" role="menuitem" onClick={salir}>
                  <FaSignOutAlt aria-hidden="true" /> Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
