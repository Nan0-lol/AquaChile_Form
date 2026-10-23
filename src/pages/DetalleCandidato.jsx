import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaPen, FaTrashAlt, FaPlus, FaEnvelope, FaPhone, FaUser, FaListUl, FaChevronRight } from 'react-icons/fa';
import { obtenerCandidato, obtenerCatalogos, actualizarCandidato, eliminarCandidato, ErrorApi } from '../services/api';
import { formatearFecha, iniciales, telefonoLegible, cambios } from '../utils/proceso';
import { validarCampoSolicitud, digitosCelular, formatearCelular } from '../utils/solicitud';
import { puede } from '../auth';
import { EtapaBadge, Cargando, ErrorCarga, Vacio, Confirmar, Aviso } from '../components/Proceso';
import './NuevaSolicitud.css';

const CAMPOS = ['nombre', 'correo', 'telefono', 'origen'];

const formInicial = (c) => ({
  nombre: c.nombre,
  correo: c.correo,
  telefono: formatearCelular(c.telefono),
  origen: c.origen,
});

const MensajeError = ({ id, texto }) =>
  texto ? (
    <p id={id} className="ns-error" role="alert">
      {texto}
    </p>
  ) : null;

const DetalleCandidato = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidato, setCandidato] = useState(null);
  const [catalogos, setCatalogos] = useState(null);
  const [carga, setCarga] = useState('cargando');
  const [errorCarga, setErrorCarga] = useState('');

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const location = useLocation();
  // Si se llega recién registrado, se muestra el aviso
  const [aviso, setAviso] = useState(location.state?.aviso ? { texto: location.state.aviso } : null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const cargar = () => {
    setCarga('cargando');
    Promise.all([obtenerCandidato(id), obtenerCatalogos()])
      .then(([c, cat]) => {
        setCandidato(c);
        setForm(formInicial(c));
        setCatalogos(cat);
        setCarga('lista');
      })
      .catch((err) => {
        if (err instanceof ErrorApi && err.estado === 401) return;
        setErrorCarga(err.estado === 404 ? 'Este candidato no existe o fue eliminado.' : err.message);
        setCarga('error');
      });
  };
  useEffect(cargar, [id]);

  if (carga === 'cargando') return <main className="pr-main"><Cargando texto="Cargando candidato…" /></main>;
  if (carga === 'error') {
    return (
      <main className="pr-main">
        <Link to="/candidatos" className="pr-volver"><FaArrowLeft aria-hidden="true" /> Candidatos</Link>
        <ErrorCarga mensaje={errorCarga} onReintentar={errorCarga.includes('no existe') ? undefined : cargar} />
      </main>
    );
  }

  const c = candidato;

  const cambiar = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: validarCampoSolicitud(campo, valor) }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const nuevos = {};
    for (const campo of CAMPOS) {
      const error = validarCampoSolicitud(campo, form[campo]);
      if (error) nuevos[campo] = error;
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      document.getElementById(`cand-${Object.keys(nuevos)[0]}`)?.focus();
      return;
    }
    const limpio = {
      nombre: form.nombre.trim(),
      correo: form.correo.trim().toLowerCase(),
      telefono: `+56${digitosCelular(form.telefono)}`,
      origen: form.origen,
    };
    const diferencias = cambios({ ...c, correo: c.correo.toLowerCase() }, limpio);
    if (!Object.keys(diferencias).length) {
      setEditando(false);
      return;
    }
    setGuardando(true);
    try {
      const actualizado = await actualizarCandidato(c.id, diferencias);
      const nuevo = { ...c, ...actualizado };
      setCandidato(nuevo);
      setForm(formInicial(nuevo));
      setEditando(false);
      setAviso({ texto: 'Datos del candidato actualizados.' });
    } catch (err) {
      if (err.estado === 401) return;
      setErrores(err.errores);
      if (!Object.keys(err.errores).length) setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    setBorrando(true);
    try {
      await eliminarCandidato(c.id);
      navigate('/candidatos', { replace: true });
    } catch (err) {
      setBorrando(false);
      setConfirmarBorrado(false);
      if (err.estado !== 401) setAviso({ tipo: 'error', texto: err.message });
    }
  };

  const propsCampo = (campo) => ({
    id: `cand-${campo}`,
    value: form[campo],
    onChange: (e) => cambiar(campo, e.target.value),
    'aria-invalid': errores[campo] ? 'true' : 'false',
    'aria-describedby': errores[campo] ? `cand-${campo}-error` : undefined,
    className: errores[campo] ? 'is-error' : undefined,
  });

  return (
    <main className="pr-main">
      <Link to="/candidatos" className="pr-volver">
        <FaArrowLeft aria-hidden="true" /> Candidatos
      </Link>

      <div className="pr-detalle-head">
        <span className="ns-avatar ns-avatar--lg" aria-hidden="true">{iniciales(c.nombre)}</span>
        <div className="pr-detalle-titulo">
          <h1>{c.nombre}</h1>
          <p>
            {catalogos.origenes[c.origen] ?? c.origen} · Registrado el {formatearFecha(c.creadoEn)}
          </p>
        </div>
        <div className="pr-detalle-acciones">
          {puede('solicitud:crear') && (
            <Link to="/solicitudes/nueva" state={{ candidato: c }} className="ns-btn ns-btn--primary ns-btn--sm">
              <FaPlus aria-hidden="true" /> Nueva solicitud
            </Link>
          )}
          {puede('candidato:eliminar') && (
            <button type="button" className="ns-btn ns-btn--ghost ns-btn--sm pr-btn-borrar" onClick={() => setConfirmarBorrado(true)}>
              <FaTrashAlt aria-hidden="true" /> Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="pr-detalle-grid pr-detalle-grid--candidato">
        <section className="ns-card pr-card">
          <header className="pr-card-head">
            <h2><FaUser aria-hidden="true" /> Datos personales</h2>
            {puede('candidato:editar') && !editando && (
              <button type="button" className="ns-btn ns-btn--ghost ns-btn--sm" onClick={() => setEditando(true)}>
                <FaPen aria-hidden="true" /> Editar
              </button>
            )}
          </header>
          <div className="pr-card-body">
            {!editando ? (
              <dl className="pr-datos pr-datos--una">
                <div className="pr-dato"><dt>Nombre</dt><dd>{c.nombre}</dd></div>
                <div className="pr-dato">
                  <dt>Correo</dt>
                  <dd><FaEnvelope className="pr-ico" aria-hidden="true" /><a href={`mailto:${c.correo}`}>{c.correo}</a></dd>
                </div>
                <div className="pr-dato">
                  <dt>Celular</dt>
                  <dd><FaPhone className="pr-ico" aria-hidden="true" /><a href={`tel:${c.telefono}`}>{telefonoLegible(c.telefono)}</a></dd>
                </div>
                <div className="pr-dato"><dt>Origen</dt><dd>{catalogos.origenes[c.origen] ?? c.origen}</dd></div>
                {c.actualizadoEn && (
                  <div className="pr-dato"><dt>Última edición</dt><dd>{formatearFecha(c.actualizadoEn)}</dd></div>
                )}
              </dl>
            ) : (
              <form onSubmit={guardar} noValidate className="pr-form">
                <div className="ns-field">
                  <label className="ns-label" htmlFor="cand-nombre">Nombre completo</label>
                  <input type="text" maxLength={100} {...propsCampo('nombre')} />
                  <MensajeError id="cand-nombre-error" texto={errores.nombre} />
                </div>
                <div className="ns-field">
                  <label className="ns-label" htmlFor="cand-correo">Correo electrónico</label>
                  <input type="email" maxLength={254} {...propsCampo('correo')} />
                  <MensajeError id="cand-correo-error" texto={errores.correo} />
                </div>
                <div className="ns-field">
                  <label className="ns-label" htmlFor="cand-telefono">Celular</label>
                  <div className={`ns-phone${errores.telefono ? ' is-error' : ''}`}>
                    <span className="ns-phone-prefix" aria-hidden="true">+56</span>
                    <input type="tel" inputMode="numeric" maxLength={11} {...propsCampo('telefono')} />
                  </div>
                  <MensajeError id="cand-telefono-error" texto={errores.telefono} />
                </div>
                <div className="ns-field">
                  <label className="ns-label" htmlFor="cand-origen">Origen</label>
                  <select {...propsCampo('origen')}>
                    {Object.entries(catalogos.origenes).map(([clave, texto]) => (
                      <option key={clave} value={clave}>{texto}</option>
                    ))}
                  </select>
                </div>
                <div className="pr-form-acciones">
                  <button
                    type="button"
                    className="ns-btn ns-btn--ghost"
                    onClick={() => { setForm(formInicial(c)); setErrores({}); setEditando(false); }}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="ns-btn ns-btn--primary" disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="ns-card pr-card">
          <header className="pr-card-head">
            <h2><FaListUl aria-hidden="true" /> Evaluaciones ({c.solicitudes.length})</h2>
          </header>
          <div className="pr-card-body">
            {c.solicitudes.length === 0 ? (
              <Vacio titulo="Sin evaluaciones" texto="Este candidato todavía no tiene solicitudes." />
            ) : (
              <ul className="pr-mini-lista">
                {c.solicitudes.map((s) => (
                  <li key={s.id}>
                    <Link to={`/solicitudes/${s.id}`} className="pr-mini">
                      <span className="pr-mini-info">
                        <strong>{s.nombreCargo}</strong>
                        <span className="pr-sub">
                          {catalogos.familiasCargo[s.familiaCargo] ?? s.familiaCargo} · {s.ubicacion} · {formatearFecha(s.fechaSolicitud)}
                        </span>
                        <span className="pr-sub">
                          {s.evaluador ? `Responsable: ${s.evaluador.nombre}` : 'Sin responsable'}
                          {s.evaluacion.resultado && ` · ${catalogos.resultados[s.evaluacion.resultado]}`}
                        </span>
                      </span>
                      <EtapaBadge etapa={s.etapa} etapas={catalogos.etapas} />
                      <FaChevronRight className="pr-mini-flecha" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <Confirmar
        abierto={confirmarBorrado}
        titulo={`¿Eliminar a ${c.nombre}?`}
        textoConfirmar="Eliminar para siempre"
        peligro
        ocupado={borrando}
        onConfirmar={borrar}
        onCancelar={() => setConfirmarBorrado(false)}
      >
        Se borrarán sus datos y <strong>sus {c.solicitudes.length} evaluaciones</strong>, con documentos e historial.
        Esta acción no se puede deshacer.
      </Confirmar>
      <Aviso aviso={aviso} onCerrar={cerrarAviso} />
    </main>
  );
};

export default DetalleCandidato;
