import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importamos el Layout (Navbar) y las vistas
import AppLayout from './layouts/AppLayout';
import FormularioPostulacion from './PostulacionForm'; // <- Ruta corregida a la carpeta pages
// import Login from './pages/LoginPage'; (Lo conectaremos después)
// import Dashboard from './pages/Dashboard'; (Lo conectaremos después)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Todas las rutas públicas vivirán dentro de AppLayout para heredar el Navbar */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/formulario" replace />} />
          <Route path="formulario" element={<FormularioPostulacion />} />
          {/* <Route path="login" element={<Login />} /> */}
        </Route>
        
        {/* El Dashboard irá por fuera después */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;