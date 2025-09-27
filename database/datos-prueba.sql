-- Datos de prueba para testing
-- Ejecutar DESPUÉS del script supabase-init.sql

-- Insertar personas de ejemplo
INSERT INTO personas (nombre, telegram_chat_id, activo) VALUES
('Juan Pérez', '123456789', true),
('María García', '987654321', true),
('Carlos López', '111222333', true);

-- Insertar días (incluyendo fechas actuales para testing)
INSERT INTO dias (fecha, tipo_dia, descripcion) VALUES
-- Fechas actuales para testing
('2025-09-26', 'laboral', NULL),
('2025-09-27', 'laboral', NULL),
('2025-09-28', 'fin_semana', 'Sábado'),
('2025-09-29', 'fin_semana', 'Domingo'),
('2025-09-30', 'laboral', NULL),
('2025-10-01', 'laboral', NULL),
('2025-10-02', 'laboral', NULL),
-- Días especiales
('2025-12-25', 'asueto', 'Navidad'),
('2025-01-01', 'asueto', 'Año Nuevo');

-- Insertar turnos para las fechas laborales
INSERT INTO turnos (dia_id, persona_id, enviado) VALUES
-- Obtener los IDs de los días laborales y asignar personas
((SELECT id FROM dias WHERE fecha = '2025-09-26'), 1, false),
((SELECT id FROM dias WHERE fecha = '2025-09-27'), 2, false),
((SELECT id FROM dias WHERE fecha = '2025-09-30'), 3, false),
((SELECT id FROM dias WHERE fecha = '2025-10-01'), 1, false),
((SELECT id FROM dias WHERE fecha = '2025-10-02'), 2, false);

-- Verificar los datos insertados
SELECT 'Datos de prueba insertados correctamente!' as mensaje;

-- Mostrar resumen de datos
SELECT 'PERSONAS:' as tabla;
SELECT id, nombre, telegram_chat_id, activo FROM personas;

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