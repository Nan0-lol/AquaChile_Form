import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import NuevaSolicitud from './pages/NuevaSolicitud';
import RutaProtegida from './RutaProtegida';
import { haySesion, rutaInicio } from './auth';
import './App.css'; // colores y estilos globales

// La raíz lleva a la pantalla de inicio de cada rol (o al login si no hay sesión)
const Inicio = () => <Navigate to={haySesion() ? rutaInicio() : '/login'} replace />;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Única página pública: el login. El sistema es solo para el equipo. */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Panel: solo con sesión iniciada. Cada página pide su permiso. */}
        <Route
          element={
            <RutaProtegida>
              <AdminLayout />
            </RutaProtegida>
          }
        >
          <Route
            path="/dashboard"
            element={
              <RutaProtegida permiso="indicadores:ver">
                <Dashboard />
              </RutaProtegida>
            }
          />
          <Route
            path="/solicitudes/nueva"
            element={
              <RutaProtegida permiso="solicitud:crear">
                <NuevaSolicitud />
              </RutaProtegida>
            }
          />
        </Route>

        <Route path="/" element={<Inicio />} />
        <Route path="*" element={<Inicio />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
