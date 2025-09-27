-- Script mejorado con tabla de días para manejar calendario
-- Ejecutar como root: mysql -u root -p < database/init.sql

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS cafetera_reminder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE cafetera_reminder;

-- Eliminar tablas si existen (para recrear)
DROP TABLE IF EXISTS turnos;
DROP TABLE IF EXISTS dias;
DROP TABLE IF EXISTS personas;

-- Crear tabla personas
CREATE TABLE personas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    numero VARCHAR(20) NULL,
    telegram_chat_id VARCHAR(50) NULL COMMENT 'Chat ID de Telegram para mensajes directos',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_personas_nombre (nombre),
    INDEX idx_personas_activo (activo),
    INDEX idx_personas_telegram (telegram_chat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla dias (para manejar calendario)
CREATE TABLE dias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo_dia ENUM('laboral', 'asueto', 'fin_semana') NOT NULL,
    descripcion VARCHAR(255) NULL COMMENT 'Descripción del día especial (ej: Navidad, Año Nuevo)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    UNIQUE KEY uk_dias_fecha (fecha),
    INDEX idx_dias_tipo (tipo_dia),
    INDEX idx_dias_fecha_tipo (fecha, tipo_dia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla turnos (ahora relacionada con dias)
CREATE TABLE turnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dia_id INT NOT NULL,
    persona_id INT NOT NULL,
    enviado BOOLEAN DEFAULT FALSE,
    fecha_envio TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Claves foráneas
    CONSTRAINT fk_turnos_dia FOREIGN KEY (dia_id) REFERENCES dias(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_turnos_persona FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    -- Índices
    INDEX idx_turnos_dia_id (dia_id),
    INDEX idx_turnos_persona_id (persona_id),
    INDEX idx_turnos_enviado (enviado),
    
    -- Restricción única para evitar duplicados por día
    UNIQUE KEY uk_turnos_dia (dia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mostrar estructura y datos insertados
SELECT 'ESTRUCTURA DE TABLAS:' as info;
DESCRIBE personas;
DESCRIBE dias;
DESCRIBE turnos;

SELECT '' as separador;
SELECT 'DATOS INSERTADOS:' as info;

SELECT 'PERSONAS:' as tabla;
SELECT id, nombre, numero, telegram_chat_id, activo FROM personas;

SELECT 'DÍAS:' as tabla;
SELECT id, fecha, tipo_dia, descripcion FROM dias ORDER BY fecha;

SELECT 'TURNOS:' as tabla;
SELECT 
    t.id,
    d.fecha,
    p.nombre as persona,
    d.tipo_dia,
    t.enviado,
    t.fecha_envio
FROM turnos t
INNER JOIN dias d ON t.dia_id = d.id
INNER JOIN personas p ON t.persona_id = p.id
ORDER BY d.fecha;

SELECT 'Base de datos poblada exitosamente!' as mensaje;