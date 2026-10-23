import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import './PublicLayout.css';

// Esqueleto de las páginas públicas (formulario y login):
//   NavBar arriba, la página en el medio (<Outlet />) y Footer abajo.
const PublicLayout = () => (
  <div className="public-layout">
    <NavBar />
    <main className="public-layout-content">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default PublicLayout;
