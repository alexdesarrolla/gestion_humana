"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { createSupabaseClient } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp, Search, X, Eye, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, Plus, Edit } from "lucide-react"
import { ProfileCard } from "@/components/ui/profile-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PermissionsManager } from "@/components/ui/permissions-manager"

export default function Usuarios() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [empresas, setEmpresas] = useState<any[]>([])
  const [empresasFilter, setEmpresasFilter] = useState<string[]>([])
  const [cargos, setCargos] = useState<any[]>([])
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("")
  const [selectedCargo, setSelectedCargo] = useState<string>("all")
  const [selectedEstado, setSelectedEstado] = useState<string>("all")
  const [selectedRol, setSelectedRol] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [editUserData, setEditUserData] = useState<any>(null)
  const [newUserData, setNewUserData] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    rol: 'usuario',
    genero: '',
    cedula: '',
    fecha_ingreso: '',
    empresa_id: '',
    cargo_id: '',
    sede_id: '',
    fecha_nacimiento: '',
    edad: '',
    rh: '',
    eps_id: '',
    afp_id: '',
    cesantias_id: '',
    caja_de_compensacion_id: '',
    direccion_residencia: ''
  })
  const [sedes, setSedes] = useState<any[]>([]);
  const [eps, setEps] = useState<any[]>([]);
  const [afps, setAfps] = useState<any[]>([]);
  const [cesantias, setCesantias] = useState<any[]>([]);
  const [cajaDeCompensacionOptions, setCajaDeCompensacionOptions] = useState<any[]>([]);
  const [addUserError, setAddUserError] = useState('')
  const [addUserSuccess, setAddUserSuccess] = useState(false)

  const [addUserLoading, setAddUserLoading] = useState(false)
  const [editUserError, setEditUserError] = useState('')
  const [editUserSuccess, setEditUserSuccess] = useState(false)
  const [editUserLoading, setEditUserLoading] = useState(false)
  
  // Estados para permisos
  const [userPermissions, setUserPermissions] = useState<any[]>([])

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [paginatedUsers, setPaginatedUsers] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // Referencia para el timeout de búsqueda
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push("/login")
        return
      }

      // Obtener datos del usuario actual para verificar rol
      const { data: currentUser, error: userError } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError) {
        console.error("Error al verificar rol:", userError)
        router.push("/perfil")
        return
      }

      if (currentUser.rol !== "administrador") {
        console.log("Usuario no tiene permisos de administrador")
        router.push("/perfil")
        return
      }

      // Obtener lista de usuarios con rol 'usuario' incluyendo todas las relaciones
      const { data: usuarios, error: usuariosError } = await supabase
        .from("usuario_nomina")
        .select(`
          *,
          empresas:empresa_id(id, nombre),
          sedes:sede_id(id, nombre),
          eps:eps_id(id, nombre),
          afp:afp_id(id, nombre),
          cesantias:cesantias_id(id, nombre),
          caja_de_compensacion:caja_de_compensacion_id(id, nombre),
          cargos:cargo_id(id, nombre)
        `)
        .eq("rol", "usuario")

      if (usuariosError) {
        console.error("Error al obtener usuarios:", usuariosError)
        setLoading(false)
        return
      }

      // Obtener todas las empresas para el formulario de agregar usuario
      const { data: todasEmpresas } = await supabase
        .from("empresas")
        .select("id, nombre")
        .order("nombre")

      // Obtener sedes, EPS, AFP y cajas de compensación para formularios
      const { data: sedesData } = await supabase
        .from("sedes")
        .select("id, nombre")
        .order("nombre")

      const { data: epsData } = await supabase
        .from("eps")
        .select("id, nombre")
        .order("nombre")

      const { data: afpsData } = await supabase
        .from("afp")
        .select("id, nombre")
        .order("nombre")

      const { data: cajasData } = await supabase
        .from("caja_de_compensacion")
        .select("id, nombre")
        .order("nombre")

      const { data: cesantiasData } = await supabase
        .from("cesantias")
        .select("id, nombre")
        .order("nombre")

      setSedes(sedesData || [])
      setEps(epsData || [])
      setAfps(afpsData || [])
      setCesantias(cesantiasData || [])
      setCajaDeCompensacionOptions(cajasData || [])

      // Obtener vacaciones activas para todos los usuarios
      const today = new Date().toISOString().split('T')[0]
      const { data: vacacionesActivas } = await supabase
        .from("solicitudes_vacaciones")
        .select("usuario_id")
        .eq("estado", "aprobado")
        .lte("fecha_inicio", today)
        .gte("fecha_fin", today)

      // Agregar información de vacaciones a cada usuario
      const usuariosConVacaciones = usuarios?.map(user => ({
        ...user,
        enVacaciones: user.auth_user_id ? vacacionesActivas?.some(vacacion => vacacion.usuario_id === user.auth_user_id) || false : false
      })) || []

      setUsers(usuariosConVacaciones)
      setFilteredUsers(usuariosConVacaciones)

      // Extraer empresas únicas para filtros
      const uniqueEmpresas = Array.from(new Set(usuariosConVacaciones?.map(user => {
        // Verificar si empresas existe y tiene la propiedad nombre
        if (user.empresas && typeof user.empresas === 'object' && 'nombre' in user.empresas) {
          return (user.empresas as any).nombre
        }
        return null
      }).filter(Boolean)))
      setEmpresas(todasEmpresas || [])
      setEmpresasFilter(uniqueEmpresas)

      // Cargar cargos desde la tabla cargos
      const { data: cargosData, error: cargosError } = await supabase
        .from("cargos")
        .select("id, nombre")
        .order("nombre")
      
      if (cargosError) {
        console.error("Error al cargar cargos:", cargosError)
      } else {
        setCargos(cargosData || [])
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  // Función para ordenar
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"

    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }

    setSortConfig({ key, direction })
  }

  // Aplicar filtros y ordenamiento con debounce para la búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    // Mostrar el preloader
    setSearchLoading(true)

    // Limpiar el timeout anterior si existe
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    // Establecer un nuevo timeout para aplicar la búsqueda después de 300ms
    searchTimeout.current = setTimeout(() => {
      applyFilters(value, selectedEmpresa, selectedCargo, selectedEstado, selectedRol, sortConfig)
    }, 300)
  }

  // Función para aplicar todos los filtros
  const applyFilters = (
    search: string,
    empresa: string,
    cargo: string,
    estado: string,
    rol: string,
    sort: { key: string; direction: "asc" | "desc" } | null,
  ) => {
    let result = [...users]

    // Aplicar búsqueda
    if (search) {
      const lowerCaseSearchTerm = search.toLowerCase()
      result = result.filter(
        (user) =>
          user.colaborador?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.correo_electronico?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.cargos?.nombre?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.empresas?.nombre?.toLowerCase().includes(lowerCaseSearchTerm),
      )
    }

    // Aplicar filtro de empresa
    if (empresa && empresa !== "all") {
      result = result.filter((user) => user.empresas?.nombre === empresa)
    }

    // Aplicar filtro de cargo
    if (cargo && cargo !== "all") {
      result = result.filter((user) => user.cargos?.nombre === cargo)
    }

    // Aplicar filtro de estado
    if (estado && estado !== "all") {
      result = result.filter((user) => user.estado === estado)
    }

    // Aplicar filtro de rol
    if (rol && rol !== "all") {
      result = result.filter((user) => user.rol === rol)
    }

    // Aplicar ordenamiento
    if (sort !== null) {
      result.sort((a, b) => {
        // Manejar propiedades anidadas como 'empresas.nombre' y 'cargos.nombre'
        let aValue, bValue

        // Definir interfaces para relaciones
        interface EmpresaData {
          nombre?: string
        }
        
        interface CargoData {
          nombre?: string
        }

        if (sort.key === "empresas") {
          const aEmpresa = a.empresas as EmpresaData | undefined
          const bEmpresa = b.empresas as EmpresaData | undefined
          aValue = aEmpresa?.nombre || ""
          bValue = bEmpresa?.nombre || ""
        } else if (sort.key === "cargos") {
          const aCargo = a.cargos as CargoData | undefined
          const bCargo = b.cargos as CargoData | undefined
          aValue = aCargo?.nombre || ""
          bValue = bCargo?.nombre || ""
        } else {
          aValue = a[sort.key] || ""
          bValue = b[sort.key] || ""
        }

        if (aValue < bValue) {
          return sort.direction === "asc" ? -1 : 1
        }
        if (aValue > bValue) {
          return sort.direction === "asc" ? 1 : -1
        }
        return 0
      })
    }

    setFilteredUsers(result)
    setCurrentPage(1) // Resetear a la primera página cuando cambian los filtros
    setSearchLoading(false) // Ocultar el preloader
  }

  // Efecto para aplicar filtros cuando cambian los selectores o el ordenamiento
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    setSearchLoading(true)
    searchTimeout.current = setTimeout(() => {
      applyFilters(searchTerm, selectedEmpresa, selectedCargo, selectedEstado, selectedRol, sortConfig)
      setCurrentPage(1)
    }, 300)
  }, [selectedEmpresa, selectedCargo, selectedEstado, selectedRol, sortConfig, users])

  // Efecto para calcular la paginación
  useEffect(() => {
    const total = Math.ceil(filteredUsers.length / itemsPerPage)
    setTotalPages(total || 1)

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setPaginatedUsers(filteredUsers.slice(startIndex, endIndex))
  }, [filteredUsers, currentPage, itemsPerPage])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEmpresa("")
    setSelectedCargo("all")
    setSelectedEstado("all")
    setSelectedRol("all")
    setSortConfig(null)
    setCurrentPage(1)

    // Aplicar filtros inmediatamente sin esperar
    applyFilters("", "", "all", "all", "all", null)
  }

  const handleViewDetails = async (user: any) => {
    try {
      const supabase = createSupabaseClient()
      // Obtener información completa de vacaciones para el usuario seleccionado
      const today = new Date().toISOString().split('T')[0]
      
      // Obtener todas las vacaciones aprobadas del usuario para determinar el estado
      const { data: todasVacacionesAprobadas } = await supabase
        .from("solicitudes_vacaciones")
        .select("fecha_inicio, fecha_fin")
        .eq("usuario_id", user.auth_user_id)
        .eq("estado", "aprobado")
        .order("fecha_inicio", { ascending: false })

      let estadoVacaciones = "sin_vacaciones"
      let rangoVacaciones = null
      
      if (todasVacacionesAprobadas && todasVacacionesAprobadas.length > 0) {
        const currentYear = new Date().getFullYear()
        
        // Buscar vacaciones del año actual
        const vacacionesEsteAno = todasVacacionesAprobadas.filter((v: any) => {
          const fechaInicio = new Date(v.fecha_inicio)
          return fechaInicio.getFullYear() === currentYear
        })
        
        if (vacacionesEsteAno.length > 0) {
          const proximasVacaciones: any = vacacionesEsteAno[0]
          const fechaInicio = new Date(proximasVacaciones.fecha_inicio)
          const fechaFin = new Date(proximasVacaciones.fecha_fin)
          const hoy = new Date()
          
          if (fechaFin < hoy) {
            // Ya tomó vacaciones este año
            estadoVacaciones = "ya_tomo"
            rangoVacaciones = {
              inicio: proximasVacaciones.fecha_inicio,
              fin: proximasVacaciones.fecha_fin
            }
          } else if (fechaInicio <= hoy && fechaFin >= hoy) {
            // Está actualmente de vacaciones
            estadoVacaciones = "en_vacaciones"
            rangoVacaciones = {
              inicio: proximasVacaciones.fecha_inicio,
              fin: proximasVacaciones.fecha_fin
            }
          } else if (fechaInicio > hoy) {
            // Tiene vacaciones pendientes
            estadoVacaciones = "pendientes"
            rangoVacaciones = {
              inicio: proximasVacaciones.fecha_inicio,
              fin: proximasVacaciones.fecha_fin
            }
          }
        }
      }

      // Agregar el estado de vacaciones al userData
      const userDataWithVacaciones = {
        ...user,
        estadoVacaciones,
        rangoVacaciones
      }

      setSelectedUser(userDataWithVacaciones)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Error al obtener información de vacaciones:', error)
      // En caso de error, mostrar el usuario sin información adicional de vacaciones
      setSelectedUser(user)
      setIsModalOpen(true)
    }
  }

  const handleAddUser = () => {
    setIsAddUserModalOpen(true)
    setAddUserError('')
    setAddUserSuccess(false)
  }

  const handleEditUser = (user: any) => {
    console.log('Usuario seleccionado:', user);
    console.log('Género del usuario:', user.genero);
    setEditUserData({
      id: user.id, // ID de la tabla usuario_nomina para actualizar
      auth_user_id: user.auth_user_id, // ID de auth para permisos
      nombre: user.colaborador || '',
      correo: user.correo_electronico || '',
      telefono: user.telefono || '',
      rol: user.rol || 'usuario',
      estado: user.estado || 'activo',
      genero: user.genero ? user.genero.toLowerCase() : '',
      cedula: user.cedula || '',
      fecha_ingreso: user.fecha_ingreso || '',
      empresa_id: user.empresa_id ? user.empresa_id.toString() : '',
      cargo_id: user.cargo_id ? user.cargo_id.toString() : (user.cargos?.id ? user.cargos.id.toString() : ''),
      sede_id: user.sede_id ? user.sede_id.toString() : '',
      fecha_nacimiento: user.fecha_nacimiento || '',
      edad: user.edad ? user.edad.toString() : '',
      rh: user.rh || '',
      eps_id: user.eps_id ? user.eps_id.toString() : '',
      afp_id: user.afp_id ? user.afp_id.toString() : '',
      cesantias_id: user.cesantias_id ? user.cesantias_id.toString() : '',
      caja_de_compensacion_id: user.caja_de_compensacion_id ? user.caja_de_compensacion_id.toString() : '',
      direccion_residencia: user.direccion_residencia || ''
    })
    setIsEditUserModalOpen(true)
    setEditUserError('')
    setEditUserSuccess(false)
  }

  const fetchUsers = async () => {
    const supabase = createSupabaseClient()
    
    // Obtener lista de todos los usuarios incluyendo todas las relaciones
    const { data: usuarios, error: usuariosError } = await supabase
      .from("usuario_nomina")
      .select(`
        *,
        empresas:empresa_id(id, nombre),
        sedes:sede_id(id, nombre),
        eps:eps_id(id, nombre),
        afp:afp_id(id, nombre),
        cesantias:cesantias_id(id, nombre),
        caja_de_compensacion:caja_de_compensacion_id(id, nombre),
        cargos:cargo_id(id, nombre)
      `)
      .eq("rol", "usuario")

    if (usuariosError) {
      console.error("Error al obtener usuarios:", usuariosError)
      return
    }
    
    // Log temporal para obtener auth_user_id
    console.log('🔑 Auth User IDs disponibles:', usuarios?.map(u => ({ 
      nombre: u.colaborador, 
      auth_user_id: u.auth_user_id 
    })))
    
    // Obtener vacaciones activas para todos los usuarios
    const today = new Date().toISOString().split('T')[0]
    console.log('🔍 Buscando vacaciones para fecha:', today)
    
    const { data: vacacionesActivas, error: vacacionesError } = await supabase
      .from("solicitudes_vacaciones")
      .select("usuario_id")
      .eq("estado", "aprobado")
      .lte("fecha_inicio", today)
      .gte("fecha_fin", today)
    
    console.log('📊 Vacaciones activas encontradas:', vacacionesActivas)
    console.log('❌ Error en vacaciones activas:', vacacionesError)

    // Obtener todas las vacaciones aprobadas para calcular el estado completo
    const { data: todasLasVacaciones, error: todasVacacionesError } = await supabase
      .from("solicitudes_vacaciones")
      .select("usuario_id, fecha_inicio, fecha_fin")
      .eq("estado", "aprobado")
      .order("fecha_inicio", { ascending: true })
    
    console.log('📋 Todas las vacaciones aprobadas:', todasLasVacaciones)
    console.log('❌ Error en todas las vacaciones:', todasVacacionesError)

    // Agregar información completa de vacaciones a cada usuario
    const usuariosConVacaciones = usuarios?.map(user => {
      let estadoVacaciones = "sin_vacaciones"
      let rangoVacaciones = null
      const enVacaciones = user.auth_user_id ? vacacionesActivas?.some(vacacion => vacacion.usuario_id === user.auth_user_id) || false : false
      
      console.log(`👤 Procesando usuario: ${user.colaborador}, auth_user_id: ${user.auth_user_id}, enVacaciones: ${enVacaciones}`)
      
      if (user.auth_user_id && todasLasVacaciones) {
        const anoActual = new Date().getFullYear()
        const vacacionesEsteAno = todasLasVacaciones
          .filter((vacacion: any) => vacacion.usuario_id === user.auth_user_id)
          .filter((vacacion: any) => {
            const fechaInicio = new Date(vacacion.fecha_inicio)
            return fechaInicio.getFullYear() === anoActual
          })
        
        if (vacacionesEsteAno.length > 0) {
          const hoy = new Date()
          
          // Buscar vacaciones actuales primero
          const vacacionActual = vacacionesEsteAno.find((v: any) => {
            const fechaInicio = new Date(v.fecha_inicio)
            const fechaFin = new Date(v.fecha_fin)
            return fechaInicio <= hoy && fechaFin >= hoy
          })
          
          if (vacacionActual) {
            // Está actualmente de vacaciones
            estadoVacaciones = "en_vacaciones"
            rangoVacaciones = {
              inicio: vacacionActual.fecha_inicio,
              fin: vacacionActual.fecha_fin
            }
          } else {
            // Buscar vacaciones futuras
            const vacacionFutura = vacacionesEsteAno.find((v: any) => {
              const fechaInicio = new Date(v.fecha_inicio)
              return fechaInicio > hoy
            })
            
            if (vacacionFutura) {
              // Tiene vacaciones pendientes
              estadoVacaciones = "pendientes"
              rangoVacaciones = {
                inicio: vacacionFutura.fecha_inicio,
                fin: vacacionFutura.fecha_fin
              }
            } else {
              // Ya tomó vacaciones este año (todas las fechas de fin son pasadas)
              const vacacionPasada = vacacionesEsteAno[vacacionesEsteAno.length - 1] // La más reciente
              estadoVacaciones = "ya_tomo"
              rangoVacaciones = {
                inicio: vacacionPasada.fecha_inicio,
                fin: vacacionPasada.fecha_fin
              }
            }
          }
        }
      }
      
      const resultado = {
        ...user,
        enVacaciones,
        estadoVacaciones,
        rangoVacaciones
      }
      
      console.log(`✅ Usuario ${user.colaborador} procesado:`, {
        estadoVacaciones,
        rangoVacaciones,
        enVacaciones
      })
      
      return resultado
    }) || []

    setUsers(usuariosConVacaciones)
    setFilteredUsers(usuariosConVacaciones)
  }

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddUserError('')
    setAddUserSuccess(false)
    setAddUserLoading(true)

    try {
      const supabase = createSupabaseClient()

      // Insertar directamente en la tabla usuario_nomina sin crear autenticación
      const { error: dbError } = await supabase
        .from('usuario_nomina')
        .insert([
          {
            colaborador: newUserData.nombre,
            correo_electronico: newUserData.correo,
            telefono: newUserData.telefono,
            rol: newUserData.rol,
            genero: newUserData.genero || null,
            cedula: newUserData.cedula || null,
            fecha_ingreso: newUserData.fecha_ingreso || null,
            empresa_id: newUserData.empresa_id ? parseInt(newUserData.empresa_id) : null,
            cargo_id: newUserData.cargo_id || null,
            sede_id: newUserData.sede_id ? parseInt(newUserData.sede_id) : null,
            fecha_nacimiento: newUserData.fecha_nacimiento || null,
            edad: newUserData.edad ? parseInt(newUserData.edad) : null,
            rh: newUserData.rh || null,
            eps_id: newUserData.eps_id ? parseInt(newUserData.eps_id) : null,
            afp_id: newUserData.afp_id ? parseInt(newUserData.afp_id) : null,
            cesantias_id: newUserData.cesantias_id ? parseInt(newUserData.cesantias_id) : null,
            caja_de_compensacion_id: newUserData.caja_de_compensacion_id ? parseInt(newUserData.caja_de_compensacion_id) : null,
            direccion_residencia: newUserData.direccion_residencia || null,
            estado: 'activo'
          }
        ])

      if (dbError) throw dbError
      
      setAddUserSuccess(true)
      setNewUserData({
        nombre: '',
        correo: '',
        telefono: '',
        rol: 'usuario',
        genero: '',
        cedula: '',
        fecha_ingreso: '',
        empresa_id: '',
        cargo_id: '',
        sede_id: '',
        fecha_nacimiento: '',
        edad: '',
        rh: '',
        eps_id: '',
        afp_id: '',
        cesantias_id: '',
        caja_de_compensacion_id: '',
        direccion_residencia: ''
      })
      
      // Recargar la lista de usuarios
      await fetchUsers()
      
    } catch (err: any) {
      setAddUserError(err.message)
    } finally {
      setAddUserLoading(false)
    }
  }

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditUserError('')
    setEditUserSuccess(false)
    setEditUserLoading(true)

    try {
      const supabase = createSupabaseClient()

      const updateData = {
        colaborador: editUserData.nombre,
        correo_electronico: editUserData.correo,
        telefono: editUserData.telefono,
        rol: editUserData.rol,
        estado: editUserData.estado,
        genero: editUserData.genero || null,
        cedula: editUserData.cedula || null,
        fecha_ingreso: editUserData.fecha_ingreso || null,
        empresa_id: editUserData.empresa_id ? parseInt(editUserData.empresa_id) : null,
        cargo_id: editUserData.cargo_id || null,
        sede_id: editUserData.sede_id ? parseInt(editUserData.sede_id) : null,
        fecha_nacimiento: editUserData.fecha_nacimiento || null,
        edad: editUserData.edad ? parseInt(editUserData.edad) : null,
        rh: editUserData.rh || null,
        eps_id: editUserData.eps_id ? parseInt(editUserData.eps_id) : null,
        afp_id: editUserData.afp_id ? parseInt(editUserData.afp_id) : null,
        cesantias_id: editUserData.cesantias_id ? parseInt(editUserData.cesantias_id) : null,
        caja_de_compensacion_id: editUserData.caja_de_compensacion_id ? parseInt(editUserData.caja_de_compensacion_id) : null,
        direccion_residencia: editUserData.direccion_residencia || null,
        motivo_retiro: editUserData.estado === 'inactivo' ? (editUserData.motivo_retiro || null) : null,
        fecha_retiro: editUserData.estado === 'inactivo' ? (editUserData.fecha_retiro || null) : null
      }

      const { error: dbError } = await supabase
        .from('usuario_nomina')
        .update(updateData)
        .eq('id', editUserData.id)

      if (dbError) throw dbError
      
      // Sistema simplificado: solo roles básicos (usuario/administrador)
      
      setEditUserSuccess(true)
      setEditUserData(null)
      setUserPermissions([])
      
      // Recargar la lista de usuarios
      await fetchUsers()
      
      // Cerrar el modal después de un breve delay
      setTimeout(() => {
        setIsEditUserModalOpen(false)
        setEditUserSuccess(false)
      }, 1500)
      
    } catch (err: any) {
      setEditUserError(err.message)
    } finally {
      setEditUserLoading(false)
    }
  }

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-4 w-4" />
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    )
  }

  // Funciones de paginación
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Generar array de páginas para mostrar en la paginación
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Si hay menos páginas que el máximo a mostrar, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Mostrar un subconjunto de páginas centrado en la página actual
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
      let endPage = startPage + maxPagesToShow - 1

      if (endPage > totalPages) {
        endPage = totalPages
        startPage = Math.max(1, endPage - maxPagesToShow + 1)
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }
    }

    return pageNumbers
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <div className="text-2xl font-semibold text-gray-700">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar userName="Administrador" />

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-[90%] mx-auto px-4 sm:px-6 md:px-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Listado de Usuarios</h1>
                    <p className="text-muted-foreground">Gestiona los usuarios del sistema.</p>
                  </div>
                  <Button onClick={handleAddUser} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir Usuario
                  </Button>
                </div>

                {/* Filtros */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-1 block">Buscar</label>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nombre, correo, cargo..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-8"
                          />
                        </div>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Empresa</label>
                        <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas las empresas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas las empresas</SelectItem>
                            {empresasFilter.map((empresa) => (
                              <SelectItem key={empresa} value={empresa}>
                                {empresa}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Cargo</label>
                        <Select value={selectedCargo} onValueChange={setSelectedCargo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos los cargos" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            <SelectItem value="all">Todos los cargos</SelectItem>
                            {cargos.map((cargo) => (
                              <SelectItem key={cargo.id} value={cargo.nombre}>
                                {cargo.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Estado</label>
                        <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="activo">Activo</SelectItem>
                            <SelectItem value="inactivo">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Rol</label>
                        <Select value={selectedRol} onValueChange={setSelectedRol}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos los roles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los roles</SelectItem>
                            <SelectItem value="usuario">Usuario</SelectItem>

                          </SelectContent>
                        </Select>
                      </div>

                      <Button variant="outline" onClick={clearFilters} className="flex items-center gap-1">
                        <X className="h-4 w-4" />
                        Limpiar filtros
                      </Button>
                    </div>

                    {/* Indicadores de filtros activos */}
                    {(searchTerm || selectedEmpresa || selectedCargo || selectedEstado !== "all" || selectedRol !== "all" || sortConfig) && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <div className="text-sm text-muted-foreground">Filtros activos:</div>
                        {searchTerm && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Búsqueda: {searchTerm}
                          </Badge>
                        )}
                        {selectedEmpresa && selectedEmpresa !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Empresa: {selectedEmpresa}
                          </Badge>
                        )}
                        {selectedCargo && selectedCargo !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Cargo: {selectedCargo}
                          </Badge>
                        )}
                        {selectedEstado && selectedEstado !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Estado: {selectedEstado === "activo" ? "Activo" : "Inactivo"}
                          </Badge>
                        )}
                        {selectedRol && selectedRol !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Rol: Usuario
                          </Badge>
                        )}
                        {sortConfig && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Ordenado por: {sortConfig.key} (
                            {sortConfig.direction === "asc" ? "ascendente" : "descendente"})
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="rounded-md border bg-white">
                  {loading || searchLoading ? (
                    <div className="p-6 space-y-6">
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-lg text-muted-foreground">
                          {loading ? "Cargando usuarios..." : "Buscando..."}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Avatar</TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("colaborador")}
                            >
                              <div className="flex items-center">
                                Nombre
                                {getSortIcon("colaborador")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("cargos")}
                            >
                              <div className="flex items-center">
                                Cargo
                                {getSortIcon("cargos")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("empresas")}
                            >
                              <div className="flex items-center">
                                Empresa
                                {getSortIcon("empresas")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("correo_electronico")}
                            >
                              <div className="flex items-center">
                                Correo
                                {getSortIcon("correo_electronico")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("estado")}
                            >
                              <div className="flex items-center">
                                Estado
                                {getSortIcon("estado")}
                              </div>
                            </TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No se encontraron usuarios con los filtros aplicados
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  {user.avatar_path ? (
                                    <img
                                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/${user.avatar_path}`}
                                      className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                      alt="Avatar"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                                      {user.colaborador?.charAt(0) || "?"}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{user.colaborador}</TableCell>
                                <TableCell>{user.cargos?.nombre || "N/A"}</TableCell>
                                <TableCell>
                                  {user.empresas?.nombre ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {user.empresas.nombre}
                    </Badge>
                  ) : (
                    "N/A"
                  )}
                                </TableCell>
                                <TableCell>{user.correo_electronico}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={user.estado === 'activo' ? 'default' : 'destructive'}
                                    className={user.estado === 'activo' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}
                                  >
                                    {user.estado === 'activo' ? 'Activo' : 'Inactivo'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="p-2"
                                      onClick={() => handleViewDetails(user)}
                                      title="Ver detalles"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="p-2"
                                      onClick={() => handleEditUser(user)}
                                      title="Editar usuario"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Paginación */}
                  {!loading && !searchLoading && filteredUsers.length > 0 && (
                    <CardFooter className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t">
                      <div className="flex items-center mb-4 sm:mb-0">
                        <span className="text-sm text-muted-foreground mr-2">Mostrar</span>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => {
                            setItemsPerPage(Number.parseInt(value))
                            setCurrentPage(1) // Resetear a la primera página
                          }}
                        >
                          <SelectTrigger className="w-[80px]">
                            <SelectValue placeholder="25" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground ml-2">por página</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-muted-foreground mr-4">
                          Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
                          {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length}{" "}
                          usuarios
                        </div>

                        <Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center">
                          {getPageNumbers().map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              className="mx-1 h-8 w-8 p-0"
                              onClick={() => goToPage(page)}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de detalles de usuario */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">Detalles del Usuario</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              <ProfileCard userData={selectedUser} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de añadir usuario */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-4 py-2">
            {addUserError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{addUserError}</span>
              </div>
            )}
            {addUserSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">Usuario registrado exitosamente</span>
              </div>
            )}
            <form className="space-y-6 px-2" onSubmit={handleAddUserSubmit}>
              {/* Campos obligatorios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre completo *</Label>
                  <Input
                    id="nombre"
                    type="text"
                    required
                    value={newUserData.nombre}
                    onChange={(e) => setNewUserData({ ...newUserData, nombre: e.target.value })}
                    className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Correo electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={newUserData.correo}
                    onChange={(e) => setNewUserData({ ...newUserData, correo: e.target.value })}
                    className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                  />
                </div>

                <div>
                  <Label htmlFor="telefono">Teléfono *</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    required
                    value={newUserData.telefono}
                    onChange={(e) => setNewUserData({ ...newUserData, telefono: e.target.value })}
                    className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                  />
                </div>

                <div>
                  <Label htmlFor="rol">Rol *</Label>
                  <Select value={newUserData.rol} onValueChange={(value) => setNewUserData({ ...newUserData, rol: value })}>
                    <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usuario">Usuario</SelectItem>

                      <SelectItem value="administrador">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


              </div>

              {/* Información adicional */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Información adicional</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="genero">Género</Label>
                    <Select value={newUserData.genero} onValueChange={(value) => setNewUserData({ ...newUserData, genero: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar género" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cedula">Cédula</Label>
                    <Input
                      id="cedula"
                      type="text"
                      value={newUserData.cedula}
                      onChange={(e) => setNewUserData({ ...newUserData, cedula: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fecha_ingreso">Fecha de Ingreso</Label>
                    <Input
                      id="fecha_ingreso"
                      type="date"
                      value={newUserData.fecha_ingreso}
                      onChange={(e) => setNewUserData({ ...newUserData, fecha_ingreso: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="empresa_id">Empresa</Label>
                    <Select value={newUserData.empresa_id} onValueChange={(value) => setNewUserData({ ...newUserData, empresa_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {empresas
                          .filter(empresa => empresa && empresa.id && empresa.nombre)
                          .filter((empresa, index, self) => self.findIndex(e => e.id === empresa.id) === index)
                          .map((empresa) => (
                            <SelectItem key={`empresa-${empresa.id}`} value={empresa.id.toString()}>
                              {empresa.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cargo">Cargo</Label>
                    <Select
                      value={newUserData.cargo_id}
                      onValueChange={(value) => setNewUserData({ ...newUserData, cargo_id: value })}
                    >
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar cargo" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {cargos
                          .filter(cargo => cargo && cargo.id && cargo.nombre)
                          .map((cargo) => (
                            <SelectItem key={`cargo-${cargo.id}`} value={cargo.id.toString()}>
                              {cargo.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sede">Sede</Label>
                    <Select value={newUserData.sede_id} onValueChange={(value) => setNewUserData({ ...newUserData, sede_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar sede" />
                      </SelectTrigger>
                      <SelectContent>
                        {sedes
                          .filter(sede => sede && sede.id && sede.nombre)
                          .filter((sede, index, self) => self.findIndex(s => s.id === sede.id) === index)
                          .map((sede) => (
                            <SelectItem key={`sede-${sede.id}`} value={sede.id.toString()}>
                              {sede.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                    <Input
                      id="fecha_nacimiento"
                      type="date"
                      value={newUserData.fecha_nacimiento}
                      onChange={(e) => setNewUserData({ ...newUserData, fecha_nacimiento: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edad">Edad</Label>
                    <Input
                      id="edad"
                      type="number"
                      value={newUserData.edad}
                      onChange={(e) => setNewUserData({ ...newUserData, edad: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="rh">RH</Label>
                    <Select value={newUserData.rh} onValueChange={(value) => setNewUserData({ ...newUserData, rh: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar RH" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="eps">EPS</Label>
                    <Select value={newUserData.eps_id} onValueChange={(value) => setNewUserData({ ...newUserData, eps_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar EPS" />
                      </SelectTrigger>
                      <SelectContent>
                        {eps
                          .filter(epsItem => epsItem && epsItem.id && epsItem.nombre)
                          .filter((epsItem, index, self) => self.findIndex(e => e.id === epsItem.id) === index)
                          .map((epsItem) => (
                            <SelectItem key={`eps-${epsItem.id}`} value={epsItem.id.toString()}>
                              {epsItem.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="afp">AFP</Label>
                    <Select value={newUserData.afp_id} onValueChange={(value) => setNewUserData({ ...newUserData, afp_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar AFP" />
                      </SelectTrigger>
                      <SelectContent>
                        {afps
                          .filter(afp => afp && afp.id && afp.nombre)
                          .filter((afp, index, self) => self.findIndex(a => a.id === afp.id) === index)
                          .map((afp) => (
                            <SelectItem key={`afp-${afp.id}`} value={afp.id.toString()}>
                              {afp.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cesantias">Cesantías</Label>
                    <Select value={newUserData.cesantias_id} onValueChange={(value) => setNewUserData({ ...newUserData, cesantias_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar cesantías" />
                      </SelectTrigger>
                      <SelectContent>
                        {cesantias
                          .filter(cesantia => cesantia && cesantia.id && cesantia.nombre)
                          .filter((cesantia, index, self) => self.findIndex(c => c.id === cesantia.id) === index)
                          .map((cesantia) => (
                            <SelectItem key={`cesantia-${cesantia.id}`} value={cesantia.id.toString()}>
                              {cesantia.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="caja_compensacion">Caja de Compensación</Label>
                    <Select value={newUserData.caja_de_compensacion_id} onValueChange={(value) => setNewUserData({ ...newUserData, caja_de_compensacion_id: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar caja" />
                      </SelectTrigger>
                      <SelectContent>
                        {cajaDeCompensacionOptions
                          .filter(caja => caja && caja.id && caja.nombre)
                          .filter((caja, index, self) => self.findIndex(c => c.id === caja.id) === index)
                          .map((caja) => (
                            <SelectItem key={`caja-${caja.id}`} value={caja.id.toString()}>
                              {caja.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="direccion_residencia">Dirección de Residencia</Label>
                  <Textarea
                    id="direccion_residencia"
                    value={newUserData.direccion_residencia}
                    onChange={(e) => setNewUserData({ ...newUserData, direccion_residencia: e.target.value })}
                    className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addUserLoading}>
                  {addUserLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Usuario'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Usuario */}
      <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {editUserError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {editUserError}
              </div>
            )}
            {editUserSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                Usuario actualizado exitosamente
              </div>
            )}
            {editUserData && (
              <form className="space-y-6 px-2" onSubmit={handleEditUserSubmit}>
                {/* Campos obligatorios */}
                <div>
                    <Label htmlFor="edit-nombre">Nombre completo *</Label>
                    <Input
                      id="edit-nombre"
                      type="text"
                      required
                      value={editUserData.nombre}
                      onChange={(e) => setEditUserData({ ...editUserData, nombre: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>
                    <Label htmlFor="edit-email">Correo electrónico *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      required
                      value={editUserData.correo}
                      onChange={(e) => setEditUserData({ ...editUserData, correo: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-telefono">Teléfono *</Label>
                    <Input
                      id="edit-telefono"
                      type="tel"
                      required
                      value={editUserData.telefono}
                      onChange={(e) => setEditUserData({ ...editUserData, telefono: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-rol">Rol *</Label>
                    <Select value={editUserData.rol} onValueChange={(value) => setEditUserData({ ...editUserData, rol: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usuario">Usuario</SelectItem>

                        <SelectItem value="administrador">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-estado">Estado *</Label>
                    <Select value={editUserData.estado} onValueChange={(value) => setEditUserData({ ...editUserData, estado: value })}>
                      <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campos específicos para usuarios inactivos */}
                  {editUserData.estado === 'inactivo' && (
                    <>
                      <div>
                        <Label htmlFor="edit-motivo_retiro">Motivo de Retiro</Label>
                        <Textarea
                          id="edit-motivo_retiro"
                          value={editUserData.motivo_retiro || ''}
                          onChange={(e) => setEditUserData({ ...editUserData, motivo_retiro: e.target.value })}
                          className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                          rows={3}
                          placeholder="Especifique el motivo del retiro..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit-fecha_retiro">Fecha de Retiro</Label>
                        <Input
                          id="edit-fecha_retiro"
                          type="date"
                          value={editUserData.fecha_retiro || ''}
                          onChange={(e) => setEditUserData({ ...editUserData, fecha_retiro: e.target.value })}
                          className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Información adicional */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Información adicional</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-genero">Género</Label>
                      <Input
                        id="edit-genero"
                        value={editUserData.genero ? editUserData.genero.charAt(0).toUpperCase() + editUserData.genero.slice(1) : ''}
                        readOnly
                        className="mt-1 border-2 bg-gray-50 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-cedula">Cédula</Label>
                      <Input
                        id="edit-cedula"
                        type="text"
                        value={editUserData.cedula}
                        onChange={(e) => setEditUserData({ ...editUserData, cedula: e.target.value })}
                        className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-fecha_ingreso">Fecha de Ingreso</Label>
                      <Input
                        id="edit-fecha_ingreso"
                        type="date"
                        value={editUserData.fecha_ingreso}
                        onChange={(e) => setEditUserData({ ...editUserData, fecha_ingreso: e.target.value })}
                        className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-empresa_id">Empresa</Label>
                      <Select value={editUserData.empresa_id} onValueChange={(value) => setEditUserData({ ...editUserData, empresa_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {empresas
                            .filter(empresa => empresa && empresa.id && empresa.nombre)
                            .filter((empresa, index, self) => self.findIndex(e => e.id === empresa.id) === index)
                            .map((empresa) => (
                              <SelectItem key={`edit-empresa-${empresa.id}`} value={empresa.id.toString()}>
                                {empresa.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-cargo">Cargo</Label>
                      <Select
                        value={editUserData.cargo_id}
                        onValueChange={(value) => setEditUserData({ ...editUserData, cargo_id: value })}
                      >
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar cargo" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {cargos
                            .filter(cargo => cargo && cargo.id && cargo.nombre)
                            .map((cargo) => (
                              <SelectItem key={`edit-cargo-${cargo.id}`} value={cargo.id.toString()}>
                                {cargo.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-sede">Sede</Label>
                      <Select value={editUserData.sede_id} onValueChange={(value) => setEditUserData({ ...editUserData, sede_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar sede" />
                        </SelectTrigger>
                        <SelectContent>
                          {sedes
                            .filter(sede => sede && sede.id && sede.nombre)
                            .filter((sede, index, self) => self.findIndex(s => s.id === sede.id) === index)
                            .map((sede) => (
                              <SelectItem key={`edit-sede-${sede.id}`} value={sede.id.toString()}>
                                {sede.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-fecha_nacimiento">Fecha de Nacimiento</Label>
                      <Input
                        id="edit-fecha_nacimiento"
                        type="date"
                        value={editUserData.fecha_nacimiento}
                        onChange={(e) => setEditUserData({ ...editUserData, fecha_nacimiento: e.target.value })}
                        className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-edad">Edad</Label>
                      <Input
                        id="edit-edad"
                        type="number"
                        value={editUserData.edad}
                        onChange={(e) => setEditUserData({ ...editUserData, edad: e.target.value })}
                        className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-rh">RH</Label>
                      <Select value={editUserData.rh} onValueChange={(value) => setEditUserData({ ...editUserData, rh: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar RH" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-eps">EPS</Label>
                      <Select value={editUserData.eps_id} onValueChange={(value) => setEditUserData({ ...editUserData, eps_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar EPS" />
                        </SelectTrigger>
                        <SelectContent>
                          {eps
                            .filter(epsItem => epsItem && epsItem.id && epsItem.nombre)
                            .filter((epsItem, index, self) => self.findIndex(e => e.id === epsItem.id) === index)
                            .map((epsItem) => (
                              <SelectItem key={`edit-eps-${epsItem.id}`} value={epsItem.id.toString()}>
                                {epsItem.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-afp">AFP</Label>
                      <Select value={editUserData.afp_id} onValueChange={(value) => setEditUserData({ ...editUserData, afp_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar AFP" />
                        </SelectTrigger>
                        <SelectContent>
                          {afps
                            .filter(afp => afp && afp.id && afp.nombre)
                            .filter((afp, index, self) => self.findIndex(a => a.id === afp.id) === index)
                            .map((afp) => (
                              <SelectItem key={`edit-afp-${afp.id}`} value={afp.id.toString()}>
                                {afp.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-cesantias">Cesantías</Label>
                      <Select value={editUserData.cesantias_id} onValueChange={(value) => setEditUserData({ ...editUserData, cesantias_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar cesantías" />
                        </SelectTrigger>
                        <SelectContent>
                          {cesantias
                            .filter(cesantia => cesantia && cesantia.id && cesantia.nombre)
                            .filter((cesantia, index, self) => self.findIndex(c => c.id === cesantia.id) === index)
                            .map((cesantia) => (
                              <SelectItem key={`edit-cesantia-${cesantia.id}`} value={cesantia.id.toString()}>
                                {cesantia.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-caja_compensacion">Caja de Compensación</Label>
                      <Select value={editUserData.caja_de_compensacion_id} onValueChange={(value) => setEditUserData({ ...editUserData, caja_de_compensacion_id: value })}>
                        <SelectTrigger className="mt-1 border-2 focus:border-blue-500 transition-colors">
                          <SelectValue placeholder="Seleccionar caja" />
                        </SelectTrigger>
                        <SelectContent>
                          {cajaDeCompensacionOptions
                            .filter(caja => caja && caja.id && caja.nombre)
                            .filter((caja, index, self) => self.findIndex(c => c.id === caja.id) === index)
                            .map((caja) => (
                              <SelectItem key={`edit-caja-${caja.id}`} value={caja.id.toString()}>
                                {caja.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="edit-direccion_residencia">Dirección de Residencia</Label>
                    <Textarea
                      id="edit-direccion_residencia"
                      value={editUserData.direccion_residencia}
                      onChange={(e) => setEditUserData({ ...editUserData, direccion_residencia: e.target.value })}
                      className="mt-1 border-2 focus:border-blue-500 transition-colors px-3 py-2"
                      rows={3}
                    />
                  </div>
                </div>



                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsEditUserModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={editUserLoading}>
                    {editUserLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      'Actualizar Usuario'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

