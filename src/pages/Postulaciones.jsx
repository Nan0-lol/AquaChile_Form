import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaSearch,
  FaFilePdf,
  FaFileWord,
  FaArrowRight,
  FaBan,
  FaUndo,
  FaTrashAlt,
  FaLink,
  FaEnvelope,
  FaPhone,
  FaUserCheck,
} from 'react-icons/fa';
import {
  listarPostulaciones,
  obtenerCatalogos,
  cambiarEstadoPostulacion,
  eliminarPostulacion,
  descargarCvPostulacion,
  ErrorApi,
} from '../services/api';
import { filtrarPostulaciones, contarPorEstado } from '../utils/postulacion';
import { hace, formatearFecha, telefonoLegible } from '../utils/proceso';
import { esWord } from '../utils/solicitud';
import { puede } from '../auth';
import {
  cx,
  Boton,
  Avatar,
  Pagina,
  Titulo,
  Cargando,
  ErrorCarga,
  Vacio,
  Confirmar,
  Aviso,
  claseTarjeta,
} from '../components/ui';

// =====================================================================
// BANDEJA DE POSTULACIONES
// Lo que llega desde el formulario público /postular. El analista revisa
// cada una y la pasa a evaluación (se abre "Nueva solicitud" con los datos
// y el CV ya cargados) o la descarta.
// =====================================================================

const PESTANAS = [
  { estado: 'nueva', texto: 'Por revisar' },
  { estado: 'en_evaluacion', texto: 'En evaluación' },
  { estado: 'descartada', texto: 'Descartadas' },
  { estado: '', texto: 'Todas' },
];

const COLOR_ESTADO = {
  nueva: 'bg-e-recibida-bg text-e-recibida',
  en_evaluacion: 'bg-e-agendada-bg text-e-agendada',
  descartada: 'bg-superficie-3 text-tenue',
};

const EstadoBadge = ({ estado, texto }) => (
  <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap', COLOR_ESTADO[estado])}>
    <span aria-hidden="true" className="size-[7px] rounded-full bg-current" />
    {texto}
  </span>
);

const ENLACE = 'font-semibold text-acento underline-offset-2 hover:underline rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento';

const Postulaciones = () => {
  const navigate = useNavigate();
  const [postulaciones, setPostulaciones] = useState([]);
  const [catalogos, setCatalogos] = useState(null);
  const [carga, setCarga] = useState('cargando');
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('nueva');
  const [q, setQ] = useState('');
  const [ocupada, setOcupada] = useState(null); // id de la que se está procesando
  const [aBorrar, setABorrar] = useState(null);
  const [aviso, setAviso] = useState(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const gestiona = puede('postulacion:gestionar');
  const enlaceFormulario = `${window.location.origin}/postular`;

  const cargar = () => {
    setCarga('cargando');
    Promise.all([listarPostulaciones(), obtenerCatalogos()])
      .then(([lista, cat]) => {
        setPostulaciones(lista);
        setCatalogos(cat);
        setCarga('lista');
      })
      .catch((err) => {
        if (err instanceof ErrorApi && err.estado === 401) return;
        setError(err.message);
        setCarga('error');
      });
  };
  useEffect(cargar, []);

  const buscadas = useMemo(() => filtrarPostulaciones(postulaciones, { q }), [postulaciones, q]);
  const conteo = useMemo(() => contarPorEstado(buscadas), [buscadas]);
  const visibles = useMemo(() => filtrarPostulaciones(buscadas, { estado }), [buscadas, estado]);

  const reemplazar = (actualizada) =>
    setPostulaciones((prev) => prev.map((p) => (p.id === actualizada.id ? actualizada : p)));

  const cambiarEstado = async (p, nuevo) => {
    setOcupada(p.id);
    try {
      reemplazar(await cambiarEstadoPostulacion(p.id, nuevo));
      setAviso({ texto: nuevo === 'descartada' ? `Postulación de ${p.nombre} descartada.` : `Postulación de ${p.nombre} reabierta.` });
    } catch (err) {
      if (err.estado !== 401) setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setOcupada(null);
    }
  };

  const borrar = async () => {
    const p = aBorrar;
    setOcupada(p.id);
    try {
      await eliminarPostulacion(p.id);
      setPostulaciones((prev) => prev.filter((x) => x.id !== p.id));
      setAviso({ texto: 'Postulación eliminada.' });
    } catch (err) {
      if (err.estado !== 401) setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setOcupada(null);
      setABorrar(null);
    }
  };

  const descargarCv = async (p) => {
    try {
      await descargarCvPostulacion(p);
    } catch (err) {
      if (err.estado !== 401) setAviso({ tipo: 'error', texto: err.message });
    }
  };

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(enlaceFormulario);
      setAviso({ texto: 'Enlace del formulario copiado.' });
    } catch {
      setAviso({ texto: `Enlace del formulario: ${enlaceFormulario}` });
    }
  };

  if (carga === 'cargando') return <Pagina><Cargando texto="Cargando postulaciones…" /></Pagina>;
  if (carga === 'error') return <Pagina><ErrorCarga mensaje={error} onReintentar={cargar} /></Pagina>;

  const area = (p) => catalogos.areasInteres?.[p.area] ?? p.area;
  const textoEstado = (e) => catalogos.estadosPostulacion?.[e] ?? e;
  const porRevisar = contarPorEstado(postulaciones).nueva;

  return (
    <Pagina>
      <Titulo
        titulo="Postulaciones web"
        acciones={
          <Boton variante="contorno" onClick={copiarEnlace}>
            <FaLink aria-hidden="true" /> Copiar enlace del formulario
          </Boton>
        }
      >
        Lo que llega desde el formulario público. {porRevisar}{' '}
        {porRevisar === 1 ? 'postulación por revisar' : 'postulaciones por revisar'}.
      </Titulo>

      <section className={cx(claseTarjeta, 'overflow-hidden')} aria-label="Listado de postulaciones">
        <div className="px-3.5 pt-3.5 sm:px-5 sm:pt-[18px]">
          <div className="flex h-11 items-center gap-2.5 rounded-lg border border-borde-fuerte bg-superficie px-3 transition-[border-color,box-shadow] focus-within:border-acento focus-within:ring-3 focus-within:ring-anillo">
            <FaSearch aria-hidden="true" className="shrink-0 text-sutil" />
            <label htmlFor="postulaciones-q" className="sr-only">
              Buscar
            </label>
            <input
              id="postulaciones-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o correo"
              autoComplete="off"
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14.5px] text-texto outline-none placeholder:text-sutil"
            />
          </div>
        </div>

        <div role="group" aria-label="Filtrar por estado" className="mt-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-borde px-3.5 [scrollbar-width:thin]">
          {PESTANAS.map((t) => {
            const activa = estado === t.estado;
            return (
              <button
                key={t.estado || 'todas'}
                type="button"
                aria-pressed={activa}
                onClick={() => setEstado(t.estado)}
                className={cx(
                  '-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-2.5 py-3 text-sm font-semibold whitespace-nowrap',
                  'outline-none focus-visible:ring-3 focus-visible:ring-anillo',
                  activa ? 'border-acento text-acento' : 'border-transparent text-tenue hover:text-texto'
                )}
              >
                {t.texto}
                <span
                  className={cx(
                    'min-w-[22px] rounded-full px-[7px] py-px text-center text-xs',
                    activa ? 'bg-acento-suave text-acento' : 'bg-superficie-3 text-tenue'
                  )}
                >
                  {t.estado ? conteo[t.estado] : buscadas.length}
                </span>
              </button>
            );
          })}
        </div>

        {visibles.length === 0 ? (
          <Vacio
            titulo={q ? 'Sin resultados' : estado === 'nueva' ? 'No hay postulaciones por revisar' : 'No hay postulaciones aquí'}
            texto={q ? 'Prueba con otro nombre o correo.' : 'Cuando alguien postule en el formulario público, aparecerá en esta lista.'}
          />
        ) : (
          <ul className="m-0 list-none divide-y divide-borde p-0">
            {visibles.map((p) => {
              const IconoCv = esWord(p.cv?.nombre) ? FaFileWord : FaFilePdf;
              const procesando = ocupada === p.id;
              return (
                <li key={p.id} className="flex flex-col gap-3.5 px-3.5 py-4 sm:px-5 lg:flex-row lg:items-center lg:gap-5">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar nombre={p.nombre} />
                    <div className="min-w-0 flex-1">
                      <strong className="text-[15px] text-texto">{p.nombre}</strong>
                      <p className="mt-1 mb-0 text-sm text-texto">
                        Área de interés: <span className="font-semibold">{area(p)}</span>
                      </p>
                      <p className="mt-1 mb-0 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-tenue">
                        <span className="inline-flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]">
                          <FaEnvelope aria-hidden="true" className="shrink-0 text-sutil" /> {p.correo}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <FaPhone aria-hidden="true" className="text-sutil" /> {telefonoLegible(p.telefono)}
                        </span>
                        <span title={formatearFecha(p.creadoEn)}>Llegó: {hace(p.creadoEn).toLowerCase()}</span>
                      </p>
                      {p.estado === 'nueva' && p.candidatoId && (
                        <p className="mt-1.5 mb-0 inline-flex items-center gap-1.5 text-[12.5px] text-tenue">
                          <FaUserCheck aria-hidden="true" className="text-acento" />
                          Ya está registrado como candidato.{' '}
                          <Link to={`/candidatos/${p.candidatoId}`} className={ENLACE}>
                            Ver ficha
                          </Link>
                        </p>
                      )}
                      {p.estado !== 'nueva' && p.revisadoPor && (
                        <p className="mt-1.5 mb-0 text-[12.5px] text-tenue">
                          {p.estado === 'descartada' ? 'Descartada' : 'Pasada a evaluación'} por {p.revisadoPor} el{' '}
                          {formatearFecha(p.revisadoEn)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-[46px] lg:justify-end lg:pl-0">
                    <EstadoBadge estado={p.estado} texto={textoEstado(p.estado)} />
                    <Boton variante="fantasma" tamano="sm" onClick={() => descargarCv(p)} aria-label={`Descargar CV de ${p.nombre}`}>
                      <IconoCv aria-hidden="true" /> CV
                    </Boton>
                    {gestiona && p.estado === 'nueva' && (
                      <>
                        <Boton variante="fantasma" tamano="sm" disabled={procesando} onClick={() => cambiarEstado(p, 'descartada')}>
                          <FaBan aria-hidden="true" /> Descartar
                        </Boton>
                        <Boton tamano="sm" disabled={procesando} onClick={() => navigate('/solicitudes/nueva', { state: { postulacion: p } })}>
                          Pasar a evaluación <FaArrowRight aria-hidden="true" />
                        </Boton>
                      </>
                    )}
                    {gestiona && p.estado === 'descartada' && (
                      <Boton variante="contorno" tamano="sm" disabled={procesando} onClick={() => cambiarEstado(p, 'nueva')}>
                        <FaUndo aria-hidden="true" /> Reabrir
                      </Boton>
                    )}
                    {p.estado === 'en_evaluacion' && p.solicitudId && (
                      <Boton as={Link} to={`/solicitudes/${p.solicitudId}`} variante="contorno" tamano="sm">
                        Ver solicitud <FaArrowRight aria-hidden="true" />
                      </Boton>
                    )}
                    {puede('postulacion:eliminar') && (
                      <Boton
                        variante="peligro-suave"
                        tamano="sm"
                        disabled={procesando}
                        onClick={() => setABorrar(p)}
                        aria-label={`Eliminar la postulación de ${p.nombre}`}
                      >
                        <FaTrashAlt aria-hidden="true" />
                      </Boton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Confirmar
        abierto={Boolean(aBorrar)}
        titulo={aBorrar ? `¿Eliminar la postulación de ${aBorrar.nombre}?` : ''}
        textoConfirmar="Eliminar para siempre"
        peligro
        ocupado={Boolean(aBorrar) && ocupada === aBorrar.id}
        onConfirmar={borrar}
        onCancelar={() => setABorrar(null)}
      >
        Se borrarán sus datos y su CV. Si ya pasó a evaluación, la solicitud no se toca. Esta acción no se puede deshacer.
      </Confirmar>
      <Aviso aviso={aviso} onCerrar={cerrarAviso} />
    </Pagina>
  );
};

export default Postulaciones;
