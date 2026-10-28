import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import { verificarSesion } from '../auth';
import { EVENTO_SESION_EXPIRADA } from '../services/api';

const CLAVE_TEMA = 'aquachile_tema';

// Tema inicial: el que eligió la persona la última vez; si nunca eligió,
// el que tenga configurado su sistema operativo (claro u oscuro).
const temaInicial = () => {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'light' || guardado === 'dark') return guardado;
  } catch {
    /* sin acceso al almacenamiento: se usa la preferencia del sistema */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Esqueleto del panel: AdminHeader arriba y la página debajo (<Outlet />).
// Aquí vive el tema (claro/oscuro) y el control de la sesión, así todas
// las páginas del panel lo comparten.
const AdminLayout = () => {
  const navigate = useNavigate();
  const [tema, setTema] = useState(temaInicial);
  const [, setSesionRevisada] = useState(false);

  // El tema se marca en <html>: así los colores de index.css cambian en toda la página
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      /* si no se puede guardar, el tema igual funciona durante la visita */
    }
    document.documentElement.dataset.theme = tema;
    return () => {
      delete document.documentElement.dataset.theme; // el login siempre se ve claro
    };
  }, [tema]);

  // Si la sesión expira (o el servidor se reinició), se vuelve al login con un aviso
  useEffect(() => {
    const alExpirar = () => navigate('/login', { replace: true, state: { expirada: true } });
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    verificarSesion().then((viva) => {
      if (!viva) alExpirar();
      else setSesionRevisada(true); // vuelve a dibujar el menú con el rol actualizado
    });
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  }, [navigate]);

  const alternarTema = () => setTema((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div className="flex min-h-screen flex-col bg-fondo text-texto">
      <AdminHeader tema={tema} onAlternarTema={alternarTema} />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
