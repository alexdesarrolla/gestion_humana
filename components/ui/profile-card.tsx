import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Briefcase,
  Heart,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Droplet,
  Building,
  MapPinned,
  CreditCard,
  X,
  Search,
  Upload,
  Loader2,
  Camera,
} from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { createSupabaseClient } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProfileCardProps {
  userData: any
}

export function ProfileCard({ userData }: ProfileCardProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (userData) {
      if (userData.avatar_path) {
        // Si el usuario tiene un avatar personalizado, usamos esa ruta
        const { data } = supabase.storage.from('avatar').getPublicUrl(userData.avatar_path)
        setAvatarUrl(data.publicUrl)
      } else if (userData.genero) {
        // Si no tiene avatar personalizado, usamos el predeterminado según género
        const path = userData.genero === 'F' ? 'defecto/avatar-f.webp' : 'defecto/avatar-m.webp'
        const { data } = supabase.storage.from('avatar').getPublicUrl(path)
        setAvatarUrl(data.publicUrl)
      }
    }
  }, [userData])
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validar tipo de archivo
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
    
    if (!allowedExts.includes(fileExt || '')) {
      setUploadError('Tipo de archivo no permitido. Use JPG, PNG o WEBP.')
      return
    }
    
    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande. Máximo 2MB.')
      return
    }
    
    try {
      setIsUploading(true)
      setUploadError(null)
      
      // Generar un nombre único con hash para el archivo
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      // Crear un hash único combinando ID del usuario y timestamp
      const timestamp = Date.now().toString(36) // Convertir timestamp a base36 para acortar
      const randomStr = Math.random().toString(36).substring(2, 8) // String aleatorio
      const fileHash = `${userData.auth_user_id}_${timestamp}_${randomStr}`
      const fileName = `${fileHash}.${fileExt}`
      const filePath = `usuarios/${fileName}`
      
      // Subir el archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) throw uploadError
      
      // Actualizar la tabla usuario_nomina con la nueva ruta del avatar
      const { error: updateError } = await supabase
        .from('usuario_nomina')
        .update({ avatar_path: filePath })
        .eq('auth_user_id', userData.auth_user_id)
      
      if (updateError) throw updateError
      
      // Obtener la URL pública del nuevo avatar
      const { data } = supabase.storage.from('avatar').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
      
      // Cerrar el modal de opciones de carga
      setShowUploadOptions(false)
    } catch (error) {
      console.error('Error al subir avatar:', error)
      setUploadError('Error al subir el avatar. Intente nuevamente.')
    } finally {
      setIsUploading(false)
    }
  }
  
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  if (!userData) return null

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="bg-primary/5 pb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-lg overflow-hidden cursor-pointer relative group" onClick={() => setIsModalOpen(true)}>
              <img 
                src={avatarUrl || ''} 
                alt="User avatar"
                className="h-full w-full object-cover border border-gray-200"
              />
              <div className="absolute bottom-1 right-1 bg-black/50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Search className="h-3 w-3 text-white" />
              </div>
            </div>
            
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <button 
                      className="p-1 rounded-full bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => setIsModalOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 right-4 z-10">
                    <button 
                      className="p-2 px-4 rounded-full bg-primary hover:bg-primary/90 text-white text-sm"
                      onClick={() => setShowUploadOptions(true)}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        'Modificar avatar'
                      )}
                    </button>
                  </div>
                  
                  {/* Modal de opciones de carga */}
                  {showUploadOptions && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium mb-4">Cambiar avatar</h3>
                        
                        {uploadError && (
                          <Alert className="mb-4 bg-red-50 border-red-200">
                            <AlertDescription className="text-red-600">{uploadError}</AlertDescription>
                          </Alert>
                        )}
                        
                        <div className="space-y-4">
                          <button
                            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            onClick={triggerFileInput}
                            disabled={isUploading}
                          >
                            <Upload className="h-5 w-5 text-gray-500" />
                            <span>Seleccionar imagen</span>
                          </button>
                          
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                          />
                          
                          <div className="text-xs text-gray-500">
                            Formatos permitidos: JPG, PNG, WEBP. Tamaño máximo: 2MB.
                          </div>
                          
                          <div className="flex justify-end gap-2 mt-4">
                            <button
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                              onClick={() => setShowUploadOptions(false)}
                              disabled={isUploading}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <img 
                    src={avatarUrl || ''} 
                    alt="User avatar"
                    className="w-full h-full max-h-[80vh] object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
            <div>
              <CardTitle className="text-2xl md:text-2xl font-bold text-sm">{userData?.colaborador}</CardTitle>
              <p className="text-muted-foreground text-sm">{userData?.cargo || "Sin cargo asignado"}</p>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 mt-2 text-sm">
            {userData?.empresas?.nombre || "Empresa no asignada"}
          </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto [&>*]:whitespace-normal [&>*]:">
            <TabsTrigger value="personal">Información Personal</TabsTrigger>
            <TabsTrigger value="laboral">Información Laboral</TabsTrigger>
            <TabsTrigger value="afiliaciones">Afiliaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cédula</p>
                  <p className="text-sm font-medium">{userData?.cedula || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Correo electrónico</p>
                  <p className="text-sm font-medium">{userData?.correo_electronico || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                  <p className="text-sm font-medium">{userData?.telefono || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Género</p>
                  <p className="text-sm font-medium">{userData?.genero || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                  <p className="text-sm font-medium">{userData?.fecha_nacimiento || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Edad</p>
                  <p className="text-sm font-medium">{userData?.edad || "No disponible"} años</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Droplet className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Grupo Sanguíneo (RH)</p>
                  <p className="text-sm font-medium">{userData?.rh || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dirección de Residencia</p>
                  <p className="text-sm font-medium">{userData?.direccion_residencia || "No disponible"}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="laboral" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cargo</p>
                  <p className="text-sm font-medium">{userData?.cargo || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Ingreso</p>
                  <p className="text-sm font-medium">{userData?.fecha_ingreso || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                  <p className="text-sm font-medium">{userData?.empresas?.nombre || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPinned className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sede</p>
                  <p className="text-sm font-medium">{userData?.sedes?.nombre || "No disponible"}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="afiliaciones" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">EPS</p>
                  <p className="text-sm font-medium">{userData?.eps?.nombre || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AFP</p>
                  <p className="text-sm font-medium">{userData?.afp?.nombre || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cesantías</p>
                  <p className="text-sm font-medium">{userData?.cesantias?.nombre || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Caja de Compensación</p>
                  <p className="text-sm font-medium">{userData?.caja_de_compensacion?.nombre || "No disponible"}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

