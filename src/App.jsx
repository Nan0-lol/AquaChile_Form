import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Postulacion from './pages/Postulacion';
import LoginPage from './pages/LoginPage'; // Tu vista de login existente

function App() {
  return (
    <BrowserRouter>
      {/* El NavBar se renderiza en todas las vistas y contiene los Links */}
      <NavBar />
      <Routes>
        {/* Aquí declaras que la ruta /formulario carga tu nuevo componente */}
        <Route path="/formulario" element={<Postulacion />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/formulario" replace />} />
<Route path="*" element={<Navigate to="/formulario" replace />} />
        
      </Routes>
      
    </BrowserRouter>
  );
}

export default App;