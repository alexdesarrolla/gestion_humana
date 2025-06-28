const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function insertTestData() {
  try {
    // Obtener un usuario existente
    const { data: usuarios, error: userError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador')
      .not('auth_user_id', 'is', null)
      .limit(1)
    
    if (userError) {
      console.error('Error al obtener usuario:', userError)
      return
    }
    
    console.log('Usuarios encontrados:', usuarios)
    
    if (!usuarios || usuarios.length === 0) {
      console.error('No hay usuarios con auth_user_id válido en la base de datos')
      return
    }
    
    // Insertar solicitud de prueba
    const { data, error } = await supabase
      .from('solicitudes_certificacion')
      .insert({
        usuario_id: usuarios[0].auth_user_id,
        dirigido_a: 'Empresa de Prueba',
        ciudad: 'Bogotá',
        fecha_solicitud: new Date().toISOString(),
        estado: 'pendiente'
      })
      .select()
    
    if (error) {
      console.error('Error al insertar solicitud:', error)
    } else {
      console.log('Solicitud de prueba insertada exitosamente:', data)
    }
  } catch (err) {
    console.error('Error general:', err)
  }
}

insertTestData()