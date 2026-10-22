import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Postulacion from './pages/Postulacion';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import RutaProtegida from './RutaProtegida';

function App() {
  return (
    <BrowserRouter>
      {/* Navbar público (se oculta solo en el dashboard) */}
      <NavBar />
      <Routes>
        {/* Público */}
        <Route path="/formulario" element={<Postulacion />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Solo administradores */}
        <Route
          path="/dashboard"
          element={
            <RutaProtegida>
              <Dashboard />
            </RutaProtegida>
          }
        />

        {/* La raíz y cualquier URL desconocida llevan al formulario */}
        <Route path="/" element={<Navigate to="/formulario" replace />} />
        <Route path="*" element={<Navigate to="/formulario" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;