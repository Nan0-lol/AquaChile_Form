-- 1. Crear la base de datos
CREATE DATABASE IF NOT EXISTS aquachile_mvp;
USE aquachile_mvp;

-- 2. Tabla de Usuarios (Roles simulados)
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    rol ENUM('Analista', 'Evaluador') NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Candidatos (Conectada a tu formulario en React)
CREATE TABLE candidatos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    correo VARCHAR(100) NOT NULL, -- Añadido como exigía el anexo de requerimientos
    celular VARCHAR(20) NOT NULL,
    familia_cargo VARCHAR(100) NOT NULL,
    nombre_cargo VARCHAR(100) NOT NULL,
    ruta_cv VARCHAR(255), -- Aquí guardarás la ruta del archivo tras subirlo
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices estratégicos para acelerar búsquedas y filtros en el frontend
    INDEX idx_familia_cargo (familia_cargo),
    INDEX idx_nombre_completo (nombre_completo)
);

-- 4. Tabla de Solicitudes de Evaluación (El puente central del proceso)
CREATE TABLE solicitudes_evaluacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidato_id INT NOT NULL,
    analista_id INT NOT NULL, -- Quien origina la solicitud
    evaluador_id INT, -- Psicólogo/a responsable (se puede asignar después)
    estado ENUM('Pendiente', 'En proceso', 'Finalizada') DEFAULT 'Pendiente',
    observaciones_iniciales TEXT,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
    FOREIGN KEY (analista_id) REFERENCES usuarios(id),
    FOREIGN KEY (evaluador_id) REFERENCES usuarios(id),
    
    -- Índice clave: evitará dolores de cabeza al listar solicitudes "Pendientes"
    INDEX idx_estado_solicitud (estado)
);

-- 5. Tabla de Evaluaciones (Resultados de la entrevista psicolaboral)
CREATE TABLE evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL UNIQUE, -- Relación 1 a 1: Una evaluación por solicitud
    fecha_evaluacion DATE,
    resultado_observaciones TEXT,
    estado_evaluacion VARCHAR(50),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_evaluacion(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- INSERCIÓN DE DATOS SIMULADOS (Para que puedas probar la API)
-- --------------------------------------------------------

INSERT INTO usuarios (nombre, rol, correo) VALUES 
('Camila Muñoz', 'Analista', 'cmunoz.ficticio@aquachile.com'),
('María Victoria', 'Evaluador', 'mvictoria.ficticia@aquachile.com');

INSERT INTO candidatos (nombre_completo, correo, celular, familia_cargo, nombre_cargo) VALUES 
('Juan Pérez', 'juan.perez@email.com', '+56 9 1234 5678', 'tecnologia', 'Desarrollador Frontend Senior'),
('Marcos Fonseca', 'm.fonseca@email.com', '+56 9 8765 4321', 'operaciones', 'Operador de máquina');