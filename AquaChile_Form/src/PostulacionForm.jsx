import React, { useState } from 'react';
import './index.css'; 

const FormularioPostulacion = () => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    celular: '', // <-- Nuevo estado para el celular
    familiaCargo: '',
    nombreCargo: '',
    cv: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      cv: e.target.files[0],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validación del peso del archivo (Máximo 5MB)
    const tamañoMaximo = 5 * 1024 * 1024;
    if (formData.cv && formData.cv.size > tamañoMaximo) {
      alert('El archivo es demasiado grande. El tamaño máximo permitido es de 5MB.');
      return;
    }

    console.log('--- Datos listos para enviar al backend ---', formData);
    alert('¡Postulación enviada correctamente!');
    
    // Limpiar los estados después de enviar
    setFormData({
      nombreCompleto: '',
      celular: '', // <-- Se limpia el celular
      familiaCargo: '',
      nombreCargo: '',
      cv: null,
    });
    
    e.target.reset(); // Resetear el input file visualmente
  };

  return (
    <>
      {/* Logo en la esquina superior izquierda */}
      <header className="header-logo">
        <img src="/logo.png" alt="Logo AquaChile" className="logo-esquina" />
      </header>

      {/* Tarjeta del formulario con efecto Glassmorphism */}
      <div className="form-container">
        <h2>Formulario de Postulación</h2>
        
        <form onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label htmlFor="nombreCompleto">Nombre Completo:</label>
            <input
              type="text"
              id="nombreCompleto"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez"
              required
            />
          </div>

          {/* --- NUEVO CAMPO: NÚMERO DE CELULAR --- */}
          <div className="form-group">
            <label htmlFor="celular">Número de Celular:</label>
            <input
              type="tel"
              id="celular"
              name="celular"
              value={formData.celular}
              onChange={handleChange}
              placeholder="Ej. +56 9 1234 5678"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="familiaCargo">Familia de Cargo:</label>
            <select
              id="familiaCargo"
              name="familiaCargo"
              value={formData.familiaCargo}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Selecciona una opción</option>
              <option value="tecnologia">Tecnología / TI</option>
              <option value="recursos_humanos">Recursos Humanos</option>
              <option value="ventas">Ventas / Comercial</option>
              <option value="operaciones">Operaciones</option>
              <option value="finanzas">Finanzas</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="nombreCargo">Nombre del Cargo:</label>
            <input
              type="text"
              id="nombreCargo"
              name="nombreCargo"
              value={formData.nombreCargo}
              onChange={handleChange}
              placeholder="Ej. Desarrollador Frontend Senior"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cv">Sube tu CV (PDF o DOCX, máx. 5MB):</label>
            <input
              type="file"
              id="cv"
              name="cv"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              required
            />
          </div>

          <button type="submit" className="btn-submit">
            Enviar Postulación
          </button>
        </form>
      </div>
    </>
  );
};

export default FormularioPostulacion;