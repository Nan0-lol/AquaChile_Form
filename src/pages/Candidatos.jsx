import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus } from 'react-icons/fa';
import { buscarCandidatos, obtenerCatalogos, ErrorApi } from '../services/api';
import { normalizar, formatearFecha, hace, iniciales, telefonoLegible } from '../utils/proceso';
import { puede } from '../auth';
import { Cargando, ErrorCarga, Vacio } from '../components/Proceso';
import './NuevaSolicitud.css';

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

  if (carga === 'cargando') return <main className="pr-main"><Cargando texto="Cargando candidatos…" /></main>;
  if (carga === 'error') return <main className="pr-main"><ErrorCarga mensaje={error} onReintentar={cargar} /></main>;

  return (
    <main className="pr-main">
      <div className="pr-titlebar">
        <div>
          <h1>Candidatos</h1>
          <p>{candidatos.length} personas registradas. Cada una puede tener varias evaluaciones.</p>
        </div>
        {puede('solicitud:crear') && (
          <div className="pr-titlebar-actions">
            <Link to="/solicitudes/nueva" className="ns-btn ns-btn--primary">
              <FaPlus aria-hidden="true" /> Nueva solicitud
            </Link>
          </div>
        )}
      </div>

      <section className="ns-card pr-lista" aria-label="Listado de candidatos">
        <div className="pr-filtros">
          <div className="ns-search pr-filtro-q">
            <FaSearch aria-hidden="true" />
            <label htmlFor="cand-q" className="visually-hidden">Buscar candidato</label>
            <input
              id="cand-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, correo o teléfono"
              autoComplete="off"
            />
          </div>
          <div className="ns-field pr-filtro">
            <label htmlFor="cand-origen" className="pr-filtro-label">Origen</label>
            <select id="cand-origen" value={origen} onChange={(e) => setOrigen(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(catalogos.origenes).map(([clave, texto]) => (
                <option key={clave} value={clave}>{texto}</option>
              ))}
            </select>
          </div>
        </div>

        {visibles.length === 0 ? (
          <Vacio
            titulo={candidatos.length ? 'Nadie coincide con la búsqueda' : 'Todavía no hay candidatos'}
            texto={candidatos.length ? 'Revisa cómo está escrito o quita el filtro.' : 'Se registran al crear una solicitud.'}
          />
        ) : (
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead>
                <tr>
                  <th scope="col">Candidato</th>
                  <th scope="col">Contacto</th>
                  <th scope="col">Origen</th>
                  <th scope="col">Evaluaciones</th>
                  <th scope="col">Última solicitud</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/candidatos/${c.id}`)}>
                    <td data-label="Candidato">
                      <div className="pr-persona">
                        <span className="ns-avatar" aria-hidden="true">{iniciales(c.nombre)}</span>
                        <Link to={`/candidatos/${c.id}`} className="pr-row-link" onClick={(e) => e.stopPropagation()}>
                          {c.nombre}
                        </Link>
                      </div>
                    </td>
                    <td data-label="Contacto">
                      <span className="pr-strong">{c.correo}</span>
                      <span className="pr-sub">{telefonoLegible(c.telefono)}</span>
                    </td>
                    <td data-label="Origen">{catalogos.origenes[c.origen] ?? c.origen}</td>
                    <td data-label="Evaluaciones">
                      <span className="pr-numero">{c.totalSolicitudes ?? 0}</span>
                    </td>
                    <td data-label="Última solicitud">
                      {c.ultimaSolicitud ? (
                        <>
                          <span className="pr-strong pr-nowrap">{formatearFecha(c.ultimaSolicitud)}</span>
                          <span className="pr-sub">{hace(c.ultimaSolicitud)}</span>
                        </>
                      ) : (
                        <span className="pr-sin">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {visibles.length > 0 && (
          <p className="pr-pie" aria-live="polite">Mostrando {visibles.length} de {candidatos.length} candidatos</p>
        )}
      </section>
    </main>
  );
};

export default Candidatos;
