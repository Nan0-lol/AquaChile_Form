import React from 'react';
import { Navigate } from 'react-router-dom';
import { haySesion } from './auth';

// Si no hay sesión, manda al login. Si hay, muestra la página protegida.
// Ojo: esto solo oculta la pantalla. La protección real de los datos
// debe estar también en el backend (rutas /api/postulaciones con token).
const RutaProtegida = ({ children }) => {
  if (!haySesion()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default RutaProtegida;