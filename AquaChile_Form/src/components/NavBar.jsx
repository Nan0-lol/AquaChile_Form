import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/home">Inicio</NavLink>
      <NavLink to="/">Formulario</NavLink>
      <NavLink to="/login">Login</NavLink>
    </nav>
  );
}