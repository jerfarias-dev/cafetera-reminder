-- Script de migración para Supabase (PostgreSQL)
-- Ejecutar en el SQL Editor de Supabase

-- Eliminar tablas si existen (para recrear)
DROP TABLE IF EXISTS turnos CASCADE;
DROP TABLE IF EXISTS dias CASCADE;
DROP TABLE IF EXISTS personas CASCADE;

-- Crear tabla personas (SIN campo numero)
CREATE TABLE personas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telegram_chat_id VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para personas
CREATE INDEX idx_personas_nombre ON personas(nombre);
CREATE INDEX idx_personas_activo ON personas(activo);
CREATE INDEX idx_personas_telegram ON personas(telegram_chat_id);

-- Crear tipo ENUM para tipo_dia
CREATE TYPE tipo_dia_enum AS ENUM ('laboral', 'asueto', 'fin_semana');

-- Crear tabla dias
CREATE TABLE dias (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    tipo_dia tipo_dia_enum NOT NULL,
    descripcion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para dias
CREATE INDEX idx_dias_fecha ON dias(fecha);
CREATE INDEX idx_dias_tipo ON dias(tipo_dia);
CREATE INDEX idx_dias_fecha_tipo ON dias(fecha, tipo_dia);

-- Crear tabla turnos
CREATE TABLE turnos (
    id SERIAL PRIMARY KEY,
    dia_id INTEGER NOT NULL REFERENCES dias(id) ON DELETE CASCADE,
    persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    enviado BOOLEAN DEFAULT FALSE,
    fecha_envio TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint único para evitar duplicados por día
    UNIQUE(dia_id)
);

-- Crear índices para turnos
CREATE INDEX idx_turnos_dia_id ON turnos(dia_id);
CREATE INDEX idx_turnos_persona_id ON turnos(persona_id);
CREATE INDEX idx_turnos_enviado ON turnos(enviado);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON personas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dias_updated_at BEFORE UPDATE ON dias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_turnos_updated_at BEFORE UPDATE ON turnos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS) - Opcional para Supabase
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dias ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;

-- Crear políticas básicas (puedes ajustarlas según tus necesidades)
-- Por ahora, permitir todo para el servicio
CREATE POLICY "Allow all operations" ON personas FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON dias FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON turnos FOR ALL USING (true);

-- Insertar algunos datos de ejemplo (opcional)
-- Puedes comentar esta sección si no quieres datos de prueba

/*
-- Datos de ejemplo
INSERT INTO personas (nombre, telegram_chat_id, activo) VALUES
('Juan Pérez', '123456789', true),
('María García', '987654321', true),
('Carlos López', NULL, true);

-- Días de ejemplo
INSERT INTO dias (fecha, tipo_dia, descripcion) VALUES
('2025-09-26', 'laboral', NULL),
('2025-09-27', 'laboral', NULL),
('2025-09-28', 'fin_semana', 'Sábado'),
('2025-12-25', 'asueto', 'Navidad');

-- Turnos de ejemplo
INSERT INTO turnos (dia_id, persona_id, enviado) VALUES
(1, 1, false),
(2, 2, false);
*/

-- Verificar la estructura creada
SELECT 'Tablas creadas exitosamente en Supabase!' as mensaje;

-- Mostrar información de las tablas
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('personas', 'dias', 'turnos')
ORDER BY table_name, ordinal_position;