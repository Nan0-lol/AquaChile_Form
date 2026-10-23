import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUserPlus } from 'react-icons/fa';
import { crearCandidato, obtenerCatalogos, ErrorApi } from '../services/api';
import { validarCampoSolicitud, digitosCelular, formatearCelular } from '../utils/solicitud';
import { Cargando, ErrorCarga } from '../components/Proceso';
import './NuevaSolicitud.css';

const CAMPOS = ['nombre', 'correo', 'telefono', 'origen'];
const INICIAL = { nombre: '', correo: '', telefono: '', origen: '' };

const MensajeError = ({ id, texto }) =>
  texto ? (
    <p id={id} className="ns-error" role="alert">
      {texto}
    </p>
  ) : null;

// Registro de un candidato sin crear todavía una solicitud (vista pedida en el anexo).
// Lo más común es registrarlo desde "Nueva solicitud"; esta vista sirve para dejarlo listo antes.
const NuevoCandidato = () => {
  const navigate = useNavigate();
  const [catalogos, setCatalogos] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [valores, setValores] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [existente, setExistente] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');

  useEffect(() => {
    obtenerCatalogos()
      .then(setCatalogos)
      .catch((err) => err.estado !== 401 && setErrorCarga(err.message));
  }, []);

  const cambiar = (campo, valor) => {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: validarCampoSolicitud(campo, valor) }));
    if (campo === 'correo') setExistente(null);
  };

  const salir = (campo) => {
    if (campo === 'telefono' && valores.telefono.trim()) cambiar('telefono', formatearCelular(valores.telefono));
    if (campo === 'correo' && existente) return; // el aviso del servidor se mantiene
    setErrores((prev) => ({ ...prev, [campo]: validarCampoSolicitud(campo, valores[campo]) }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (guardando) return;
    setErrorEnvio('');
    const nuevos = {};
    for (const campo of CAMPOS) {
      const error = validarCampoSolicitud(campo, valores[campo]);
      if (error) nuevos[campo] = error;
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      const primero = CAMPOS.find((c) => nuevos[c]);
      document.getElementById(primero === 'origen' ? 'origen-interno' : `nc-${primero}`)?.focus();
      return;
    }
    setGuardando(true);
    try {
      const creado = await crearCandidato({
        nombre: valores.nombre.trim(),
        correo: valores.correo.trim(),
        telefono: `+56${digitosCelular(valores.telefono)}`,
        origen: valores.origen,
      });
      navigate(`/candidatos/${creado.id}`, { replace: true, state: { aviso: 'Candidato registrado.' } });
    } catch (err) {
      setGuardando(false);
      if (!(err instanceof ErrorApi) || err.estado === 401) return;
      if (Object.keys(err.errores).length) {
        setErrores(err.errores);
        if (err.datos.candidatoExistente) setExistente(err.datos.candidatoExistente);
      } else {
        setErrorEnvio(err.message);
      }
    }
  };

  if (errorCarga) return <main className="pr-main"><ErrorCarga mensaje={errorCarga} /></main>;
  if (!catalogos) return <main className="pr-main"><Cargando /></main>;

  const propsCampo = (campo) => ({
    id: `nc-${campo}`,
    value: valores[campo],
    onChange: (e) => cambiar(campo, e.target.value),
    onBlur: () => salir(campo),
    'aria-invalid': errores[campo] ? 'true' : 'false',
    'aria-describedby': errores[campo] ? `nc-${campo}-error` : undefined,
    className: errores[campo] ? 'is-error' : undefined,
  });

  return (
    <main className="ns-main">
      <Link to="/candidatos" className="pr-volver">
        <FaArrowLeft aria-hidden="true" /> Candidatos
      </Link>
      <div className="ns-titlebar">
        <h1>Registrar candidato</h1>
        <p>
          Deja registrada a la persona. Después podrás crear su solicitud de evaluación. Todos los campos son
          obligatorios.
        </p>
      </div>

      <form onSubmit={guardar} noValidate className="ns-form">
        <section className="ns-card" aria-labelledby="nc-titulo">
          <header className="ns-card-head">
            <span className="ns-card-icon" aria-hidden="true"><FaUserPlus /></span>
            <div>
              <h2 id="nc-titulo">Datos del candidato</h2>
              <p>Usa solo datos ficticios en esta etapa del proyecto.</p>
            </div>
          </header>
          <div className="ns-card-body">
            <div className="ns-grid">
              <div className="ns-field ns-span-2">
                <label className="ns-label" htmlFor="nc-nombre">Nombre completo</label>
                <input type="text" maxLength={100} autoComplete="off" {...propsCampo('nombre')} />
                <MensajeError id="nc-nombre-error" texto={errores.nombre} />
              </div>
              <div className="ns-field">
                <label className="ns-label" htmlFor="nc-correo">Correo electrónico</label>
                <input type="email" maxLength={254} autoComplete="off" {...propsCampo('correo')} />
                <MensajeError id="nc-correo-error" texto={errores.correo} />
                {existente && (
                  <Link to={`/candidatos/${existente.id}`} className="ns-sugerido">
                    Ver la ficha de {existente.nombre}
                  </Link>
                )}
              </div>
              <div className="ns-field">
                <label className="ns-label" htmlFor="nc-telefono">Celular</label>
                <div className={`ns-phone${errores.telefono ? ' is-error' : ''}`}>
                  <span className="ns-phone-prefix" aria-hidden="true">+56</span>
                  <input type="tel" inputMode="numeric" maxLength={11} placeholder="9 1234 5678" autoComplete="off" {...propsCampo('telefono')} />
                </div>
                <MensajeError id="nc-telefono-error" texto={errores.telefono} />
              </div>
              <fieldset className="ns-field ns-fieldset ns-span-2" aria-describedby={errores.origen ? 'nc-origen-error' : undefined}>
                <legend className="ns-label">Origen</legend>
                <div className="ns-radios">
                  {Object.entries(catalogos.origenes).map(([clave, texto]) => (
                    <label key={clave} className={`ns-radio${valores.origen === clave ? ' is-checked' : ''}`}>
                      <input
                        type="radio"
                        name="nc-origen"
                        id={`origen-${clave}`}
                        value={clave}
                        checked={valores.origen === clave}
                        onChange={() => cambiar('origen', clave)}
                      />
                      <span>
                        <strong>{texto}</strong>
                        <small>{clave === 'interno' ? 'Ya trabaja en AquaChile' : 'Viene de fuera de la empresa'}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <MensajeError id="nc-origen-error" texto={errores.origen} />
              </fieldset>
            </div>
          </div>
        </section>

        <div className="ns-actions">
          {errorEnvio && <p className="ns-alert" role="alert">{errorEnvio}</p>}
          <Link to="/candidatos" className="ns-btn ns-btn--ghost">Cancelar</Link>
          <button type="submit" className="ns-btn ns-btn--primary ns-btn--lg" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar candidato'}
          </button>
        </div>
      </form>
    </main>
  );
};

export default NuevoCandidato;
