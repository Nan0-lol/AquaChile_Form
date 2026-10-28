import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUserPlus } from 'react-icons/fa';
import { crearCandidato, obtenerCatalogos, ErrorApi } from '../services/api';
import { validarCampoSolicitud, digitosCelular, formatearCelular } from '../utils/solicitud';
import {
  cx,
  Boton,
  Campo,
  EntradaCelular,
  OpcionRadio,
  MensajeError,
  Tarjeta,
  Alerta,
  Pagina,
  Titulo,
  Cargando,
  ErrorCarga,
  claseEntrada,
  claseEtiqueta,
  claseVolver,
} from '../components/ui';

const CAMPOS = ['nombre', 'correo', 'telefono', 'origen'];
const INICIAL = { nombre: '', correo: '', telefono: '', origen: '' };

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

  if (errorCarga) return <Pagina ancho="angosto"><ErrorCarga mensaje={errorCarga} /></Pagina>;
  if (!catalogos) return <Pagina ancho="angosto"><Cargando /></Pagina>;

  const propsCampo = (campo) => ({
    id: `nc-${campo}`,
    value: valores[campo],
    onChange: (e) => cambiar(campo, e.target.value),
    onBlur: () => salir(campo),
    'aria-invalid': errores[campo] ? 'true' : 'false',
    'aria-describedby': errores[campo] ? `nc-${campo}-error` : undefined,
    className: claseEntrada(errores[campo]),
  });

  return (
    <Pagina ancho="angosto">
      <Link to="/candidatos" className={claseVolver}>
        <FaArrowLeft aria-hidden="true" /> Candidatos
      </Link>
      <Titulo titulo="Registrar candidato">
        Deja registrada a la persona. Después podrás crear su solicitud de evaluación. Todos los campos son obligatorios.
      </Titulo>

      <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
        <Tarjeta titulo="Datos del candidato" Icono={FaUserPlus} descripcion="Usa solo datos ficticios en esta etapa del proyecto." cuerpo="px-4 pt-5 pb-6 sm:px-6">
          <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
            <Campo id="nc-nombre" etiqueta="Nombre completo" error={errores.nombre} className="sm:col-span-2">
              <input type="text" maxLength={100} autoComplete="off" {...propsCampo('nombre')} />
            </Campo>
            <div className="flex min-w-0 flex-col">
              <Campo id="nc-correo" etiqueta="Correo electrónico" error={errores.correo}>
                <input type="email" maxLength={254} autoComplete="off" {...propsCampo('correo')} />
              </Campo>
              {existente && (
                <Link
                  to={`/candidatos/${existente.id}`}
                  className="mt-2 self-start rounded text-[13px] font-semibold text-acento underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
                >
                  Ver la ficha de {existente.nombre}
                </Link>
              )}
            </div>
            <Campo id="nc-telefono" etiqueta="Celular" error={errores.telefono}>
              <EntradaCelular error={errores.telefono} {...propsCampo('telefono')} />
            </Campo>
            <fieldset className="m-0 min-w-0 border-0 p-0 sm:col-span-2" aria-describedby={errores.origen ? 'nc-origen-error' : undefined}>
              <legend className={cx(claseEtiqueta, 'p-0')}>Origen</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(catalogos.origenes).map(([clave, texto]) => (
                  <OpcionRadio
                    key={clave}
                    id={`origen-${clave}`}
                    name="nc-origen"
                    value={clave}
                    checked={valores.origen === clave}
                    onChange={() => cambiar('origen', clave)}
                    titulo={texto}
                    detalle={clave === 'interno' ? 'Ya trabaja en AquaChile' : 'Viene de fuera de la empresa'}
                  />
                ))}
              </div>
              <MensajeError id="nc-origen-error" texto={errores.origen} />
            </fieldset>
          </div>
        </Tarjeta>

        <div className="flex flex-wrap items-center justify-end gap-3 [&>*]:grow sm:[&>*]:grow-0">
          {errorEnvio && <Alerta>{errorEnvio}</Alerta>}
          <Boton as={Link} to="/candidatos" variante="fantasma">
            Cancelar
          </Boton>
          <Boton type="submit" tamano="lg" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar candidato'}
          </Boton>
        </div>
      </form>
    </Pagina>
  );
};

export default NuevoCandidato;
