import { Outlet } from "react-router-dom";
import Navbar from "../components/NavBar"; // Dos puntos ../ y coincidencia de mayúsculas (NavBar)
import './AppLayout.css'; // Corregido: punto .css en vez de coma ,css

function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar /> 
      
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;