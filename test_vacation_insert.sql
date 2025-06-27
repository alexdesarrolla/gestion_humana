-- Insertar solicitudes de vacaciones de prueba
-- Usando UUIDs de ejemplo que se deben reemplazar con los reales

-- Primero verificar los auth_user_id existentes:
-- SELECT colaborador, auth_user_id FROM usuario_nomina WHERE rol = 'usuario' LIMIT 5;

-- Insertar vacaciones de prueba (REEMPLAZAR LOS UUIDs CON LOS REALES)
INSERT INTO solicitudes_vacaciones (usuario_id, fecha_inicio, fecha_fin, estado, fecha_solicitud)
VALUES 
-- Vacaciones activas (en curso) - para el primer usuario
('00000000-0000-0000-0000-000000000001', '2024-12-15', '2024-12-25', 'aprobado', '2024-12-01'),
-- Vacaciones futuras - para el primer usuario
('00000000-0000-0000-0000-000000000001', '2025-01-15', '2025-01-25', 'aprobado', '2024-12-01'),
-- Vacaciones pasadas - para el primer usuario
('00000000-0000-0000-0000-000000000001', '2024-11-01', '2024-11-10', 'aprobado', '2024-10-15'),
-- Vacaciones pendientes - para el segundo usuario
('00000000-0000-0000-0000-000000000002', '2025-02-01', '2025-02-10', 'pendiente', '2024-12-16'),
-- Vacaciones rechazadas - para el segundo usuario
('00000000-0000-0000-0000-000000000002', '2024-12-20', '2024-12-30', 'rechazado', '2024-12-10');

-- IMPORTANTE: Reemplazar los UUIDs de ejemplo con los auth_user_id reales obtenidos de la consulta anterior