'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FaBuilding, FaUsers, FaChartPie, FaUser } from 'react-icons/fa'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

interface EmpresaStats {
  id: number
  nombre: string
  usuarios_activos: number
  usuarios_totales: number
  porcentaje: number
}

interface GeneroStats {
  genero: string
  cantidad: number
  porcentaje: number
}

interface SedeStats {
  id: number
  nombre: string
  cantidad: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

export default function EstadisticasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [empresasStats, setEmpresasStats] = useState<EmpresaStats[]>([])
  const [generoStats, setGeneroStats] = useState<GeneroStats[]>([])
  const [sedesStats, setSedesStats] = useState<SedeStats[]>([])
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [totalEmpresas, setTotalEmpresas] = useState(0)

  useEffect(() => {
    const loadEstadisticas = async () => {
      const supabase = createSupabaseClient()
      
      try {
        // Obtener estadísticas por empresa
        const { data: empresas } = await supabase
          .from('empresas')
          .select('id, nombre')
        
        if (empresas) {
          const empresasConStats: EmpresaStats[] = []
          let totalUsuariosGlobal = 0
          
          for (const empresa of empresas) {
            // Contar usuarios totales por empresa
            const { data: usuariosTotales } = await supabase
              .from('usuario_nomina')
              .select('auth_user_id')
              .eq('empresa_id', empresa.id)
              .eq('rol', 'usuario')
            
            // Contar usuarios activos por empresa
            const { data: usuariosActivos } = await supabase
              .from('usuario_nomina')
              .select('auth_user_id')
              .eq('empresa_id', empresa.id)
              .eq('rol', 'usuario')
              .eq('estado', 'activo')
            
            const totalEmpresa = usuariosTotales?.length || 0
            const activosEmpresa = usuariosActivos?.length || 0
            totalUsuariosGlobal += totalEmpresa
            
            empresasConStats.push({
              id: empresa.id,
              nombre: empresa.nombre,
              usuarios_activos: activosEmpresa,
              usuarios_totales: totalEmpresa,
              porcentaje: 0 // Se calculará después
            })
          }
          
          // Calcular porcentajes y ordenar por cantidad de usuarios activos (mayor a menor)
          const empresasConPorcentajes = empresasConStats
            .map(empresa => ({
              ...empresa,
              porcentaje: totalUsuariosGlobal > 0 ? Math.round((empresa.usuarios_totales / totalUsuariosGlobal) * 100) : 0
            }))
            .sort((a, b) => b.usuarios_activos - a.usuarios_activos)
          
          setEmpresasStats(empresasConPorcentajes)
          setTotalUsuarios(totalUsuariosGlobal)
          setTotalEmpresas(empresas.length)
        }
        
        // Obtener estadísticas por género (solo usuarios activos)
        const { data: usuariosMujeres } = await supabase
          .from('usuario_nomina')
          .select('auth_user_id')
          .eq('rol', 'usuario')
          .eq('genero', 'F')
          .eq('estado', 'activo')
        
        const { data: usuariosHombres } = await supabase
          .from('usuario_nomina')
          .select('auth_user_id')
          .eq('rol', 'usuario')
          .eq('genero', 'M')
          .eq('estado', 'activo')
        
        const mujeres = usuariosMujeres?.length || 0
        const hombres = usuariosHombres?.length || 0
        const totalGenero = mujeres + hombres
        

        const generoData: GeneroStats[] = [
          {
            genero: 'Mujeres',
            cantidad: mujeres,
            porcentaje: totalGenero > 0 ? Math.round((mujeres / totalGenero) * 100) : 0
          },
          {
            genero: 'Hombres',
            cantidad: hombres,
            porcentaje: totalGenero > 0 ? Math.round((hombres / totalGenero) * 100) : 0
          }
        ]
        
        console.log('Datos de género:', generoData)
        setGeneroStats(generoData)
        
        // Obtener estadísticas por sedes
        const { data: sedes } = await supabase
          .from('sedes')
          .select('id, nombre')
        
        if (sedes) {
          const sedesConStats: SedeStats[] = []
          
          for (const sede of sedes) {
            const { data: usuariosSede } = await supabase
              .from('usuario_nomina')
              .select('auth_user_id')
              .eq('sede_id', sede.id)
              .eq('rol', 'usuario')
            
            sedesConStats.push({
              id: sede.id,
              nombre: sede.nombre,
              cantidad: usuariosSede?.length || 0
            })
          }
          
          setSedesStats(sedesConStats)
        }
        
      } catch (error) {
        console.error('Error al cargar estadísticas:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadEstadisticas()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
          <p className="text-gray-600">Análisis de datos del sistema</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <p className="text-gray-600">Análisis de datos del sistema</p>
      </div>
      
      {/* Resumen general */}

      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Gráfico de empresas - Tabla y Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaBuilding className="h-5 w-5" />
              Distribución por Empresas
            </CardTitle>
            <CardDescription>
              Cantidad de usuarios activos y porcentaje por empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 h-80">
              {/* Tabla a la izquierda */}
              <div className="w-1/2">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h3 className="font-semibold text-sm text-gray-700">Empresas y Usuarios</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {empresasStats.map((empresa, index) => (
                          <tr key={empresa.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                ></div>
                                <span className="font-medium">{empresa.nombre}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-semibold">{empresa.usuarios_activos}</span>
                                <FaUser className="text-gray-500" style={{ fontSize: '10px' }} />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-medium">{empresa.porcentaje}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Gráfica a la derecha */}
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={empresasStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="usuarios_activos"
                      nameKey="nombre"
                    >
                      {empresasStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any, props: any) => [
                      `${value} usuarios activos (${props.payload.porcentaje}%)`,
                      props.payload.nombre
                    ]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 2. Gráfico de género - Barras horizontales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaUsers className="h-5 w-5" />
              Distribución por Género
            </CardTitle>
            <CardDescription>
              Cantidad de usuarios activos por género con porcentajes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {generoStats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No hay datos de género disponibles</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart 
                     data={generoStats} 
                     margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                   >
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis 
                       dataKey="genero" 
                       tick={{ fontSize: 12 }}
                       angle={-45}
                       textAnchor="end"
                       height={30}
                     />
                     <YAxis 
                       domain={[0, 'dataMax + 10']}
                       tickFormatter={(value) => value.toString()}
                     />
                     <Tooltip formatter={(value: any, name: any, props: any) => [
                       `${value} personas (${props.payload.porcentaje}%)`,
                       props.payload.genero
                     ]} />
                     <Bar 
                       dataKey="cantidad" 
                       radius={[4, 4, 0, 0]}
                     >
                       {generoStats.map((entry, index) => (
                         <Cell 
                           key={`cell-${index}`} 
                           fill={entry.genero === 'Mujeres' ? '#ec4899' : '#8b5cf6'} 
                         />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* 3. Gráfico de sedes - Barras verticales */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaBuilding className="h-5 w-5" />
              Colaboradores por Sedes
            </CardTitle>
            <CardDescription>
              Cantidad de usuarios en cada sede
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sedesStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="nombre" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip formatter={(value: any, name: any, props: any) => [
                    `${value} colaboradores`,
                    props.payload.nombre
                  ]} />
                  <Bar dataKey="cantidad" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}