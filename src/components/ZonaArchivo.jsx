import React, { useRef, useState } from 'react';
import { FaCloudUploadAlt, FaFilePdf, FaFileWord, FaTimes } from 'react-icons/fa';
import { formatearTamano, esWord } from '../utils/solicitud';
import { cx, FOCO, Asterisco, Opcional, MensajeError, claseEtiqueta } from './ui';

// Se usa en "Nueva solicitud" (CV y descriptor) y en el formulario público /postular (CV).
/** Zona para arrastrar o elegir un archivo (CV o descriptor de cargo) */
const ZonaArchivo = ({
  id,
  etiqueta,
  obligatorio,
  archivo,
  error,
  ayuda,
  onElegir,
  onQuitar,
  // Formatos que se pueden elegir (el formulario público pide solo PDF)
  accept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  texto = 'Arrastra el archivo o',
  textoEnlace = 'haz clic para elegirlo',
}) => {
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  const elegir = (lista) => {
    onElegir(lista?.[0] ?? null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const quitar = () => {
    onQuitar();
    // Se devuelve el foco al input para que el teclado no quede "perdido"
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="flex min-w-0 flex-col">
      <span className={claseEtiqueta} id={`${id}-label`}>
        {etiqueta}
        {obligatorio ? <Asterisco /> : <Opcional />}
      </span>

      {/* El input real está oculto (sr-only): la zona de abajo muestra su foco con "peer" */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="peer sr-only"
        onChange={(e) => elegir(e.target.files)}
        aria-labelledby={`${id}-label`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
      />

      {!archivo ? (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            elegir(e.dataTransfer.files);
          }}
          className={cx(
            'flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-[18px] text-center transition-colors',
            'hover:border-acento hover:bg-acento-suave peer-focus-visible:border-acento peer-focus-visible:ring-3 peer-focus-visible:ring-anillo',
            arrastrando ? 'border-acento bg-acento-suave' : error ? 'border-error bg-superficie-2' : 'border-borde-fuerte bg-superficie-2'
          )}
        >
          <FaCloudUploadAlt aria-hidden="true" className="text-[26px] text-acento" />
          <span className="text-sm text-texto">
            {texto} <span className="font-semibold text-acento underline underline-offset-3">{textoEnlace}</span>
          </span>
          <span id={`${id}-hint`} className="text-[12.5px] text-sutil">
            {ayuda}
          </span>
        </label>
      ) : (
        <div className="flex min-h-[72px] items-center gap-3 rounded-xl border border-borde-fuerte bg-superficie-2 px-3.5 py-3">
          {esWord(archivo.name) ? (
            <FaFileWord aria-hidden="true" className="shrink-0 text-[28px] text-word" />
          ) : (
            <FaFilePdf aria-hidden="true" className="shrink-0 text-[28px] text-pdf" />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-texto">{archivo.name}</span>
            <span className="text-[12.5px] text-tenue">{formatearTamano(archivo.size)}</span>
          </div>
          <button
            type="button"
            onClick={quitar}
            aria-label={`Quitar ${archivo.name}`}
            className={cx('inline-flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-tenue hover:bg-peligro-suave hover:text-peligro', FOCO)}
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
      )}
      <MensajeError id={`${id}-error`} texto={error} />
    </div>
  );
};

export default ZonaArchivo;
