export const datosFake = {
  nombre: "Diego Barria",
  correo: "diegogonzalobarrimartinez1@gmail.com",
  cargo: "Full-stack",
};

export const template = `
  <div style="max-width: 520px; padding: 24px; border: 1px solid #dee2e6;">
    <h2>AquaChile - Confirmación de Postulación</h2>
    <p>Hola <strong>${datosFake.nombre}</strong>,</p>
    <p>Correo: ${datosFake.correo} · Cargo: ${datosFake.cargo}</p>
  </div>
`;