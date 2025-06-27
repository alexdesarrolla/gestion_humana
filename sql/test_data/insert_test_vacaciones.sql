-- Insertar datos de prueba para solicitudes de vacaciones
-- Nota: Estos UUIDs deben corresponder a usuarios reales en la tabla usuario_nomina

-- Vacaciones activas (usuario actualmente de vacaciones)
INSERT INTO solicitudes_vacaciones (
  id,
  usuario_id,
  estado,
  fecha_inicio,
  fecha_fin,
  fecha_solicitud,
  fecha_resolucion
) VALUES (
  gen_random_uuid(),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'usuario' LIMIT 1),
  'aprobado',
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '5 days',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '8 days'
);

-- Vacaciones ya tomadas este año
INSERT INTO solicitudes_vacaciones (
  id,
  usuario_id,
  estado,
  fecha_inicio,
  fecha_fin,
  fecha_solicitud,
  fecha_resolucion
) VALUES (
  gen_random_uuid(),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'usuario' OFFSET 1 LIMIT 1),
  'aprobado',
  '2024-06-01',
  '2024-06-15',
  '2024-05-15 10:00:00',
  '2024-05-16 14:30:00'
);

-- Vacaciones pendientes (futuras)
INSERT INTO solicitudes_vacaciones (
  id,
  usuario_id,
  estado,
  fecha_inicio,
  fecha_fin,
  fecha_solicitud,
  fecha_resolucion
) VALUES (
  gen_random_uuid(),
  (SELECT auth_user_id FROM usuario_nomina WHERE rol = 'usuario' OFFSET 2 LIMIT 1),
  'aprobado',
  CURRENT_DATE + INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '44 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '3 days'
);

-- Verificar los datos insertados
SELECT 
  sv.id,
  un.colaborador,
  sv.estado,
  sv.fecha_inicio,
  sv.fecha_fin,
  sv.fecha_solicitud
FROM solicitudes_vacaciones sv
JOIN usuario_nomina un ON sv.usuario_id = un.auth_user_id
WHERE sv.estado = 'aprobado'
ORDER BY sv.fecha_inicio DESC;