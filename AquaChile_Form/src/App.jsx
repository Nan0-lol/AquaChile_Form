import { useState } from 'react';
import PostulacionForm from './PostulacionForm';
import Dashboard from './Dashboard';

function App() {
  // Estado para cambiar de vista fácilmente mientras desarrollamos
  const [vistaActual, setVistaActual] = useState('dashboard');

  return (
    <div>
      {/* Botoncito flotante abajo a la derecha solo para pruebas */}
      <div style={{ position: 'fixed', bottom: '15px', right: '15px', zIndex: 9999 }}>
        <button
          onClick={() => setVistaActual(vistaActual === 'dashboard' ? 'formulario' : 'dashboard')}
          style={{
            padding: '8px 14px',
            background: '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
        >
          Ver {vistaActual === 'dashboard' ? 'Formulario' : 'Dashboard'}
        </button>
      </div>

      {/* Muestra una pantalla o la otra según el estado */}
      {vistaActual === 'dashboard' ? <Dashboard /> : <PostulacionForm />}
    </div>
  );
}

export default App;