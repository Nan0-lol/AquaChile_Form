import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

// Esqueleto de la página pública (inicio de sesión):
//   NavBar arriba, la página en el medio (<Outlet />) y Footer abajo.
// El footer siempre queda abajo, aunque la página sea corta.
const PublicLayout = () => (
  <div className="flex min-h-screen flex-col">
    <NavBar />
    <main className="flex flex-1 flex-col [&>*]:flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default PublicLayout;
