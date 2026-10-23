import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaMoon, FaSun, FaChartPie, FaPlusCircle, FaClipboardList, FaUsers } from 'react-icons/fa';
import { obtenerUsuario, cerrarSesion, puede, NOMBRES_ROL } from '../auth';
import './AdminHeader.css';

const iniciales = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

// Secciones del panel. Cada rol ve solo las que su permiso le deja usar.
const SECCIONES = [
  { ruta: '/solicitudes', texto: 'Solicitudes', Icono: FaClipboardList, permiso: 'solicitud:ver' },
  { ruta: '/candidatos', texto: 'Candidatos', Icono: FaUsers, permiso: 'candidato:ver' },
  { ruta: '/dashboard', texto: 'Panel', Icono: FaChartPie, permiso: 'indicadores:ver' },
  { ruta: '/solicitudes/nueva', texto: 'Nueva solicitud', Icono: FaPlusCircle, permiso: 'solicitud:crear' },
];

// Barra superior del panel: logo, secciones, cambio de tema y menú de usuario.
const AdminHeader = ({ tema = 'light', onAlternarTema }) => {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const usuario = obtenerUsuario();
  const nombre = usuario?.nombre || 'Usuario';
  const rol = NOMBRES_ROL[usuario?.rol] || 'Reclutamiento AquaChile';
  const secciones = SECCIONES.filter((s) => puede(s.permiso));
  const { pathname } = useLocation();
  // "Solicitudes" queda marcada también en el detalle, pero no en "Nueva solicitud"
  const activa = (ruta) =>
    ruta === '/solicitudes'
      ? pathname === ruta || (pathname.startsWith('/solicitudes/') && pathname !== '/solicitudes/nueva')
      : pathname === ruta || pathname.startsWith(`${ruta}/`);

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
        <span className="db-header-section">Evaluaciones Psicolaborales</span>
      </div>

      {secciones.length > 0 && (
        <nav className="db-nav" aria-label="Secciones del panel">
          {secciones.map(({ ruta, texto, Icono }) => (
            <Link
              key={ruta}
              to={ruta}
              className={`db-nav-link${activa(ruta) ? ' is-active' : ''}`}
              aria-current={activa(ruta) ? 'page' : undefined}
            >
              <Icono aria-hidden="true" />
              <span className="db-nav-text">{texto}</span>
            </Link>
          ))}
        </nav>
      )}

      <div className="db-header-right">
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
            aria-label={`${nombre}, ${rol}. Abrir menú de usuario`}
          >
            <span className="db-avatar--light" aria-hidden="true">{iniciales(nombre)}</span>
            <span className="db-user-name" aria-hidden="true">{nombre}</span>
          </button>
          {menuAbierto && (
            <>
              <div className="db-menu-backdrop" onClick={() => setMenuAbierto(false)} />
              <div className="db-user-menu" role="menu">
                <div className="db-user-menu-head">
                  <strong>{nombre}</strong>
                  <span>{rol}</span>
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
