import { describe, test, expect } from 'vitest';
import { tituloDeRuta } from './titulo';

describe('Nombre de la pestaña', () => {
  test('cada página tiene su nombre', () => {
    expect(tituloDeRuta('/login')).toBe('Ingreso · AquaChile');
    expect(tituloDeRuta('/postular')).toBe('Postula · AquaChile');
    expect(tituloDeRuta('/dashboard')).toBe('Panel · AquaChile');
  });

  test('distingue la lista, el detalle y el formulario nuevo', () => {
    expect(tituloDeRuta('/solicitudes')).toBe('Solicitudes · AquaChile');
    expect(tituloDeRuta('/solicitudes/nueva')).toBe('Nueva solicitud · AquaChile');
    expect(tituloDeRuta('/solicitudes/abc-123')).toBe('Detalle de solicitud · AquaChile');
    expect(tituloDeRuta('/candidatos/nuevo')).toBe('Registrar candidato · AquaChile');
  });

  test('una ruta desconocida muestra solo la marca', () => {
    expect(tituloDeRuta('/otra')).toBe('AquaChile');
  });
});
