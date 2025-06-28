-- Insertar solicitud de certificación de prueba
INSERT INTO solicitudes_certificacion (
  usuario_id,
  dirigido_a,
  ciudad,
  fecha_solicitud,
  estado
) VALUES (
  (SELECT auth_user_id FROM usuario_nomina LIMIT 1),
  'Empresa de Prueba',
  'Bogotá',
  NOW(),
  'pendiente'
);