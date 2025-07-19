"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, UserCircle2, Lock, Eye, EyeOff } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface BirthdayUser {
  id: string
  colaborador: string
  fecha_nacimiento: string
  avatar_path?: string | null
  genero?: string | null
  empresas?: { nombre: string }
  cargos?: { nombre: string }
}

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showValidationForm, setShowValidationForm] = useState(false);
  const [cedula, setCedula] = useState('');
  const [validationStep, setValidationStep] = useState(1);
  const [validationPassword, setValidationPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userData, setUserData] = useState<{correo_electronico: string; cedula: string} | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [birthdayUsers, setBirthdayUsers] = useState<BirthdayUser[]>([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);

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
          .from('usuario_nomina')
          .select(`
            id,
            colaborador,
            fecha_nacimiento,
            avatar_path,
            genero,
            empresas:empresa_id(nombre),
            cargos:cargo_id(nombre)
          `)
          .eq('estado', 'activo')
          .not('fecha_nacimiento', 'is', null)
        
        if (error) {
          console.error('Error loading birthday users:', error)
          return
        }
        
        // Filtrar usuarios que cumplen años esta semana
        const birthdayUsersThisWeek = (users || []).filter(user => {
          if (!user.fecha_nacimiento) return false
          
          const birthDate = new Date(user.fecha_nacimiento)
          const currentYear = today.getFullYear()
          
          // Crear fecha de cumpleaños para este año
          const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate())
          
          // Verificar si el cumpleaños está en la semana actual
          return birthdayThisYear >= currentWeekStart && birthdayThisYear <= currentWeekEnd
        })
        
        setBirthdayUsers(birthdayUsersThisWeek)
      } catch (error) {
        console.error('Error loading birthday users:', error)
      } finally {
        setLoadingBirthdays(false)
      }
    }

    loadBirthdayUsers()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
     e.preventDefault();
     setError('');
     setIsLoading(true);
 
     try {
       const supabase = createSupabaseClient();
       let emailToUse = formData.email;
 
       // Si el input es una cédula, buscar el correo correspondiente
       if (isCedula(formData.email)) {
         const { data: userData, error: userError } = await supabase
           .from('usuario_nomina')
           .select('correo_electronico')
           .eq('cedula', formData.email)
           .single();
 
         if (userError) {
           throw new Error('No se encontró ningún usuario con esta cédula');
         }
 
         if (typeof userData.correo_electronico === 'string') {
           emailToUse = userData.correo_electronico;
         } else {
           throw new Error('El correo electrónico recuperado no es válido');
         }
       }
 
       // Iniciar sesión
       const { data, error } = await supabase.auth.signInWithPassword({
         email: emailToUse,
         password: formData.password,
       });
 
       if (error) throw error;
 
       if (data.user) {
         // Obtener el rol y estado del usuario
         const { data: userData, error: userError } = await supabase
           .from('usuario_nomina')
           .select('rol, estado')
           .eq('auth_user_id', data.user.id)
           .single();
 
         if (userError) throw userError;
 
         // Verificar si el usuario está activo
         if (userData.estado !== 'activo') {
           await supabase.auth.signOut();
           throw new Error('Tu cuenta no está activa actualmente. Contacta al administrador para más información.');
         }
 
         // Redirigir según el rol
         if (userData.rol === 'administrador') {
           router.push('/administracion');
         } else {
           router.push('/perfil');
         }
       }
     } catch (err: any) {
       setError(err.message);
     } finally {
       setIsLoading(false);
     }
   };

  const handleValidarCedula = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const supabase = createSupabaseClient();

      // Verificar si el usuario existe en la tabla usuario_nomina
      const { data, error: queryError } = await supabase
        .from('usuario_nomina')
        .select('*')
        .eq('cedula', cedula)
        .single();

      if (queryError) {
        // Si no se encuentra el usuario, mostrar modal
        setShowModal(true);
        return;
      }

      // Verificar si el usuario ya tiene una cuenta en auth
      const { data: authData, error: authError } = await supabase
        .from('usuario_nomina')
        .select('auth_user_id')
        .eq('cedula', cedula)
        .single();

      if (authData && authData.auth_user_id) {
        setError('Ya existe una cuenta asociada a esta cédula. Por favor inicie sesión.');
        return;
      }

      // Si el usuario existe en nomina pero no tiene cuenta, pasar al siguiente paso
      if (data && typeof data.correo_electronico === 'string' && typeof data.cedula === 'string') {
        setUserData({
          correo_electronico: data.correo_electronico,
          cedula: data.cedula
        });
      } else {
        throw new Error('Datos de usuario incompletos');
      }
      setValidationStep(2);
    } catch (err) {
      setError('Error al validar la cédula. Por favor intente nuevamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrearCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (validationPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseClient();

      if (!userData?.correo_electronico) {
        setError('Datos del usuario no encontrados');
        setIsLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.correo_electronico,
        password: validationPassword,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Actualizar el registro en usuario_nomina con el auth_user_id
        const { error: updateError } = await supabase
          .from('usuario_nomina')
          .update({ auth_user_id: authData.user.id })
          .eq('cedula', cedula);

        if (updateError) throw updateError;

        // Resetear formularios y volver al login
        setShowValidationForm(false);
        setValidationStep(1);
        setCedula('');
        setValidationPassword('');
        setConfirmPassword('');
        setUserData(null);
        setError('');
        alert('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const toggleToValidation = () => {
    setShowValidationForm(true);
    setError('');
  };

  const backToLogin = () => {
    setShowValidationForm(false);
    setValidationStep(1);
    setCedula('');
    setValidationPassword('');
    setConfirmPassword('');
    setUserData(null);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-container">
          <div className="landing-header-content">
            <div className="landing-logo-section">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">GH</span>
              </div>
              <div className="landing-brand-info">
                <h1 className="landing-portal-title">Portal de Gestión Humana</h1>
                <p className="landing-company-name">Tu Empresa</p>
              </div>
            </div>
            <nav className="landing-nav-links">
              <a href="#inicio" className="landing-nav-link">Inicio</a>
              <a href="#novedades" className="landing-nav-link">Novedades</a>
              <a href="#recursos" className="landing-nav-link">Recursos</a>
              <a href="#contacto" className="landing-nav-link">Contacto</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="landing-hero">
        <div className="landing-container">
          <div className="landing-hero-content">
            <div className="landing-welcome-section">
              <h2 className="landing-hero-title">
                Bienvenido al Portal de Gestión Humana
              </h2>
              <p className="landing-hero-description">
                Tu centro de información y recursos para el desarrollo profesional y personal. 
                Mantente al día con las últimas novedades, políticas y beneficios de la empresa.
              </p>
              <div className="landing-hero-features">
                <div className="landing-feature">
                  <span className="landing-feature-icon">📋</span>
                  <span>Gestión de documentos y políticas</span>
                </div>
                <div className="landing-feature">
                  <span className="landing-feature-icon">🎯</span>
                  <span>Programas de bienestar y desarrollo</span>
                </div>
                <div className="landing-feature">
                  <span className="landing-feature-icon">📅</span>
                  <span>Cronograma de actividades y eventos</span>
                </div>
                <div className="landing-feature">
                  <span className="landing-feature-icon">🛡️</span>
                  <span>Seguridad y salud en el trabajo</span>
                </div>
              </div>
            </div>
            
            <div className="landing-login-section">
              <Card className="border-none shadow-lg glassmorphism-card max-w-md w-full">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl text-center">
                    {showValidationForm 
                      ? (validationStep === 1 ? 'Validar Cédula' : 'Crear Contraseña')
                      : 'Iniciar Sesión'
                    }
                  </CardTitle>
                  <CardDescription className="text-center">
                    {showValidationForm 
                      ? (validationStep === 1 
                          ? 'Ingresa tu número de cédula para validar tus datos'
                          : 'Crea una contraseña para tu cuenta'
                        )
                      : 'Ingresa tu correo o cédula y contraseña para acceder al sistema'
                    }
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
                        <div className="relative bg-white">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <UserCircle2 className="h-5 w-5 text-slate-400" />
                          </div>
                          <Input
                            id="email"
                            type="text"
                            className="pl-10"
                            value={formData.email}
                            onChange={handleInputChange}
                            name="email"
                            placeholder="12345678 o tu@empresa.com"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Contraseña</Label>
                          <a href="/reset-password" className="text-sm font-medium text-primary hover:underline">
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
                        <Label htmlFor="remember" className="text-sm">Recordarme</Label>
                      </div>
                      <Button type="submit" className="w-full bg-[#6B487A]" disabled={isLoading}>
                        {isLoading ? 'Iniciando sesión...' : 'Ingresar al Portal'}
                      </Button>
                      <div className="mt-4 text-center">
                        <button 
                          type="button"
                          onClick={toggleToValidation}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Primera vez que voy a ingresar
                        </button>
                      </div>
                    </form>
                  ) : (
                    validationStep === 1 ? (
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
                        <Button type="submit" className="w-full bg-[#6B487A]" disabled={isLoading}>
                          {isLoading ? 'Validando...' : 'Validar Cédula'}
                        </Button>
                        <div className="mt-4 text-center">
                          <button 
                            type="button"
                            onClick={backToLogin}
                            className="text-sm font-medium text-primary hover:underline"
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
                        <Button type="submit" className="w-full bg-[#6B487A]" disabled={isLoading}>
                          {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                        </Button>
                        <div className="mt-4 text-center">
                          <button 
                            type="button"
                            onClick={backToLogin}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Volver al inicio de sesión
                          </button>
                        </div>
                      </form>
                    )
                  )}
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-slate-500 text-center">
                    © {new Date().getFullYear()} Gestión Humana 360. Todos los derechos reservados.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Feed Section */}
      <section id="novedades" className="landing-feed">
        <div className="landing-container">
          <div className="landing-feed-header">
            <h2 className="landing-feed-title">Feed de Novedades</h2>
            <p className="landing-feed-subtitle">
              Mantente informado con las últimas actualizaciones, eventos y recursos disponibles para ti.
            </p>
          </div>

          {/* Featured Message */}
          <div className="landing-featured-message">
            <div className="landing-featured-content">
              <span className="landing-featured-badge">Destacado</span>
              <h3 className="landing-featured-title">
                Nueva Política de Trabajo Híbrido
              </h3>
              <p className="landing-featured-description">
                Conoce los nuevos lineamientos para el trabajo híbrido que entrarán en vigencia 
                el próximo mes. Incluye horarios flexibles, días de oficina y herramientas digitales.
              </p>
              <div className="landing-featured-meta">
                <span>📅 Publicado: 15 de Enero, 2024</span>
                <span>👤 Recursos Humanos</span>
                <span>⏱️ Lectura: 5 min</span>
              </div>
              <a href="#" className="landing-featured-cta">
                Leer más →
              </a>
            </div>
          </div>

          {/* Cards Row */}
          <div className="landing-cards-row">
            {/* Bienestar Card */}
            <div className="landing-card">
              <div className="landing-card-header">
                <span className="landing-card-category bienestar">Bienestar</span>
                <h3 className="landing-card-title">Programas de Bienestar</h3>
              </div>
              <div className="landing-blog-feed">
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-600 text-2xl">🧘</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Sesiones de Mindfulness</h4>
                    <p className="landing-post-excerpt">
                      Únete a nuestras sesiones semanales de mindfulness para reducir el estrés.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority high">Alta</span>
                      <span className="landing-post-type">Actividad</span>
                      <span>Hace 2 días</span>
                    </div>
                  </div>
                </article>
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-2xl">💪</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Gimnasio Corporativo</h4>
                    <p className="landing-post-excerpt">
                      Nuevos horarios y equipos disponibles en nuestro gimnasio.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority medium">Media</span>
                      <span className="landing-post-type">Beneficio</span>
                      <span>Hace 1 semana</span>
                    </div>
                  </div>
                </article>
              </div>
              <a href="#" className="landing-card-link">
                Ver todos los programas →
              </a>
            </div>

            {/* Actividades Card */}
            <div className="landing-card">
              <div className="landing-card-header">
                <span className="landing-card-category actividades">Actividades</span>
                <h3 className="landing-card-title">Cronograma de Actividades</h3>
              </div>
              <div className="landing-blog-feed">
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                      <span className="text-amber-600 text-2xl">🎉</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Celebración Fin de Año</h4>
                    <p className="landing-post-excerpt">
                      Únete a nuestra celebración anual con cena y actividades especiales.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority high">Alta</span>
                      <span className="landing-post-type">Evento</span>
                      <span>En 2 semanas</span>
                    </div>
                  </div>
                </article>
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 text-2xl">📚</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Taller de Liderazgo</h4>
                    <p className="landing-post-excerpt">
                      Desarrolla tus habilidades de liderazgo con nuestros expertos.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority medium">Media</span>
                      <span className="landing-post-type">Capacitación</span>
                      <span>Próximo mes</span>
                    </div>
                  </div>
                </article>
              </div>
              <a href="#" className="landing-card-link">
                Ver cronograma completo →
              </a>
            </div>
          </div>

          {/* Second Cards Row */}
          <div className="landing-cards-row">
            {/* SST Card */}
            <div className="landing-card">
              <div className="landing-card-header">
                <span className="landing-card-category sst">SST</span>
                <h3 className="landing-card-title">Seguridad y Salud en el Trabajo</h3>
              </div>
              <div className="landing-blog-feed">
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 text-2xl">🛡️</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Protocolo de Emergencias</h4>
                    <p className="landing-post-excerpt">
                      Actualización de los protocolos de evacuación y primeros auxilios.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority high">Alta</span>
                      <span className="landing-post-type">Protocolo</span>
                      <span>Hace 3 días</span>
                    </div>
                  </div>
                </article>
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 text-2xl">🏥</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Brigada de Emergencias</h4>
                    <p className="landing-post-excerpt">
                      Capacitación para nuevos miembros de la brigada de emergencias.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority medium">Media</span>
                      <span className="landing-post-type">Capacitación</span>
                      <span>Hace 1 semana</span>
                    </div>
                  </div>
                </article>
              </div>
              <a href="#" className="landing-card-link">
                Ver recursos de SST →
              </a>
            </div>

            {/* Normatividad Card */}
            <div className="landing-card">
              <div className="landing-card-header">
                <span className="landing-card-category normatividad">Normatividad</span>
                <h3 className="landing-card-title">Blog de Normatividad</h3>
              </div>
              <div className="landing-blog-feed">
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-violet-100 flex items-center justify-center">
                      <span className="text-violet-600 text-2xl">📋</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Código de Conducta 2024</h4>
                    <p className="landing-post-excerpt">
                      Nuevas actualizaciones al código de conducta empresarial.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority high">Alta</span>
                      <span className="landing-post-type">Política</span>
                      <span>Hace 1 día</span>
                    </div>
                  </div>
                </article>
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 text-2xl">⚖️</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Ley de Protección de Datos</h4>
                    <p className="landing-post-excerpt">
                      Guía sobre el manejo y protección de datos personales.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority medium">Media</span>
                      <span className="landing-post-type">Normativa</span>
                      <span>Hace 5 días</span>
                    </div>
                  </div>
                </article>
              </div>
              <a href="#" className="landing-card-link">
                Ver todas las normativas →
              </a>
            </div>
          </div>

          {/* Featured Birthday Section */}
          <div className="landing-featured-birthday">
            <div className="landing-birthday-content">
              <span className="landing-birthday-badge">Esta Semana</span>
              <h3 className="landing-birthday-title">
                Cumpleañeros de la Semana
              </h3>
              <p className="landing-birthday-description">
                Celebremos juntos a nuestros compañeros que están de cumpleaños esta semana. 
                ¡Envíales tus felicitaciones!
              </p>
              <div className="landing-birthday-featured-list">
                {loadingBirthdays ? (
                  <div className="text-center py-4">
                    <p className="text-gray-600">Cargando cumpleañeros...</p>
                  </div>
                ) : birthdayUsers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {birthdayUsers.map((user, index) => {
                      const birthDate = new Date(user.fecha_nacimiento)
                      const formattedDate = birthDate.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })
                      
                      const colors = [
                        'from-pink-400 to-purple-500',
                        'from-blue-400 to-cyan-500',
                        'from-green-400 to-emerald-500',
                        'from-orange-400 to-red-500',
                        'from-purple-400 to-pink-500',
                        'from-cyan-400 to-blue-500',
                        'from-emerald-400 to-green-500',
                        'from-red-400 to-orange-500'
                      ]
                      
                      const initials = user.colaborador
                        .split(' ')
                        .map(name => name.charAt(0))
                        .slice(0, 2)
                        .join('')
                      
                      return (
                        <div key={user.id} className="landing-birthday-featured-person">
                          <div className="landing-birthday-avatar">
                            <img 
                              src={getAvatarUrl(user.avatar_path, user.genero)}
                              alt={`Avatar de ${user.colaborador}`}
                              className="w-full h-full object-cover rounded-full"
                              onError={(e) => {
                                // Fallback a avatar con iniciales si la imagen falla
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center rounded-full"><span class="text-white font-bold text-2xl">${initials}</span></div>`;
                                }
                              }}
                            />
                          </div>
                          <div className="landing-birthday-info">
                            <h4 className="landing-birthday-person-name">{user.colaborador}</h4>
                            <p className="landing-birthday-person-role">{user.cargos?.nombre || 'Sin cargo'} - {user.empresas?.nombre || 'Sin empresa'}</p>
                            <p className="landing-birthday-person-date">🎂 {formattedDate}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600">No hay cumpleañeros esta semana</p>
                  </div>
                )}
              </div>
              <div className="landing-birthday-actions">
                <a href="#" className="landing-birthday-cta primary">
                  Enviar Felicitaciones
                </a>
                <a href="#" className="landing-birthday-cta secondary">
                  Ver Todos los Cumpleaños
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal para usuario no encontrado */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Usuario no encontrado</h3>
            <p className="text-gray-600 mb-6">
              No se encontró un usuario con la cédula ingresada. Por favor verifica el número o contacta al administrador del sistema.
            </p>
            <div className="flex justify-end">
              <Button onClick={closeModal} className="bg-[#6B487A]">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer id="contacto" className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-content">
            <div className="landing-footer-section">
              <div className="landing-footer-logo">
                  <img src="/logo-h-b.webp" alt="Logo GH" className="w-40" />
              </div>
              <p className="landing-footer-description">
                Tu centro de información y recursos para el desarrollo profesional y personal. 
                Conectando a nuestro equipo con las mejores oportunidades de crecimiento.
              </p>
            </div>
            
            <div className="landing-footer-section">
              <h4>Enlaces Rápidos</h4>
              <ul className="landing-footer-links">
                <li><a href="#inicio">Ingresar</a></li>
                <li><a href="#novedades">Programas de bienestar</a></li>
                <li><a href="#recursos">Cronograma de Actividades</a></li>
                <li><a href="#contacto">Seguridad y Salud en el Trabajo</a></li>
                <li><a href="#contacto">Blog de Normatividad</a></li>
                <li><a href="#contacto">Cumpleañeros de la Semana</a></li>
              </ul>
            </div>
            
            <div className="landing-footer-section">
              <h4>Recursos</h4>
              <ul className="landing-footer-links">
                <li><a href="#">Certificacion laboral</a></li>
                <li><a href="#">vacaciones</a></li>
                <li><a href="#">Permisos</a></li>
                <li><a href="#">Incapacidades</a></li>
                <li><a href="#">Comunicados</a></li>
              </ul>
            </div>
            
            <div className="landing-footer-section">
              <h4>Contacto</h4>
              <div className="landing-contact-info">
                <p>📧 digital@bdatam.com</p>
                <p>📞 +57 310 6456 861</p>
                <p>📍 Cúcuta, Colombia</p>
                <p>🕒 Lun - Vie: 8:00 AM - 6:00 PM</p>
              </div>
            </div>
          </div>
          
          <div className="landing-footer-bottom">
            <p>© 2025 Gestión Humana 360. Todos los derechos reservados.</p>
            <p>Hecho con el♥️ por <a href="https://bdatam.com/">Bdatam</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
