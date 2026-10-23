import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import Postulacion from './pages/Postulacion';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import RutaProtegida from './RutaProtegida';
import './App.css'; // colores y estilos globales

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Páginas públicas: NavBar + página + Footer */}
        <Route element={<PublicLayout />}>
          <Route path="/formulario" element={<Postulacion />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Panel de administración: solo con sesión iniciada */}
        <Route
          element={
            <RutaProtegida>
              <AdminLayout />
            </RutaProtegida>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* La raíz y cualquier URL desconocida llevan al formulario */}
        <Route path="/" element={<Navigate to="/formulario" replace />} />
        <Route path="*" element={<Navigate to="/formulario" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
