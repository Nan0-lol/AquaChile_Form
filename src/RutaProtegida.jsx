import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { haySesion, puede, rutaInicio } from './auth';

// Sin sesión: manda al login (y recuerda a dónde quería ir).
// Con sesión pero sin el permiso de la página: muestra un aviso.
// Ojo: esto solo decide qué pantalla se ve. La protección real de los
// datos está en el backend, que revisa el token y el rol en cada petición.
const RutaProtegida = ({ children, permiso }) => {
  const location = useLocation();

  if (!haySesion()) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }

  if (permiso && !puede(permiso)) {
    return (
      <main className="db-sin-permiso">
        <h1>No tienes acceso a esta sección</h1>
        <p>Tu rol no permite ver esta página. Si crees que es un error, habla con el administrador.</p>
        <Link to={rutaInicio()} className="db-sin-permiso-link">
          Ir a mi inicio
        </Link>
      </main>
    );
  }

  return children;
};

export default RutaProtegida;
