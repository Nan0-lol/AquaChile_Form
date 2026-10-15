# AquaChile - Sistema de Postulación (MVP)

Aplicación desarrollada como Producto Mínimo Viable (MVP) para digitalizar y gestionar el proceso de reclutamiento de candidatos para AquaChile. El proyecto se enfoca en ofrecer una interfaz de usuario intuitiva y corporativa, estructurada para una próxima integración con una arquitectura backend transaccional.

## Descripción del Proyecto

El sistema permite a los aspirantes ingresar sus datos personales y profesionales de manera segura, e incluye la funcionalidad de adjuntar su Curriculum Vitae con validaciones de peso de archivo en el lado del cliente, garantizando la integridad inicial de los datos antes de su envío al servidor.

## Tecnologías Utilizadas

**Frontend:**
* React (Entorno de desarrollo Vite)
* JavaScript (JSX)
* CSS3 (Diseño de interfaz basado en Glassmorphism)

**Backend y Base de Datos (En desarrollo):**
* Java (Spring Boot)
* Relacional: MySQL

## Características Principales

* **Interfaz de Usuario (UI):** Diseño limpio y corporativo utilizando técnicas avanzadas de CSS (backdrop-filter) para un efecto de desenfoque, optimizado mediante el consumo de recursos estáticos locales.
* **Validación de Formularios:** Captura estricta de datos obligatorios (Nombre, Teléfono, Familia de Cargo y Cargo) y validación de tamaño de archivos adjuntos (límite máximo de 5MB por documento).
* **Gestión de Estados:** Manejo asíncrono y controlado de los campos del formulario mediante los hooks nativos de React, asegurando la limpieza de los datos tras un envío exitoso.

## Instrucciones de Despliegue Local (Frontend)

Para inicializar el entorno de desarrollo en una máquina local, ejecute los siguientes comandos en su terminal:

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/AquaChile_Form.git](https://github.com/tu-usuario/AquaChile_Form.git)
