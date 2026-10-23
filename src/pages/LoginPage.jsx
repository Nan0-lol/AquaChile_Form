import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { haySesion, iniciarSesion, rutaInicio } from '../auth';
import './LoginPage.css';

const IconoOjo = ({ tachado }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {tachado ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

const IconoCandado = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const LoginPage = () => {
  const [credenciales, setCredenciales] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Si llegó aquí porque la sesión venció, se le explica
  const sesionExpirada = Boolean(location.state?.expirada);
  // Si intentó abrir una página del panel sin sesión, vuelve a esa página al entrar
  const destino = (sesion) => {
    const desde = location.state?.desde;
    return desde && desde !== '/login' ? desde : sesion;
  };

  // Si ya hay sesión, no tiene sentido mostrar el login
  if (haySesion()) {
    return <Navigate to={rutaInicio()} replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredenciales((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargando) return;

    const usuario = credenciales.usuario.trim();
    const { password } = credenciales;

    if (!usuario || !password) {
      setError('Ingresa tu usuario y tu contraseña.');
      return;
    }

    setCargando(true);
    try {
      const { ok, mensaje } = await iniciarSesion(usuario, password);
      if (ok) {
        navigate(destino(rutaInicio()), { replace: true });
      } else {
        setError(mensaje || 'Usuario o contraseña incorrectos.');
      }
    } catch {
      setError('No pudimos conectarnos. Inténtalo nuevamente en unos minutos.');
    } finally {
      setCargando(false);
    }
  };

  const hayError = Boolean(error);

  return (
    <main
      className="login-page"
      style={{ backgroundImage: `url('/FondoFormulario.png')` }}
    >
      <div className="login-overlay">
        <div className="login-card">
          <div className="login-icon">
            <IconoCandado />
          </div>
          <h1>Evaluaciones Psicolaborales</h1>
          <p className="login-subtitle">
            Acceso exclusivo para el equipo de Reclutamiento y Selección.
          </p>

          {sesionExpirada && !hayError && (
            <p className="login-aviso" role="status">
              Tu sesión expiró. Vuelve a ingresar para continuar.
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="usuario">Usuario</label>
              <input
                type="text"
                id="usuario"
                name="usuario"
                value={credenciales.usuario}
                onChange={handleChange}
                autoComplete="username"
                aria-invalid={hayError}
                aria-describedby={hayError ? 'login-error' : undefined}
                disabled={cargando}
                autoFocus
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="password-wrapper">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={credenciales.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  aria-invalid={hayError}
                  aria-describedby={hayError ? 'login-error' : undefined}
                  disabled={cargando}
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setMostrarPassword((v) => !v)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <IconoOjo tachado={mostrarPassword} />
                </button>
              </div>
            </div>

            {hayError && (
              <p className="login-error" id="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-login" disabled={cargando}>
              {cargando ? (
                <>
                  <span className="login-spinner" aria-hidden="true"></span>
                  Ingresando…
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          <p className="login-help">
            ¿Problemas para ingresar? Contacta al administrador del sistema.
          </p>
        </div>

      </div>
    </main>
  );
};

export default LoginPage;
