import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Solicitudes from './pages/Solicitudes';
import NuevaSolicitud from './pages/NuevaSolicitud';
import DetalleSolicitud from './pages/DetalleSolicitud';
import Candidatos from './pages/Candidatos';
import DetalleCandidato from './pages/DetalleCandidato';
import NuevoCandidato from './pages/NuevoCandidato';
import Postular from './pages/Postular';
import Postulaciones from './pages/Postulaciones';
import RutaProtegida from './RutaProtegida';
import { haySesion, rutaInicio } from './auth';

// La raíz lleva a la pantalla de inicio (o al login si no hay sesión)
const Inicio = () => <Navigate to={haySesion() ? rutaInicio() : '/login'} replace />;

// Atajo: página del panel que exige un permiso
const conPermiso = (permiso, pagina) => <RutaProtegida permiso={permiso}>{pagina}</RutaProtegida>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Páginas públicas:
            - /postular: formulario para postular (solo ENVÍA datos, no muestra nada del sistema)
            - /login: entrada del equipo de Reclutamiento */}
        <Route element={<PublicLayout />}>
          <Route path="/postular" element={<Postular />} />
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
          <Route path="/dashboard" element={conPermiso('indicadores:ver', <Dashboard />)} />
          <Route path="/postulaciones" element={conPermiso('postulacion:ver', <Postulaciones />)} />
          <Route path="/solicitudes" element={conPermiso('solicitud:ver', <Solicitudes />)} />
          <Route path="/solicitudes/nueva" element={conPermiso('solicitud:crear', <NuevaSolicitud />)} />
          <Route path="/solicitudes/:id" element={conPermiso('solicitud:ver', <DetalleSolicitud />)} />
          <Route path="/candidatos" element={conPermiso('candidato:ver', <Candidatos />)} />
          <Route path="/candidatos/nuevo" element={conPermiso('candidato:crear', <NuevoCandidato />)} />
          <Route path="/candidatos/:id" element={conPermiso('candidato:ver', <DetalleCandidato />)} />
        </Route>

        <Route path="/" element={<Inicio />} />
        <Route path="*" element={<Inicio />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
