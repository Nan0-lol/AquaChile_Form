import { useState } from 'react'
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage';
import FormularioPostulacion from './pages/PostulacionForm';
import Dashboard from './pages/Dashboard'


function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
          <Route path="/home" element={<Dashboard/>}/>
      </Routes>
      <Routes>
          <Route element={<AppLayout />}>
          <Route path= "/" element={<FormularioPostulacion />}/>
          <Route path="/login" element={<LoginPage/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
