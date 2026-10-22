import React from 'react';
import { Navigate } from 'react-router-dom';
import { haySesion } from './auth';

const RutaProtegida = ({ children }) => {
  if (!haySesion()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default RutaProtegida;