import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus, FaUserPlus } from 'react-icons/fa';
import { buscarCandidatos, obtenerCatalogos, ErrorApi } from '../services/api';
import { normalizar, formatearFecha, hace, telefonoLegible } from '../utils/proceso';
import { puede } from '../auth';
import { cx, Boton, Selector, Avatar, Pagina, Titulo, Cargando, ErrorCarga, Vacio, SinDato, claseTarjeta } from '../components/ui';

const ENLACE_FILA =
  'font-semibold text-texto no-underline hover:text-acento hover:underline rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento';

const Candidatos = () => {
  const navigate = useNavigate();
  const [candidatos, setCandidatos] = useState([]);
  const [catalogos, setCatalogos] = useState(null);
  const [carga, setCarga] = useState('cargando');
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [origen, setOrigen] = useState('');

  const cargar = () => {
    setCarga('cargando');
    Promise.all([buscarCandidatos(), obtenerCatalogos()])
      .then(([lista, cat]) => {
        setCandidatos(lista);
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

  const visibles = useMemo(() => {
    const busqueda = normalizar(q);
    return candidatos.filter(
      (c) =>
        (!origen || c.origen === origen) &&
        (!busqueda || normalizar(`${c.nombre} ${c.correo} ${c.telefono}`).includes(busqueda))
    );
  }, [candidatos, q, origen]);

  if (carga === 'cargando') return <Pagina><Cargando texto="Cargando candidatos…" /></Pagina>;
  if (carga === 'error') return <Pagina><ErrorCarga mensaje={error} onReintentar={cargar} /></Pagina>;

  const nombreOrigen = (c) => catalogos.origenes[c.origen] ?? c.origen;
  const evaluaciones = (c) => `${c.totalSolicitudes ?? 0} ${c.totalSolicitudes === 1 ? 'evaluación' : 'evaluaciones'}`;

  return (
    <Pagina>
      <Titulo
        titulo="Candidatos"
        acciones={
          (puede('candidato:crear') || puede('solicitud:crear')) && (
            <>
              {puede('candidato:crear') && (
                <Boton as={Link} to="/candidatos/nuevo" variante="contorno">
                  <FaUserPlus aria-hidden="true" /> Registrar candidato
                </Boton>
              )}
              {puede('solicitud:crear') && (
                <Boton as={Link} to="/solicitudes/nueva">
                  <FaPlus aria-hidden="true" /> Nueva solicitud
                </Boton>
              )}
            </>
          )
        }
      >
        {candidatos.length} personas registradas. Cada una puede tener varias evaluaciones.
      </Titulo>

      <section className={cx(claseTarjeta, 'overflow-hidden')} aria-label="Listado de candidatos">
        <div className="grid grid-cols-1 items-end gap-3 border-b border-borde px-3.5 py-3.5 sm:grid-cols-[minmax(0,1fr)_190px] sm:px-5 sm:py-[18px]">
          <div className="flex h-11 items-center gap-2.5 rounded-lg border border-borde-fuerte bg-superficie px-3 transition-[border-color,box-shadow] focus-within:border-acento focus-within:ring-3 focus-within:ring-anillo">
            <FaSearch aria-hidden="true" className="shrink-0 text-sutil" />
            <label htmlFor="cand-q" className="sr-only">
              Buscar candidato
            </label>
            <input
              id="cand-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, correo o teléfono"
              autoComplete="off"
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14.5px] text-texto outline-none placeholder:text-sutil"
            />
          </div>
          <div>
            <label htmlFor="cand-origen" className="mb-[5px] block text-xs font-semibold text-tenue">
              Origen
            </label>
            <Selector id="cand-origen" value={origen} onChange={(e) => setOrigen(e.target.value)} alto="h-11">
              <option value="">Todos</option>
              {Object.entries(catalogos.origenes).map(([clave, texto]) => (
                <option key={clave} value={clave}>
                  {texto}
                </option>
              ))}
            </Selector>
          </div>
        </div>

        {visibles.length === 0 ? (
          <Vacio
            titulo={candidatos.length ? 'Nadie coincide con la búsqueda' : 'Todavía no hay candidatos'}
            texto={candidatos.length ? 'Revisa cómo está escrito o quita el filtro.' : 'Se registran al crear una solicitud.'}
          />
        ) : (
          <>
            {/* Tabla en pantallas medianas y grandes */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-superficie-2 text-left text-xs font-bold tracking-[0.04em] text-sutil uppercase">
                    {['Candidato', 'Contacto', 'Origen', 'Evaluaciones', 'Última solicitud'].map((col) => (
                      <th key={col} scope="col" className="border-b border-borde px-4 py-3">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {visibles.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/candidatos/${c.id}`)} className="cursor-pointer transition-colors hover:bg-acento-suave">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar nombre={c.nombre} />
                          <Link to={`/candidatos/${c.id}`} onClick={(e) => e.stopPropagation()} className={ENLACE_FILA}>
                            {c.nombre}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-texto">{c.correo}</span>
                        <span className="mt-0.5 block text-[12.5px] text-tenue">{telefonoLegible(c.telefono)}</span>
                      </td>
                      <td className="px-4 py-3 text-texto">{nombreOrigen(c)}</td>
                      <td className="px-4 py-3 font-bold text-texto tabular-nums">{c.totalSolicitudes ?? 0}</td>
                      <td className="px-4 py-3">
                        {c.ultimaSolicitud ? (
                          <>
                            <span className="block font-semibold whitespace-nowrap text-texto">{formatearFecha(c.ultimaSolicitud)}</span>
                            <span className="mt-0.5 block text-[12.5px] text-tenue">{hace(c.ultimaSolicitud)}</span>
                          </>
                        ) : (
                          <SinDato />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas en celulares */}
            <ul className="m-0 list-none divide-y divide-borde p-0 md:hidden">
              {visibles.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/candidatos/${c.id}`}
                    className="flex items-center gap-3 px-3.5 py-3.5 text-texto no-underline outline-none hover:bg-acento-suave focus-visible:bg-acento-suave"
                  >
                    <Avatar nombre={c.nombre} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate">{c.nombre}</strong>
                      <span className="block truncate text-[12.5px] text-tenue">{c.correo}</span>
                      <span className="block text-[12.5px] text-tenue">
                        {nombreOrigen(c)} · {evaluaciones(c)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <p aria-live="polite" className="m-0 border-t border-borde px-5 py-3 text-[13px] text-sutil">
              Mostrando {visibles.length} de {candidatos.length} candidatos
            </p>
          </>
        )}
      </section>
    </Pagina>
  );
};

export default Candidatos;
