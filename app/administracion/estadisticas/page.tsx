'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FaBuilding, FaUsers, FaBriefcase, FaMapMarkerAlt, FaUser, FaSearch, FaHeartbeat, FaShieldAlt, FaHandHoldingUsd, FaChartLine } from 'react-icons/fa'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts'

interface Empresa {
  id: string
  nombre: string
}

interface Sede {
  id: string
  nombre: string
}

interface Cargo {
  id: string
  nombre: string
}

interface EmpresaStats {
  id: string
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
  id: string
  nombre: string
  cantidad: number
}

interface CargoStats {
  id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

interface EpsStats {
  id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

interface AfpStats {
  id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

interface CesantiasStats {
  id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

interface CajaCompensacionStats {
  id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

interface RetiroStats {
  motivo: string
  cantidad: number
  fecha: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

export default function EstadisticasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [empresasStats, setEmpresasStats] = useState<EmpresaStats[]>([])
  const [generoStats, setGeneroStats] = useState<GeneroStats[]>([])
  const [sedesStats, setSedesStats] = useState<SedeStats[]>([])
  const [cargosStats, setCargosStats] = useState<CargoStats[]>([])  
  const [searchCargo, setSearchCargo] = useState('')
  
  // Nuevos estados para HR
  const [epsStats, setEpsStats] = useState<EpsStats[]>([])
  const [afpStats, setAfpStats] = useState<AfpStats[]>([])
  const [cesantiasStats, setCesantiasStats] = useState<CesantiasStats[]>([])
  const [cajaCompensacionStats, setCajaCompensacionStats] = useState<CajaCompensacionStats[]>([])
  
  // Estado para retiros
  const [retirosStats, setRetirosStats] = useState<RetiroStats[]>([])
  
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [totalEmpresas, setTotalEmpresas] = useState(0)

  // Filtrar cargos basandose en el termino de busqueda
  const filteredCargosStats = cargosStats.filter(cargo =>
    cargo.nombre.toLowerCase().includes(searchCargo.toLowerCase())
  )

  useEffect(() => {
    const loadEstadisticas = async () => {
      const supabase = createSupabaseClient()
      
      try {
        // Obtener estadisticas por empresa
        const { data: empresas } = await supabase
          .from('empresas')
          .select('id, nombre') as { data: Empresa[] | null }
        
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
              porcentaje: 0 // Se calculara despues
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
        
        // Obtener estadisticas por genero (solo usuarios activos)
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
        
        console.log('Datos de genero:', generoData)
        setGeneroStats(generoData)
        
        // Obtener estadisticas por sedes
        const { data: sedes } = await supabase
          .from('sedes')
          .select('id, nombre') as { data: Sede[] | null }
        
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
        
        // Obtener estadisticas por cargos
        const { data: cargos } = await supabase
          .from('cargos')
          .select('id, nombre') as { data: Cargo[] | null }
        
        if (cargos) {
          const cargosConStats: CargoStats[] = []
          let totalUsuariosCargos = 0
          
          for (const cargo of cargos) {
            const { data: usuariosCargo } = await supabase
              .from('usuario_nomina')
              .select('auth_user_id')
              .eq('cargo_id', cargo.id)
              .eq('rol', 'usuario')
              .eq('estado', 'activo')
            
            const cantidadCargo = usuariosCargo?.length || 0
            totalUsuariosCargos += cantidadCargo
            
            cargosConStats.push({
              id: cargo.id,
              nombre: cargo.nombre,
              cantidad: cantidadCargo,
              porcentaje: 0 // Se calculara despues
            })
          }
          
          // Calcular porcentajes y ordenar por cantidad (mayor a menor)
          const cargosConPorcentajes = cargosConStats
            .map(cargo => ({
              ...cargo,
              porcentaje: totalUsuariosCargos > 0 ? Math.round((cargo.cantidad / totalUsuariosCargos) * 100) : 0
            }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .filter(cargo => cargo.cantidad > 0) // Solo mostrar cargos con usuarios
          
          setCargosStats(cargosConPorcentajes)
        }
        
        // Obtener estadisticas de EPS
        const { data: eps } = await supabase
          .from('eps')
          .select('id, nombre') as { data: any[] | null }
        
        if (eps) {
          const epsConStats: EpsStats[] = []
          let totalUsuariosEps = 0
          
          for (const epsItem of eps) {
            const { data: usuariosEps } = await supabase
              .from('usuario_nomina')
              .select('auth_user_id')
              .eq('eps_id', epsItem.id)
              .eq('rol', 'usuario')
              .eq('estado', 'activo')
            
            const cantidadEps = usuariosEps?.length || 0
            totalUsuariosEps += cantidadEps
            
            epsConStats.push({
              id: epsItem.id,
              nombre: epsItem.nombre,
              cantidad: cantidadEps,
              porcentaje: 0
            })
          }
          
          const epsConPorcentajes = epsConStats
            .map(eps => ({
              ...eps,
              porcentaje: totalUsuariosEps > 0 ? Math.round((eps.cantidad / totalUsuariosEps) * 100) : 0
            }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .filter(eps => eps.cantidad > 0)
          
          setEpsStats(epsConPorcentajes)
        }
        
        // Obtener estadisticas de AFP
        const { data: afp } = await supabase
          .from('afp')
          .select('id, nombre') as { data: any[] | null }
        
        if (afp) {
          const afpConStats: AfpStats[] = []
          let totalUsuariosAfp = 0
          
          for (const afpItem of afp) {
            const { data: usuariosAfp } = await supabase
              .from('usuario_nomina')
              .select('auth_user_id')
              .eq('afp_id', afpItem.id)
              .eq('rol', 'usuario')
              .eq('estado', 'activo')
            
            const cantidadAfp = usuariosAfp?.length || 0
            totalUsuariosAfp += cantidadAfp
            
            afpConStats.push({
              id: afpItem.id,
              nombre: afpItem.nombre,
              cantidad: cantidadAfp,
              porcentaje: 0
            })
          }
          
          const afpConPorcentajes = afpConStats
            .map(afp => ({
              ...afp,
              porcentaje: totalUsuariosAfp > 0 ? Math.round((afp.cantidad / totalUsuariosAfp) * 100) : 0
            }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .filter(afp => afp.cantidad > 0)
          
          setAfpStats(afpConPorcentajes)
        }
        
        // Obtener estadisticas de Cesantias
        const { data: cesantias } = await supabase
          .from('cesantias')
          .select('id, nombre') as { data: any[] | null }
        
        if (cesantias) {
          const cesantiasConStats: CesantiasStats[] = []
          let totalUsuariosCesantias = 0
          
          for (const cesantiasItem of cesantias) {
            const { data: usuariosCesantias } = await supabase
              .from('usuario_nomina')
              .select('auth_user_id')
              .eq('cesantias_id', cesantiasItem.id)
              .eq('rol', 'usuario')
              .eq('estado', 'activo')
            
            const cantidadCesantias = usuariosCesantias?.length || 0
            totalUsuariosCesantias += cantidadCesantias
            
            cesantiasConStats.push({
              id: cesantiasItem.id,
              nombre: cesantiasItem.nombre,
              cantidad: cantidadCesantias,
              porcentaje: 0
            })
          }
          
          const cesantiasConPorcentajes = cesantiasConStats
            .map(cesantias => ({
              ...cesantias,
              porcentaje: totalUsuariosCesantias > 0 ? Math.round((cesantias.cantidad / totalUsuariosCesantias) * 100) : 0
            }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .filter(cesantias => cesantias.cantidad > 0)
          
          setCesantiasStats(cesantiasConPorcentajes)
        }
        
        // Obtener estadisticas de Caja de Compensacion
        const { data: cajaCompensacion } = await supabase
          .from('caja_de_compensacion')
          .select('id, nombre') as { data: any[] | null }
        
        if (cajaCompensacion) {
          const cajaCompensacionConStats: CajaCompensacionStats[] = []
          let totalUsuariosCajaCompensacion = 0
          
          for (const cajaItem of cajaCompensacion) {
            const { data: usuariosCaja } = await supabase
              .from('usuario_nomina')
              .select('auth_user_id')
              .eq('caja_de_compensacion_id', cajaItem.id)
              .eq('rol', 'usuario')
              .eq('estado', 'activo')
            
            const cantidadCaja = usuariosCaja?.length || 0
            totalUsuariosCajaCompensacion += cantidadCaja
            
            cajaCompensacionConStats.push({
              id: cajaItem.id,
              nombre: cajaItem.nombre,
              cantidad: cantidadCaja,
              porcentaje: 0
            })
          }
          
          const cajaCompensacionConPorcentajes = cajaCompensacionConStats
            .map(caja => ({
              ...caja,
              porcentaje: totalUsuariosCajaCompensacion > 0 ? Math.round((caja.cantidad / totalUsuariosCajaCompensacion) * 100) : 0
            }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .filter(caja => caja.cantidad > 0)
          
          setCajaCompensacionStats(cajaCompensacionConPorcentajes)
        }
        
        // Obtener estadisticas de retiros
        const { data: retiros } = await supabase
          .from('usuario_nomina')
          .select('motivo_retiro, fecha_retiro')
          .eq('estado', 'inactivo')
          .not('motivo_retiro', 'is', null)
          .not('fecha_retiro', 'is', null)
        
        if (retiros && retiros.length > 0) {
          const retirosGrouped = retiros.reduce((acc: any, retiro: any) => {
            const motivo = retiro.motivo_retiro
            if (!acc[motivo]) {
              acc[motivo] = {
                cantidad: 0,
                fechas: []
              }
            }
            acc[motivo].cantidad += 1
            acc[motivo].fechas.push(retiro.fecha_retiro)
            return acc
          }, {})
          
          const retirosArray = Object.keys(retirosGrouped)
            .map(motivo => ({
              motivo,
              cantidad: retirosGrouped[motivo].cantidad,
              fecha: retirosGrouped[motivo].fechas[retirosGrouped[motivo].fechas.length - 1] // Ultima fecha de retiro para ese motivo
            }))
            .sort((a: any, b: any) => b.cantidad - a.cantidad)
          
          setRetirosStats(retirosArray)
        }
        
      } catch (error) {
        console.error('Error al cargar estadisticas:', error)
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
          <h1 className="text-2xl font-bold text-gray-900">Estadisticas</h1>
          <p className="text-gray-600">Cargando datos...</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Estadisticas</h1>
        <p className="text-gray-600">Analisis de datos del sistema</p>
      </div>
      
      {/* Fila 1: Distribucion por Empresas y Distribucion por Genero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 1. Grafico de empresas - Tabla y Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaBuilding className="h-5 w-5" />
              Distribucion por Empresas
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
              
              {/* Grafica a la derecha */}
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
        
        {/* 2. Grafico de genero - Barras horizontales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaUsers className="h-5 w-5" />
              Distribucion por Genero
            </CardTitle>
            <CardDescription>
              Cantidad de usuarios activos por genero con porcentajes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {generoStats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No hay datos de genero disponibles</p>
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
                       `${value} personas (${props.payload.porcentaje}%)`
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
      </div>
      
      {/* Fila 2: Distribucion por Cargos y Analisis de Retiros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Grafico de cargos - Tabla y Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaBriefcase className="h-5 w-5" />
              Distribucion por Cargos
            </CardTitle>
            <CardDescription>
              Cantidad de usuarios activos y porcentaje por cargo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 h-80">
              {/* Tabla a la izquierda */}
              <div className="w-1/2">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-gray-700">Cargos y Usuarios</h3>
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                        <Input
                          type="text"
                          placeholder="Buscar cargo..."
                          value={searchCargo}
                          onChange={(e) => setSearchCargo(e.target.value)}
                          className="pl-8 h-8 w-40 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {filteredCargosStats.map((cargo, index) => (
                          <tr key={cargo.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                ></div>
                                <span className="font-medium">{cargo.nombre}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-semibold">{cargo.cantidad}</span>
                                <FaUser className="text-gray-500" style={{ fontSize: '10px' }} />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-medium">{cargo.porcentaje}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Grafica a la derecha */}
              <div className="w-1/2">
                {filteredCargosStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">
                      {searchCargo ? 'No se encontraron cargos que coincidan con la busqueda' : 'No hay datos de cargos disponibles'}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredCargosStats.slice(0, 10)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="cantidad"
                        nameKey="nombre"
                      >
                        {filteredCargosStats.slice(0, 10).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios (${props.payload.porcentaje}%)`
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Analisis de Retiros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaChartLine className="h-5 w-5" />
              Analisis de Retiros
            </CardTitle>
            <CardDescription>
              Motivos de retiro y cantidad de casos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {retirosStats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No hay datos de retiros disponibles</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={retirosStats.slice(0, 8)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="motivo" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis 
                      domain={[0, 'dataMax + 2']}
                      tickFormatter={(value) => value.toString()}
                    />
                    <Tooltip 
                      formatter={(value: any) => [
                        `${value} casos`
                      ]}
                    />
                    <Bar 
                      dataKey="cantidad" 
                      fill="#8884d8"
                      radius={[4, 4, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Fila 3: Colaboradores por Sedes - Ancho completo */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaMapMarkerAlt className="h-5 w-5" />
              Colaboradores por Sedes
            </CardTitle>
            <CardDescription>
              Distribucion de usuarios por ubicacion geografica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {sedesStats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No hay datos de sedes disponibles</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={sedesStats} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="nombre" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis 
                      domain={[0, 'dataMax + 10']}
                      tickFormatter={(value) => value.toString()}
                    />
                    <Tooltip formatter={(value: any) => [
                      `${value} usuarios`
                    ]} />
                    <Bar 
                      dataKey="cantidad" 
                      radius={[4, 4, 0, 0]}
                    >
                      {sedesStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Fila 4: Seccion de Recursos Humanos - 4 graficos en fila */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* EPS */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FaHeartbeat className="h-4 w-4 text-red-500" />
                EPS
              </CardTitle>
              <CardDescription className="text-xs">
                Entidades Promotoras de Salud
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {epsStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">Sin datos</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={epsStats.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="cantidad"
                      >
                        {epsStats.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios (${props.payload.porcentaje}%)`
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2">
                <div className="text-center">
                  <span className="text-2xl font-bold text-red-600">
                    {epsStats.reduce((sum, eps) => sum + eps.cantidad, 0)}
                  </span>
                  <p className="text-xs text-gray-500">Total afiliados</p>
                </div>
                {/* Leyenda */}
                {epsStats.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {epsStats.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="truncate" title={item.nombre}>
                            {item.nombre.length > 12 ? `${item.nombre.substring(0, 12)}...` : item.nombre}
                          </span>
                        </div>
                        <span className="font-medium">{item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* AFP */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FaShieldAlt className="h-4 w-4 text-blue-500" />
                AFP
              </CardTitle>
              <CardDescription className="text-xs">
                Administradoras de Fondos de Pensiones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {afpStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">Sin datos</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={afpStats.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="cantidad"
                      >
                        {afpStats.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios (${props.payload.porcentaje}%)`
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2">
                <div className="text-center">
                  <span className="text-2xl font-bold text-green-600">
                    {afpStats.reduce((sum, afp) => sum + afp.cantidad, 0)}
                  </span>
                  <p className="text-xs text-gray-500">Total afiliados</p>
                </div>
                {/* Leyenda */}
                {afpStats.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {afpStats.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="truncate" title={item.nombre}>
                            {item.nombre.length > 12 ? `${item.nombre.substring(0, 12)}...` : item.nombre}
                          </span>
                        </div>
                        <span className="font-medium">{item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Cesantias */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FaShieldAlt className="h-4 w-4 text-purple-500" />
                Cesantias
              </CardTitle>
              <CardDescription className="text-xs">
                Fondos de Cesantias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {cesantiasStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">Sin datos</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cesantiasStats.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="cantidad"
                      >
                        {cesantiasStats.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios (${props.payload.porcentaje}%)`
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2">
                <div className="text-center">
                  <span className="text-2xl font-bold text-purple-600">
                    {cesantiasStats.reduce((sum, cesantias) => sum + cesantias.cantidad, 0)}
                  </span>
                  <p className="text-xs text-gray-500">Total afiliados</p>
                </div>
                {/* Leyenda */}
                {cesantiasStats.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {cesantiasStats.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="truncate" title={item.nombre}>
                            {item.nombre.length > 12 ? `${item.nombre.substring(0, 12)}...` : item.nombre}
                          </span>
                        </div>
                        <span className="font-medium">{item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Caja de Compensacion */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FaHandHoldingUsd className="h-4 w-4 text-orange-500" />
                Caja Compensacion
              </CardTitle>
              <CardDescription className="text-xs">
                Cajas de Compensacion Familiar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {cajaCompensacionStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">Sin datos</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cajaCompensacionStats.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="cantidad"
                      >
                        {cajaCompensacionStats.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [
                        `${value} usuarios (${props.payload.porcentaje}%)`
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2">
                <div className="text-center">
                  <span className="text-2xl font-bold text-orange-600">
                    {cajaCompensacionStats.reduce((sum, caja) => sum + caja.cantidad, 0)}
                  </span>
                  <p className="text-xs text-gray-500">Total afiliados</p>
                </div>
                {/* Leyenda */}
                {cajaCompensacionStats.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {cajaCompensacionStats.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="truncate" title={item.nombre}>
                            {item.nombre.length > 12 ? `${item.nombre.substring(0, 12)}...` : item.nombre}
                          </span>
                        </div>
                        <span className="font-medium">{item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}