import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaMoon, FaSun, FaChartPie, FaPlusCircle, FaClipboardList, FaUsers, FaInbox } from 'react-icons/fa';
import { obtenerUsuario, cerrarSesion, puede, NOMBRES_ROL } from '../auth';
import { cx, iniciales } from './ui';

// Secciones del panel. Cada rol ve solo las que su permiso le deja usar.
// "Nueva solicitud" se oculta en celulares (no cabe): ahí se usa el botón de la lista de solicitudes.
const SECCIONES = [
  { ruta: '/postulaciones', texto: 'Postulaciones', Icono: FaInbox, permiso: 'postulacion:ver' },
  { ruta: '/solicitudes', texto: 'Solicitudes', Icono: FaClipboardList, permiso: 'solicitud:ver' },
  { ruta: '/candidatos', texto: 'Candidatos', Icono: FaUsers, permiso: 'candidato:ver' },
  { ruta: '/dashboard', texto: 'Panel', Icono: FaChartPie, permiso: 'indicadores:ver' },
  { ruta: '/solicitudes/nueva', texto: 'Nueva solicitud', Icono: FaPlusCircle, permiso: 'solicitud:crear', soloPantallaGrande: true },
];

// Botón redondo del header (tema y usuario comparten este estilo)
const BOTON_HEADER =
  'cursor-pointer border border-white/15 bg-white/8 text-white transition-colors hover:bg-white/16 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-claro';

// Barra superior del panel: logo, secciones, cambio de tema y menú de usuario.
const AdminHeader = ({ tema = 'light', onAlternarTema }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const usuario = obtenerUsuario();
  const nombre = usuario?.nombre || 'Usuario';
  const rol = NOMBRES_ROL[usuario?.rol] || 'Reclutamiento AquaChile';
  const secciones = SECCIONES.filter((s) => puede(s.permiso));

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
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-2 border-b border-transparent bg-encabezado px-3 max-[359px]:gap-1 max-[359px]:px-2 shadow-[0_2px_10px_rgb(15_30_45/0.15)] sm:gap-4 sm:px-8 dark:border-borde">
      <div className="flex min-w-0 items-center gap-2 sm:gap-[18px]">
        <img src="/logo.png" alt="AquaChile" className="block h-[26px] w-auto sm:h-9" />
        <span aria-hidden="true" className="hidden h-[26px] w-px bg-white/25 xl:block" />
        <span className="hidden text-[15px] font-semibold whitespace-nowrap text-white xl:block">Evaluaciones Psicolaborales</span>
      </div>

      {secciones.length > 0 && (
        <nav aria-label="Secciones del panel" className="mr-auto ml-1 flex items-center gap-0.5 sm:ml-3 sm:gap-1">
          {secciones.map(({ ruta, texto, Icono, soloPantallaGrande }) => {
            const esActiva = activa(ruta);
            return (
              <Link
                key={ruta}
                to={ruta}
                aria-current={esActiva ? 'page' : undefined}
                className={cx(
                  'size-9 items-center justify-center gap-2 rounded-lg max-[359px]:size-8 text-sm whitespace-nowrap no-underline transition-colors lg:h-[38px] lg:w-auto lg:px-2.5 xl:px-3.5',
                  soloPantallaGrande ? 'hidden sm:inline-flex' : 'inline-flex',
                  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-claro',
                  esActiva ? 'bg-white/14 font-semibold text-white' : 'font-medium text-slate-200 hover:bg-white/8 hover:text-white'
                )}
              >
                <Icono aria-hidden="true" className={cx('text-base lg:text-sm', esActiva ? 'text-acento-claro' : 'opacity-85')} />
                <span className="sr-only lg:not-sr-only lg:whitespace-nowrap">{texto}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <div className="flex min-w-0 items-center gap-2 sm:gap-[18px]">
        {onAlternarTema && (
          <button
            type="button"
            onClick={onAlternarTema}
            aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            className={cx(BOTON_HEADER, 'inline-flex size-[34px] shrink-0 items-center justify-center rounded-full text-[15px] sm:size-[38px] hover:rotate-20')}
          >
            {tema === 'dark' ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-expanded={menuAbierto}
            aria-haspopup="menu"
            aria-label={`${nombre}, ${rol}. Abrir menú de usuario`}
            className={cx(BOTON_HEADER, 'flex items-center gap-2.5 rounded-full p-1 sm:pr-3', menuAbierto && 'bg-white/16')}
          >
            <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-marca">
              {iniciales(nombre)}
            </span>
            <span aria-hidden="true" className="hidden max-w-40 truncate text-sm font-semibold sm:block">
              {nombre}
            </span>
          </button>
          {menuAbierto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(false)} />
              <div role="menu" className="absolute top-[calc(100%+8px)] right-0 z-41 min-w-[220px] animate-aparecer overflow-hidden rounded-[10px] border border-borde bg-superficie shadow-alta">
                <div className="flex flex-col gap-0.5 border-b border-borde px-4 py-3.5">
                  <strong className="text-sm text-texto">{nombre}</strong>
                  <span className="text-xs text-tenue">{rol}</span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={salir}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left text-sm text-peligro outline-none hover:bg-peligro-suave focus-visible:bg-peligro-suave"
                >
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
