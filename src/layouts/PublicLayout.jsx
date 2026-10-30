import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import { tituloDeRuta } from '../utils/titulo';

// Esqueleto de las páginas públicas:
//   NavBar arriba, la página en el medio (<Outlet />) y el footer abajo.
//   - /postular (cara pública de AquaChile): footer corporativo completo.
//   - /login (entrada al sistema interno): sin footer; la propia página muestra
//     una línea discreta sobre la foto, para que ocupe toda la pantalla.
const PublicLayout = () => {
  const { pathname } = useLocation();
  const esPostulacion = pathname.startsWith('/postular');
  // Nombre de la pestaña según la página
  useEffect(() => {
    document.title = tituloDeRuta(pathname);
  }, [pathname]);
  return (
    <div className="relative flex min-h-screen flex-col">
      <NavBar transparente={!esPostulacion} />
      <main className="flex flex-1 flex-col [&>*]:flex-1">
        <Outlet />
      </main>
      {esPostulacion && <Footer />}
    </div>
  );
};

export default PublicLayout;
