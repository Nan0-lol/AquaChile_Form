import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import './AdminLayout.css';

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

// Esqueleto del panel de administración:
//   AdminHeader arriba y la página del panel debajo (<Outlet />).
// El tema (claro/oscuro) vive aquí, así todas las páginas del panel lo comparten.
const AdminLayout = () => {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      /* si no se puede guardar, el tema igual funciona durante la visita */
    }
    // El body también se oscurece, para que no aparezca blanco al hacer scroll
    document.body.classList.toggle('db-body-dark', tema === 'dark');
    return () => document.body.classList.remove('db-body-dark');
  }, [tema]);

  const alternarTema = () => setTema((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div className="db-page" data-theme={tema}>
      <AdminHeader tema={tema} onAlternarTema={alternarTema} />
      <div className="db-page-content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
