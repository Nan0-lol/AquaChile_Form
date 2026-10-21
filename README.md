# AquaChile - Sistema Integral de Reclutamiento y Selección (MVP)

## Descripción del Proyecto

Este proyecto consiste en un Producto Mínimo Viable (MVP) desarrollado para digitalizar, centralizar y optimizar el proceso de reclutamiento de personal para AquaChile. El sistema abarca el ciclo completo de selección, desde la recepción de postulaciones externas hasta la gestión, seguimiento y evaluación interna de los candidatos por parte del equipo de recursos humanos.

## Arquitectura del Sistema

El proyecto está diseñado bajo una arquitectura cliente-servidor, estructurada en las siguientes capas tecnológicas:

*   **Frontend (Interfaz de Usuario):** Desarrollado con React (entorno Vite) y CSS3. Proporciona una experiencia de usuario fluida para los postulantes y una visualización clara para los administradores.
*   **Backend (Lógica de Negocio):** API RESTful desarrollada en Java utilizando el framework Spring Boot (en fase de desarrollo e integración).
*   **Base de Datos:** Implementada en MySQL para la persistencia relacional y segura de los datos corporativos.

## Módulos Principales del Sistema

1.  **Módulo de Postulación Externa:** Interfaz orientada a la captura de datos del aspirante (datos de contacto, cargo al que postula) y carga segura de Curriculum Vitae con validación de peso de archivos.
2.  **Gestión de Usuarios y Roles:** Administración de perfiles internos del sistema (Analistas y Evaluadores) encargados de procesar las postulaciones.
3.  **Seguimiento de Solicitudes:** Control del flujo y estado de cada postulación (Pendiente, En Proceso, Finalizada).
4.  **Registro de Evaluaciones:** Almacenamiento estructurado de los resultados y observaciones de las entrevistas psicolaborales y técnicas vinculadas a cada solicitud.

## Estructura del Repositorio

El repositorio está organizado para separar claramente las capas de la aplicación:

*   `/AquaChile_Form` (Frontend): Contiene el código fuente de la aplicación cliente en React.
*   `/database`: Aloja los scripts de modelado SQL y diagramas de la base de datos relacional.
*   `/backend` (Próximamente): Contendrá el código fuente de la aplicación Spring Boot.

## Instrucciones de Despliegue Local (Entorno Frontend)

Para inicializar la vista de usuario en un entorno de desarrollo local, siga estos pasos:

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
