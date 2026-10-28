import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaPen, FaTrashAlt, FaPlus, FaEnvelope, FaPhone, FaUser, FaListUl, FaChevronRight } from 'react-icons/fa';
import { obtenerCandidato, obtenerCatalogos, actualizarCandidato, eliminarCandidato, ErrorApi } from '../services/api';
import { formatearFecha, telefonoLegible, cambios } from '../utils/proceso';
import { validarCampoSolicitud, digitosCelular, formatearCelular } from '../utils/solicitud';
import { puede } from '../auth';
import { EtapaBadge } from '../components/Proceso';
import {
  cx,
  FOCO,
  Boton,
  Campo,
  Selector,
  EntradaCelular,
  Avatar,
  Tarjeta,
  ListaDatos,
  Dato,
  Pagina,
  Cargando,
  ErrorCarga,
  Vacio,
  Confirmar,
  Aviso,
  claseEntrada,
  claseVolver,
} from '../components/ui';

const CAMPOS = ['nombre', 'correo', 'telefono', 'origen'];
const ENLACE = 'text-acento underline-offset-2 hover:underline [overflow-wrap:anywhere]';

const formInicial = (c) => ({
  nombre: c.nombre,
  correo: c.correo,
  telefono: formatearCelular(c.telefono),
  origen: c.origen,
});

const DetalleCandidato = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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

  if (carga === 'cargando') return <Pagina><Cargando texto="Cargando candidato…" /></Pagina>;
  if (carga === 'error') {
    return (
      <Pagina>
        <Link to="/candidatos" className={claseVolver}>
          <FaArrowLeft aria-hidden="true" /> Candidatos
        </Link>
        <ErrorCarga mensaje={errorCarga} onReintentar={errorCarga.includes('no existe') ? undefined : cargar} />
      </Pagina>
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
    className: claseEntrada(errores[campo]),
  });

  return (
    <Pagina>
      <Link to="/candidatos" className={claseVolver}>
        <FaArrowLeft aria-hidden="true" /> Candidatos
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Avatar nombre={c.nombre} grande />
        <div className="min-w-[220px] flex-1">
          <h1 className="mt-0 mb-1 text-[1.35rem] font-bold text-titulo sm:text-[1.6rem]">{c.nombre}</h1>
          <p className="m-0 text-[14.5px] text-tenue">
            {catalogos.origenes[c.origen] ?? c.origen} · Registrado el {formatearFecha(c.creadoEn)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {puede('solicitud:crear') && (
            <Boton as={Link} to="/solicitudes/nueva" state={{ candidato: c }} tamano="sm">
              <FaPlus aria-hidden="true" /> Nueva solicitud
            </Boton>
          )}
          {puede('candidato:eliminar') && (
            <Boton variante="peligro-suave" tamano="sm" onClick={() => setConfirmarBorrado(true)}>
              <FaTrashAlt aria-hidden="true" /> Eliminar
            </Boton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Tarjeta
          titulo="Datos personales"
          Icono={FaUser}
          accion={
            puede('candidato:editar') &&
            !editando && (
              <Boton variante="fantasma" tamano="sm" onClick={() => setEditando(true)}>
                <FaPen aria-hidden="true" /> Editar
              </Boton>
            )
          }
        >
          {!editando ? (
            <ListaDatos una>
              <Dato etiqueta="Nombre">{c.nombre}</Dato>
              <Dato etiqueta="Correo">
                <FaEnvelope aria-hidden="true" className="mr-2 inline align-[-1px] text-xs text-sutil" />
                <a href={`mailto:${c.correo}`} className={ENLACE}>
                  {c.correo}
                </a>
              </Dato>
              <Dato etiqueta="Celular">
                <FaPhone aria-hidden="true" className="mr-2 inline align-[-1px] text-xs text-sutil" />
                <a href={`tel:${c.telefono}`} className={ENLACE}>
                  {telefonoLegible(c.telefono)}
                </a>
              </Dato>
              <Dato etiqueta="Origen">{catalogos.origenes[c.origen] ?? c.origen}</Dato>
              {c.actualizadoEn && <Dato etiqueta="Última edición">{formatearFecha(c.actualizadoEn)}</Dato>}
            </ListaDatos>
          ) : (
            <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
              <Campo id="cand-nombre" etiqueta="Nombre completo" error={errores.nombre}>
                <input type="text" maxLength={100} {...propsCampo('nombre')} />
              </Campo>
              <Campo id="cand-correo" etiqueta="Correo electrónico" error={errores.correo}>
                <input type="email" maxLength={254} {...propsCampo('correo')} />
              </Campo>
              <Campo id="cand-telefono" etiqueta="Celular" error={errores.telefono}>
                <EntradaCelular error={errores.telefono} {...propsCampo('telefono')} />
              </Campo>
              <Campo id="cand-origen" etiqueta="Origen">
                <Selector {...propsCampo('origen')}>
                  {Object.entries(catalogos.origenes).map(([clave, texto]) => (
                    <option key={clave} value={clave}>
                      {texto}
                    </option>
                  ))}
                </Selector>
              </Campo>
              <div className="flex flex-wrap justify-end gap-2.5">
                <Boton
                  variante="fantasma"
                  onClick={() => {
                    setForm(formInicial(c));
                    setErrores({});
                    setEditando(false);
                  }}
                  disabled={guardando}
                >
                  Cancelar
                </Boton>
                <Boton type="submit" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar cambios'}
                </Boton>
              </div>
            </form>
          )}
        </Tarjeta>

        <Tarjeta titulo={`Evaluaciones (${c.solicitudes.length})`} Icono={FaListUl}>
          {c.solicitudes.length === 0 ? (
            <Vacio titulo="Sin evaluaciones" texto="Este candidato todavía no tiene solicitudes." />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {c.solicitudes.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/solicitudes/${s.id}`}
                    className={cx(
                      'flex flex-wrap items-center gap-3 rounded-[10px] border border-borde px-3.5 py-3 text-texto no-underline transition-colors hover:border-acento hover:bg-acento-suave',
                      FOCO
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <strong className="block text-[14.5px]">{s.nombreCargo}</strong>
                      <span className="mt-0.5 block text-[12.5px] text-tenue">
                        {catalogos.familiasCargo[s.familiaCargo] ?? s.familiaCargo} · {s.ubicacion} · {formatearFecha(s.fechaSolicitud)}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] text-tenue">
                        {s.evaluador ? `Responsable: ${s.evaluador.nombre}` : 'Sin responsable'}
                        {s.evaluacion.resultado && ` · ${catalogos.resultados[s.evaluacion.resultado]}`}
                      </span>
                    </span>
                    <EtapaBadge etapa={s.etapa} etapas={catalogos.etapas} />
                    <FaChevronRight aria-hidden="true" className="shrink-0 text-xs text-sutil" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
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
        Se borrarán sus datos y <strong>sus {c.solicitudes.length} evaluaciones</strong>, con documentos e historial. Esta acción no se puede deshacer.
      </Confirmar>
      <Aviso aviso={aviso} onCerrar={cerrarAviso} />
    </Pagina>
  );
};

export default DetalleCandidato;
