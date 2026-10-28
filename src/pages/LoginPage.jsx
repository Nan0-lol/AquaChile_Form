import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { haySesion, iniciarSesion, rutaInicio } from '../auth';
import { cx, Spinner } from '../components/ui';

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
  const claseInput = cx(
    'h-12 w-full rounded-md border bg-white px-[15px] text-[0.95rem] text-slate-800 transition-[border-color,box-shadow]',
    'focus:outline-none focus:ring-3 disabled:cursor-not-allowed disabled:bg-slate-100',
    hayError ? 'border-rose-600 focus:ring-rose-600/15' : 'border-slate-300 focus:border-[#197aa8] focus:ring-[#197aa8]/15'
  );

  return (
    // El login siempre se ve en modo claro (todavía no se sabe qué tema prefiere la persona)
    <section className="flex min-h-[560px] bg-cover bg-[center_right] bg-no-repeat" style={{ backgroundImage: `url('/FondoFormulario.png')` }}>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-linear-100 from-[#1e2d38]/90 via-[#1e2d38]/72 to-[#1e2d38]/45 px-5 py-12">
        <div className="w-full max-w-[420px] animate-aparecer rounded-xl bg-white px-6 pt-8 pb-6 text-slate-800 shadow-[0_30px_60px_-15px_rgb(0_0_0/0.45)] sm:px-10 sm:pt-10 sm:pb-8">
          <div className="mx-auto mb-[18px] flex size-[52px] items-center justify-center rounded-full bg-[#197aa8]/8 text-[#197aa8]">
            <IconoCandado />
          </div>
          <h1 className="mt-0 mb-2 text-center text-2xl font-bold text-[#3e5463]">Evaluaciones Psicolaborales</h1>
          <p className="mt-0 mb-7 text-center text-sm leading-normal text-slate-600">
            Acceso exclusivo para el equipo de Reclutamiento y Selección.
          </p>

          {sesionExpirada && !hayError && (
            <p role="status" className="mt-0 mb-[18px] rounded-lg border border-sky-200 bg-sky-100 px-3.5 py-2.5 text-sm leading-snug text-sky-800">
              Tu sesión expiró. Vuelve a ingresar para continuar.
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5 flex flex-col">
              <label htmlFor="usuario" className="mb-2 text-sm font-medium">
                Usuario
              </label>
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
                className={claseInput}
              />
            </div>

            <div className="mb-5 flex flex-col">
              <label htmlFor="password" className="mb-2 text-sm font-medium">
                Contraseña
              </label>
              <div className="relative flex items-center">
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
                  className={cx(claseInput, 'pr-12')}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((v) => !v)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 flex size-[34px] cursor-pointer items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#3e5463] focus-visible:outline-2 focus-visible:outline-[#197aa8]"
                >
                  <IconoOjo tachado={mostrarPassword} />
                </button>
              </div>
            </div>

            {hayError && (
              <p
                id="login-error"
                role="alert"
                className="-mt-1.5 mb-4 animate-aparecer rounded border-l-3 border-rose-600 bg-rose-50 px-3 py-2.5 text-[13.5px] font-medium text-rose-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-md bg-[#197aa8] text-base font-semibold text-white shadow-[0_8px_18px_-8px_rgb(25_122_168/0.6)] transition-colors hover:bg-[#166d96] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#197aa8]/40 disabled:cursor-wait disabled:opacity-80"
            >
              {cargando ? (
                <>
                  <Spinner className="size-[18px]" />
                  Ingresando…
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          <p className="mt-6 mb-0 border-t border-slate-200 pt-5 text-center text-[13px] leading-normal text-slate-600">
            ¿Problemas para ingresar? Contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
