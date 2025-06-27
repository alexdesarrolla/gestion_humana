-- Script para crear la tabla usuario_permisos en Supabase SQL Editor
-- Ejecutar este script MANUALMENTE en el SQL Editor de Supabase

-- 1. Crear tabla usuario_permisos
CREATE TABLE IF NOT EXISTS usuario_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuario_nomina(id) ON DELETE CASCADE,
  modulo_id UUID,
  puede_ver BOOLEAN DEFAULT false,
  puede_crear BOOLEAN DEFAULT false,
  puede_editar BOOLEAN DEFAULT false,
  puede_eliminar BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_usuario_permisos_usuario_id ON usuario_permisos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_permisos_modulo_id ON usuario_permisos(modulo_id);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE usuario_permisos ENABLE ROW LEVEL SECURITY;

-- 4. Crear política básica de RLS
CREATE POLICY "Usuarios pueden ver sus propios permisos" ON usuario_permisos
  FOR SELECT USING (auth.uid() = usuario_id);

-- 5. Verificar que la tabla se creó correctamente
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'usuario_permisos' 
ORDER BY ordinal_position;

-- 6. Mensaje de confirmación
SELECT 'Tabla usuario_permisos creada exitosamente' as mensaje;