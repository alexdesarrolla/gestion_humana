"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, UserCircle2, Lock, Eye, EyeOff, Menu, X } from "lucide-react"
import { createSupabaseClient } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface BirthdayUser {
  id: string
  colaborador: string
  fecha_nacimiento: string
  avatar_path?: string | null
  genero?: string | null
  cargo_nombre?: string | null
}

export default function Home() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showValidationForm, setShowValidationForm] = useState(false)
  const [cedula, setCedula] = useState("")
  const [validationStep, setValidationStep] = useState(1)
  const [validationPassword, setValidationPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [userData, setUserData] = useState<{ correo_electronico: string; cedula: string } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [birthdayUsers, setBirthdayUsers] = useState<BirthdayUser[]>([])
  const [loadingBirthdays, setLoadingBirthdays] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Función para verificar si el input es una cédula o un correo electrónico
  const isCedula = (input: string): boolean => {
    return /^\d+$/.test(input)
  }

  // Función para obtener la URL del avatar
  const getAvatarUrl = (avatar_path: string | null, genero: string | null): string => {
    const supabase = createSupabaseClient()

    if (avatar_path) {
      const { data } = supabase.storage.from("avatar").getPublicUrl(avatar_path)
      return data.publicUrl
    } else if (genero) {
      const path = genero === "F" ? "defecto/avatar-f.webp" : "defecto/avatar-m.webp"
      const { data } = supabase.storage.from("avatar").getPublicUrl(path)
      return data.publicUrl
    }

    // Fallback a avatar por defecto masculino
    const { data } = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-m.webp")
    return data.publicUrl
  }

  // Cargar cumpleañeros de la semana
  useEffect(() => {
    const loadBirthdayUsers = async () => {
      try {
        const supabase = createSupabaseClient()
        const today = new Date()
        const currentWeekStart = new Date(today)
        currentWeekStart.setDate(today.getDate() - today.getDay() + 1) // Lunes
        const currentWeekEnd = new Date(currentWeekStart)
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6) // Domingo

        // Obtener todos los usuarios activos con fecha de nacimiento
        const { data: users, error } = await supabase
          .from("usuario_nomina")
          .select(`
            id,
            colaborador,
            fecha_nacimiento,
            avatar_path,
            genero,
            cargo_id,
            cargos:cargo_id(nombre)
          `)
          .eq("estado", "activo")
          .not("fecha_nacimiento", "is", null)

        if (error) {
          console.error("Error loading birthday users:", error)
          return
        }

        // Filtrar usuarios que cumplen años esta semana
        const birthdayUsersThisWeek = (users || []).filter((user) => {
          if (!user.fecha_nacimiento) return false

          const birthDate = new Date(user.fecha_nacimiento as string)
          const currentYear = today.getFullYear()

          // Crear fecha de cumpleaños para este año
          const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate())

          // Verificar si el cumpleaños está en la semana actual
          return birthdayThisYear >= currentWeekStart && birthdayThisYear <= currentWeekEnd
        })

        // Mapear los datos para incluir el nombre del cargo
        const birthdayUsersWithCargo = birthdayUsersThisWeek.map((user: any) => ({
          ...user,
          cargo_nombre: user.cargos?.nombre || null
        }))

        setBirthdayUsers(birthdayUsersWithCargo as BirthdayUser[])
      } catch (error) {
        console.error("Error loading birthday users:", error)
      } finally {
        setLoadingBirthdays(false)
      }
    }

    loadBirthdayUsers()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const supabase = createSupabaseClient()
      let emailToUse = formData.email

      // Si el input es una cédula, buscar el correo correspondiente
      if (isCedula(formData.email)) {
        const { data: userData, error: userError } = await supabase
          .from("usuario_nomina")
          .select("correo_electronico")
          .eq("cedula", formData.email)
          .single()

        if (userError) {
          throw new Error("No se encontró ningún usuario con esta cédula")
        }

        if (typeof userData.correo_electronico === "string") {
          emailToUse = userData.correo_electronico
        } else {
          throw new Error("El correo electrónico recuperado no es válido")
        }
      }

      // Iniciar sesión
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: formData.password,
      })

      if (error) throw error

      if (data.user) {
        // Obtener el rol y estado del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuario_nomina")
          .select("rol, estado")
          .eq("auth_user_id", data.user.id)
          .single()

        if (userError) throw userError

        // Verificar si el usuario está activo
        if (userData.estado !== "activo") {
          await supabase.auth.signOut()
          throw new Error("Tu cuenta no está activa actualmente. Contacta al administrador para más información.")
        }

        // Redirigir según el rol
        if (userData.rol === "administrador") {
          router.push("/administracion")
        } else {
          router.push("/perfil")
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidarCedula = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const supabase = createSupabaseClient()

      // Verificar si el usuario existe en la tabla usuario_nomina
      const { data, error: queryError } = await supabase
        .from("usuario_nomina")
        .select("*")
        .eq("cedula", cedula)
        .single()

      if (queryError) {
        // Si no se encuentra el usuario, mostrar modal
        setShowModal(true)
        return
      }

      // Verificar si el usuario ya tiene una cuenta en auth
      const { data: authData, error: authError } = await supabase
        .from("usuario_nomina")
        .select("auth_user_id")
        .eq("cedula", cedula)
        .single()

      if (authData && authData.auth_user_id) {
        setError("Ya existe una cuenta asociada a esta cédula. Por favor inicie sesión.")
        return
      }

      // Si el usuario existe en nomina pero no tiene cuenta, pasar al siguiente paso
      if (data && typeof data.correo_electronico === "string" && typeof data.cedula === "string") {
        setUserData({
          correo_electronico: data.correo_electronico,
          cedula: data.cedula,
        })
      } else {
        throw new Error("Datos de usuario incompletos")
      }
      setValidationStep(2)
    } catch (err) {
      setError("Error al validar la cédula. Por favor intente nuevamente.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCrearCuenta = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (validationPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createSupabaseClient()

      if (!userData?.correo_electronico) {
        setError("Datos del usuario no encontrados")
        setIsLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.correo_electronico,
        password: validationPassword,
      })

      if (authError) throw authError

      if (authData.user) {
        // Actualizar el registro en usuario_nomina con el auth_user_id
        const { error: updateError } = await supabase
          .from("usuario_nomina")
          .update({ auth_user_id: authData.user.id })
          .eq("cedula", cedula)

        if (updateError) throw updateError

        // Resetear formularios y volver al login
        setShowValidationForm(false)
        setValidationStep(1)
        setCedula("")
        setValidationPassword("")
        setConfirmPassword("")
        setUserData(null)
        setError("")
        alert("Cuenta creada exitosamente. Ahora puedes iniciar sesión.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la cuenta")
    } finally {
      setIsLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
  }

  const toggleToValidation = () => {
    setShowValidationForm(true)
    setError("")
  }

  const backToLogin = () => {
    setShowValidationForm(false)
    setValidationStep(1)
    setCedula("")
    setValidationPassword("")
    setConfirmPassword("")
    setUserData(null)
    setError("")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-gray-200/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img src="/logo-h-n.webp" alt="Portal de Gestión Humana" className="h-10 sm:h-12" />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a
                href="#inicio"
                className="text-gray-600 hover:text-emerald-600 font-medium transition-colors duration-200"
              >
                Ingresar
              </a>
              <a
                href="#novedades"
                className="text-gray-600 hover:text-emerald-600 font-medium transition-colors duration-200"
              >
                Novedades
              </a>
              <a
                href="#bienestar"
                className="text-gray-600 hover:text-emerald-600 font-medium transition-colors duration-200"
              >
                Bienestar
              </a>
              <a
                href="#actividades"
                className="text-gray-600 hover:text-emerald-600 font-medium transition-colors duration-200"
              >
                Actividades
              </a>
              <a
                href="#sst"
                className="text-gray-600 hover:text-emerald-600 font-medium transition-colors duration-200"
              >
                SST
              </a>
              <a
                href="#normatividad"
                className="text-gray-600 hover:text-emerald-600 font-medium transition-colors duration-200"
              >
                Normatividad
              </a>
              <a
                href="#contacto"
                className="text-gray-600 hover:text-emerald-600 font-medium transition-colors duration-200"
              >
                Contacto
              </a>
            </nav>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors duration-200"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Abrir menú</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999] md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed inset-y-0 left-0 flex w-full max-w-sm">
            <div className="relative flex w-full flex-col backdrop-blur-md bg-white/90 border-r border-gray-200/30 shadow-xl transform transition-transform duration-300 ease-out">
              {/* Header with logo and close button */}
              <div className="flex h-16 flex-shrink-0 items-center justify-between px-4 border-b border-gray-200/30">
                <img src="/logo-h-n.webp" alt="Portal de Gestión Humana" className="h-8 w-auto" />
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Cerrar menú</span>
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto">
                <nav className="px-4 py-4 space-y-1">
                  {[
                    { href: "#inicio", label: "Ingresar" },
                    { href: "#novedades", label: "Novedades" },
                    { href: "#bienestar", label: "Bienestar" },
                    { href: "#actividades", label: "Actividades" },
                    { href: "#sst", label: "SST" },
                    { href: "#normatividad", label: "Normatividad" },
                    { href: "#contacto", label: "Contacto" },
                  ].map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="block px-3 py-3 text-base font-medium text-gray-800 hover:text-emerald-600 hover:bg-gray-100/50 rounded-md transition-all duration-200 transform hover:scale-105"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section
        id="inicio"
        className="relative bg-cover bg-center py-12 lg:py-20"
        style={{ backgroundImage: "url('/fondosecciones.webp')" }}
      >
        {/* Gradiente overlay mejorado */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 via-white/30 to-transparent"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Welcome Section */}
            <div className="text-center lg:text-left lg:pr-8">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Bienvenido al Portal de Gestión Humana
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed">
                Tu centro de información y recursos para el desarrollo profesional y personal. Mantente al día con las
                últimas novedades, políticas y beneficios de la empresa.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto lg:mx-0">
                {[
                  { icon: "📋", text: "Gestión de documentos y políticas" },
                  { icon: "🎯", text: "Programas de bienestar y desarrollo" },
                  { icon: "📅", text: "Cronograma de actividades y eventos" },
                  { icon: "🛡️", text: "Seguridad y salud en el trabajo" },
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 font-medium text-gray-700">
                    <span className="text-xl">{feature.icon}</span>
                    <span className="text-sm sm:text-base">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Login Section */}
            <div className="flex justify-center lg:justify-end">
              <Card className="w-full max-w-md backdrop-blur-md bg-white/85 border border-gray-200/30 shadow-xl">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl text-center">
                    {showValidationForm
                      ? validationStep === 1
                        ? "Validar Cédula"
                        : "Crear Contraseña"
                      : "Iniciar Sesión"}
                  </CardTitle>
                  <CardDescription className="text-center">
                    {showValidationForm
                      ? validationStep === 1
                        ? "Ingresa tu número de cédula para validar tus datos"
                        : "Crea una contraseña para tu cuenta"
                      : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {!showValidationForm ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Cédula o Correo electrónico</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <UserCircle2 className="h-5 w-5 text-slate-400" />
                          </div>
                          <Input
                            id="email"
                            type="text"
                            className="pl-10 bg-white"
                            value={formData.email}
                            onChange={handleInputChange}
                            name="email"
                            placeholder="12345678 o tu@mail.com"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Contraseña</Label>
                          <a href="/reset-password" className="text-sm font-medium hover:underline">
                            ¿Olvidaste tu contraseña?
                          </a>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400" />
                          </div>
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            className="pl-10 pr-10 bg-white"
                            value={formData.password}
                            onChange={handleInputChange}
                            name="password"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5 text-slate-400" />
                            ) : (
                              <Eye className="h-5 w-5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="remember"
                          name="remember"
                          checked={formData.remember}
                          onChange={handleInputChange}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="remember" className="text-sm">
                          Recordarme
                        </Label>
                      </div>
                      <Button type="submit" className="w-full bg-[#6B487A] hover:bg-[#5a3d68]" disabled={isLoading}>
                        {isLoading ? "Iniciando sesión..." : "Ingresar al Portal"}
                      </Button>
                      <div className="mt-4 text-center">
                        <button
                          type="button"
                          onClick={toggleToValidation}
                          className="text-sm font-medium hover:underline"
                        >
                          Primera vez que voy a ingresar
                        </button>
                      </div>
                    </form>
                  ) : validationStep === 1 ? (
                    <form onSubmit={handleValidarCedula} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cedula">Número de Cédula</Label>
                        <Input
                          id="cedula"
                          type="text"
                          placeholder="Ingresa tu número de cédula"
                          className="bg-white"
                          value={cedula}
                          onChange={(e) => setCedula(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full bg-[#6B487A] hover:bg-[#5a3d68]" disabled={isLoading}>
                        {isLoading ? "Validando..." : "Validar Cédula"}
                      </Button>
                      <div className="mt-4 text-center">
                        <button
                          type="button"
                          onClick={backToLogin}
                          className="text-sm font-medium hover:underline"
                        >
                          Volver al inicio de sesión
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleCrearCuenta} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="validationPassword">Contraseña</Label>
                        <Input
                          id="validationPassword"
                          type="password"
                          className="bg-white"
                          value={validationPassword}
                          onChange={(e) => setValidationPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          className="bg-white"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full bg-[#6B487A] hover:bg-[#5a3d68]" disabled={isLoading}>
                        {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
                      </Button>
                      <div className="mt-4 text-center">
                        <button
                          type="button"
                          onClick={backToLogin}
                          className="text-sm font-medium text-emerald-600 hover:underline"
                        >
                          Volver al inicio de sesión
                        </button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Feed Section */}
      <section id="novedades" className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Feed de Novedades</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Mantente informado con las últimas actualizaciones, eventos y recursos disponibles para ti.
            </p>
          </div>

          {/* Featured Message */}
          <div className="bg-gradient-to-r from-emerald-500 to-purple-600 rounded-2xl p-6 lg:p-12 mb-8 lg:mb-12 text-white relative overflow-hidden">
            <div className="relative z-10">
              <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-semibold uppercase tracking-wide mb-4">
                Destacado
              </span>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                Nueva Política de Trabajo Híbrido
              </h3>
              <p className="text-lg sm:text-xl mb-6 opacity-95 leading-relaxed">
                Conoce los nuevos lineamientos para el trabajo híbrido que entrarán en vigencia el próximo mes. Incluye
                horarios flexibles, días de oficina y herramientas digitales.
              </p>
              <div className="flex flex-wrap gap-4 mb-6 text-sm opacity-90">
                <span>📅 Publicado: 15 de Enero, 2024</span>
                <span>👤 Recursos Humanos</span>
                <span>⏱️ Lectura: 5 min</span>
              </div>
              <a
                href="#"
                className="inline-block bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-xl"
              >
                Leer más →
              </a>
            </div>
          </div>

          {/* Cards Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
            {/* Bienestar Card */}
            <div
              id="bienestar"
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:-translate-y-2 transition-all duration-300 hover:shadow-xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-200">
                <span className="inline-block bg-emerald-500 text-white px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide mb-3">
                  Bienestar
                </span>
                <h3 className="text-xl font-semibold text-gray-900">Programas de Bienestar</h3>
              </div>
              <div className="flex-1 p-6 space-y-6">
                {[
                  {
                    icon: "🧘",
                    title: "Sesiones de Mindfulness",
                    excerpt: "Únete a nuestras sesiones semanales de mindfulness para reducir el estrés.",
                    priority: "high",
                    type: "Actividad",
                    time: "Hace 2 días",
                    bgColor: "bg-emerald-100",
                    iconColor: "text-emerald-600",
                  },
                  {
                    icon: "💪",
                    title: "Gimnasio Corporativo",
                    excerpt: "Nuevos horarios y equipos disponibles en nuestro gimnasio.",
                    priority: "medium",
                    type: "Beneficio",
                    time: "Hace 1 semana",
                    bgColor: "bg-blue-100",
                    iconColor: "text-blue-600",
                  },
                ].map((post, index) => (
                  <article key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <div
                      className={`flex-shrink-0 w-20 h-16 ${post.bgColor} rounded-lg flex items-center justify-center`}
                    >
                      <span className={`${post.iconColor} text-2xl`}>{post.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">{post.title}</h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.excerpt}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-md font-medium ${
                            post.priority === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {post.priority === "high" ? "Alta" : "Media"}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-medium">{post.type}</span>
                        <span className="text-gray-500">{post.time}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="border-t border-gray-200">
                <a
                  href="#"
                  className="block p-4 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
                >
                  Ver todos los programas →
                </a>
              </div>
            </div>

            {/* Actividades Card */}
            <div
              id="actividades"
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:-translate-y-2 transition-all duration-300 hover:shadow-xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-200">
                <span className="inline-block bg-amber-500 text-white px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide mb-3">
                  Actividades
                </span>
                <h3 className="text-xl font-semibold text-gray-900">Cronograma de Actividades</h3>
              </div>
              <div className="flex-1 p-6 space-y-6">
                {[
                  {
                    icon: "🎉",
                    title: "Celebración Fin de Año",
                    excerpt: "Únete a nuestra celebración anual con cena y actividades especiales.",
                    priority: "high",
                    type: "Evento",
                    time: "En 2 semanas",
                    bgColor: "bg-amber-100",
                    iconColor: "text-amber-600",
                  },
                  {
                    icon: "📚",
                    title: "Taller de Liderazgo",
                    excerpt: "Desarrolla tus habilidades de liderazgo con nuestros expertos.",
                    priority: "medium",
                    type: "Capacitación",
                    time: "Próximo mes",
                    bgColor: "bg-purple-100",
                    iconColor: "text-purple-600",
                  },
                ].map((post, index) => (
                  <article key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <div
                      className={`flex-shrink-0 w-20 h-16 ${post.bgColor} rounded-lg flex items-center justify-center`}
                    >
                      <span className={`${post.iconColor} text-2xl`}>{post.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">{post.title}</h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.excerpt}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-md font-medium ${
                            post.priority === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {post.priority === "high" ? "Alta" : "Media"}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-medium">{post.type}</span>
                        <span className="text-gray-500">{post.time}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="border-t border-gray-200">
                <a
                  href="#"
                  className="block p-4 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
                >
                  Ver cronograma completo →
                </a>
              </div>
            </div>
          </div>

          {/* Cards Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
            {/* SST Card */}
            <div
              id="sst"
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:-translate-y-2 transition-all duration-300 hover:shadow-xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-200">
                <span className="inline-block bg-red-500 text-white px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide mb-3">
                  SST
                </span>
                <h3 className="text-xl font-semibold text-gray-900">Seguridad y Salud en el Trabajo</h3>
              </div>
              <div className="flex-1 p-6 space-y-6">
                {[
                  {
                    icon: "🛡️",
                    title: "Protocolo de Emergencias",
                    excerpt: "Actualización de los protocolos de evacuación y primeros auxilios.",
                    priority: "high",
                    type: "Protocolo",
                    time: "Hace 3 días",
                    bgColor: "bg-red-100",
                    iconColor: "text-red-600",
                  },
                  {
                    icon: "🏥",
                    title: "Brigada de Emergencias",
                    excerpt: "Capacitación para nuevos miembros de la brigada de emergencias.",
                    priority: "medium",
                    type: "Capacitación",
                    time: "Hace 1 semana",
                    bgColor: "bg-orange-100",
                    iconColor: "text-orange-600",
                  },
                ].map((post, index) => (
                  <article key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <div
                      className={`flex-shrink-0 w-20 h-16 ${post.bgColor} rounded-lg flex items-center justify-center`}
                    >
                      <span className={`${post.iconColor} text-2xl`}>{post.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">{post.title}</h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.excerpt}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-md font-medium ${
                            post.priority === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {post.priority === "high" ? "Alta" : "Media"}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-medium">{post.type}</span>
                        <span className="text-gray-500">{post.time}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="border-t border-gray-200">
                <a
                  href="#"
                  className="block p-4 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
                >
                  Ver recursos de SST →
                </a>
              </div>
            </div>

            {/* Normatividad Card */}
            <div
              id="normatividad"
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:-translate-y-2 transition-all duration-300 hover:shadow-xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-200">
                <span className="inline-block bg-purple-500 text-white px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide mb-3">
                  Normatividad
                </span>
                <h3 className="text-xl font-semibold text-gray-900">Blog de Normatividad</h3>
              </div>
              <div className="flex-1 p-6 space-y-6">
                {[
                  {
                    icon: "📋",
                    title: "Código de Conducta 2024",
                    excerpt: "Nuevas actualizaciones al código de conducta empresarial.",
                    priority: "high",
                    type: "Política",
                    time: "Hace 1 día",
                    bgColor: "bg-violet-100",
                    iconColor: "text-violet-600",
                  },
                  {
                    icon: "⚖️",
                    title: "Ley de Protección de Datos",
                    excerpt: "Guía sobre el manejo y protección de datos personales.",
                    priority: "medium",
                    type: "Normativa",
                    time: "Hace 5 días",
                    bgColor: "bg-indigo-100",
                    iconColor: "text-indigo-600",
                  },
                ].map((post, index) => (
                  <article key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <div
                      className={`flex-shrink-0 w-20 h-16 ${post.bgColor} rounded-lg flex items-center justify-center`}
                    >
                      <span className={`${post.iconColor} text-2xl`}>{post.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">{post.title}</h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.excerpt}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-md font-medium ${
                            post.priority === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {post.priority === "high" ? "Alta" : "Media"}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-medium">{post.type}</span>
                        <span className="text-gray-500">{post.time}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="border-t border-gray-200">
                <a
                  href="#"
                  className="block p-4 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
                >
                  Ver todas las normativas →
                </a>
              </div>
            </div>
          </div>

          {/* Featured Birthday Section */}
          <div
            id="cumpleaños"
            className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 rounded-2xl p-6 lg:p-12 text-white relative overflow-hidden"
          >
            <div className="relative z-10">
              <span className="inline-block bg-white/25 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-semibold uppercase tracking-wide mb-4">
                Esta Semana
              </span>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                Cumpleañeros de la Semana
              </h3>
              <p className="text-lg sm:text-xl mb-8 opacity-95 leading-relaxed">
                Celebremos juntos a nuestros compañeros que están de cumpleaños esta semana. ¡Envíales tus
                felicitaciones!
              </p>
              <div className="w-full">
                {loadingBirthdays ? (
                  <div className="text-center py-8">
                    <p className="text-white/80">Cargando cumpleañeros...</p>
                  </div>
                ) : birthdayUsers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {birthdayUsers.map((user, index) => {
                      const birthDate = new Date(user.fecha_nacimiento)
                      const formattedDate = birthDate.toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })

                      const colors = [
                        "from-pink-400 to-purple-500",
                        "from-blue-400 to-cyan-500",
                        "from-green-400 to-emerald-500",
                        "from-orange-400 to-red-500",
                        "from-purple-400 to-pink-500",
                        "from-cyan-400 to-blue-500",
                        "from-emerald-400 to-green-500",
                        "from-red-400 to-orange-500",
                      ]

                      const initials = user.colaborador
                        .split(" ")
                        .map((name) => name.charAt(0))
                        .slice(0, 2)
                        .join("")

                      return (
                        <div
                          key={user.id}
                          className="flex items-center gap-4 bg-white/15 backdrop-blur-sm p-4 rounded-xl hover:translate-x-2 transition-transform duration-200"
                        >
                          <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-white/30">
                            <img
                              src={getAvatarUrl(user.avatar_path || null, user.genero || null)}
                              alt={`Avatar de ${user.colaborador}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback a avatar con iniciales si la imagen falla
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center rounded-full"><span class="text-white font-bold text-lg">${initials}</span></div>`
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-lg mb-1">
                              {user.colaborador.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                            </h4>
                            <p className="text-white/80 text-sm mb-1">
                              {(user.cargo_nombre || 'Sin cargo asignado').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                            </p>
                            <p className="text-white/90 text-sm font-medium">
                              🎂 {formattedDate.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/80">No hay cumpleañeros esta semana</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Carousel Section */}
      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Nuestras Empresas</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Trabajamos con las mejores organizaciones para brindar soluciones de gestión humana de calidad
            </p>
          </div>

          {/* Carrusel de logos */}
          <div className="relative overflow-hidden">
            <div className="flex animate-scroll space-x-8 lg:space-x-12">
              {/* Primera serie de logos */}
              <div className="flex space-x-8 lg:space-x-12 flex-shrink-0">
                {[
                  'empresa-bdatam.webp',
                  'empresa-bestdream.webp', 
                  'empresa-cbb.webp',
                  'empresa-daytona.webp',
                  'empresa-hka.webp',
                  'empresa-japolandia.webp',
                  'empresa-lucena.webp',
                  'empresa-orpa.webp',
                  'empresa-towncenter.webp'
                ].map((image, index) => (
                  <div key={index} className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24">
                    <img
                      src={`/empresas/${image}`}
                      alt={`Empresa ${index + 1}`}
                      className="max-w-full bg-white max-h-full object-contain rounded-lg hover:opacity-100 transition-opacity duration-300 border border-gray-200"
                    />
                  </div>
                ))}
              </div>

              {/* Segunda serie de logos (duplicada para efecto infinito) */}
              <div className="flex space-x-8 lg:space-x-12 flex-shrink-0">
                <div className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex-shrink-0">
                  <img
                    src="/placeholder.svg?height=60&width=120"
                    alt="Empresa 1"
                    className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
                <div className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex-shrink-0">
                  <img
                    src="/placeholder.svg?height=60&width=120"
                    alt="Empresa 2"
                    className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
                <div className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex-shrink-0">
                  <img
                    src="/placeholder.svg?height=60&width=120"
                    alt="Empresa 3"
                    className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
                <div className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex-shrink-0">
                  <img
                    src="/placeholder.svg?height=60&width=120"
                    alt="Empresa 4"
                    className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
                <div className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex-shrink-0">
                  <img
                    src="/placeholder.svg?height=60&width=120"
                    alt="Empresa 5"
                    className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
                <div className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex-shrink-0">
                  <img
                    src="/placeholder.svg?height=60&width=120"
                    alt="Empresa 6"
                    className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
                <div className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex-shrink-0">
                  <img
                    src="/placeholder.svg?height=60&width=120"
                    alt="Empresa 7"
                    className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
                <div className="flex items-center justify-center w-32 h-20 lg:w-40 lg:h-24 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex-shrink-0">
                  <img
                    src="/placeholder.svg?height=60&width=120"
                    alt="Empresa 8"
                    className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
              </div>
            </div>

            {/* Gradientes laterales para efecto fade */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* Modal para usuario no encontrado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Usuario no encontrado</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              No se encontró un usuario con la cédula ingresada. Por favor verifica el número o contacta al
              administrador del sistema.
            </p>
            <div className="flex justify-end">
              <Button onClick={closeModal} className="bg-[#6B487A] hover:bg-[#5a3d68]">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer id="contacto" className="bg-gray-900 text-gray-300 pt-12 lg:pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Logo and Description */}
            <div className="lg:col-span-1">
              <div className="flex justify-center md:justify-start mb-4">
                <img src="/logo-h-b.webp" alt="Logo GH" className="w-32 sm:w-40" />
              </div>
              <p className="text-gray-400 leading-relaxed text-center md:text-left">
                Tu centro de información y recursos para el desarrollo profesional y personal. Conectando a nuestro
                equipo con las mejores oportunidades de crecimiento.
              </p>
            </div>

            {/* Enlaces Rápidos */}
            <div className="text-center md:text-left">
              <h4 className="text-white font-semibold text-lg mb-4">Enlaces Rápidos</h4>
              <ul className="space-y-2">
                {[
                  { href: "#inicio", label: "Ingresar" },
                  { href: "#novedades", label: "Novedades" },
                  { href: "#bienestar", label: "Programas de bienestar" },
                  { href: "#actividades", label: "Cronograma de Actividades" },
                  { href: "#sst", label: "Seguridad y Salud en el Trabajo" },
                  { href: "#normatividad", label: "Blog de Normatividad" },
                  { href: "#cumpleaños", label: "Cumpleañeros de la Semana" },
                ].map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="text-gray-400 hover:text-emerald-400 transition-colors duration-200">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recursos */}
            <div className="text-center md:text-left">
              <h4 className="text-white font-semibold text-lg mb-4">Recursos</h4>
              <ul className="space-y-2">
                {["Certificacion laboral", "Vacaciones", "Permisos", "Incapacidades", "Comunicados"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors duration-200">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contacto */}
            <div className="text-center md:text-left">
              <h4 className="text-white font-semibold text-lg mb-4">Contacto</h4>
              <ul className="space-y-2">
                {[
                  { icon: "📧", text: "digital@bdatam.com" },
                  { icon: "📞", text: "+57 310 6456 861" },
                  { icon: "📍", text: "Cúcuta, Colombia" },
                  { icon: "🕒", text: "Lun - Vie: 8:00 AM - 6:00 PM" },
                ].map((contact, index) => (
                  <li key={index} className="flex items-center justify-center md:justify-start gap-2 text-gray-400">
                    <span>{contact.icon}</span>
                    <span>{contact.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-gray-700 pt-8 text-center space-y-2">
            <p className="text-gray-500 text-sm">© 2025 Gestión Humana 360. Todos los derechos reservados.</p>
            <p className="text-gray-500 text-sm">
              Hecho con ♥️ por{" "}
              <a href="https://bdatam.com/" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                Bdatam
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
