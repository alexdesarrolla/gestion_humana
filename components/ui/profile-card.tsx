"use client"

import type React from "react"

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
  Upload,
  Loader2,
  Camera,
  Search,
} from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { createSupabaseClient } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

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
        const { data } = supabase.storage.from("avatar").getPublicUrl(userData.avatar_path)
        setAvatarUrl(data.publicUrl)
      } else if (userData.genero) {
        // Si no tiene avatar personalizado, usamos el predeterminado según género
        const path = userData.genero === "F" ? "defecto/avatar-f.webp" : "defecto/avatar-m.webp"
        const { data } = supabase.storage.from("avatar").getPublicUrl(path)
        setAvatarUrl(data.publicUrl)
      }
    }
  }, [userData])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const fileExt = file.name.split(".").pop()?.toLowerCase()
    const allowedExts = ["jpg", "jpeg", "png", "webp"]

    if (!allowedExts.includes(fileExt || "")) {
      setUploadError("Tipo de archivo no permitido. Use JPG, PNG o WEBP.")
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("El archivo es demasiado grande. Máximo 5MB.")
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)

      // Obtener la ruta actual del avatar desde la base de datos ANTES de hacer cambios
      const { data: currentUser, error: fetchError } = await supabase
        .from("usuario_nomina")
        .select("avatar_path")
        .eq("auth_user_id", userData.auth_user_id)
        .single()

      if (fetchError) {
        console.error("Error al obtener datos del usuario:", fetchError)
        setUploadError("Error al obtener información del usuario.")
        return
      }

      const oldAvatarPath = currentUser?.avatar_path as string | undefined

      // Crear un canvas para redimensionar la imagen a exactamente 600px de ancho manteniendo relación de aspecto
      const img = document.createElement('img')
      img.src = URL.createObjectURL(file)
      await new Promise((resolve) => { img.onload = resolve })
      
      const canvas = document.createElement('canvas')
      const targetWidth = 600
      const scale = targetWidth / img.width
      canvas.width = targetWidth
      canvas.height = Math.round(img.height * scale)
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      
      // Convertir a webp con 85% de calidad.
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.85)
      })
      
      if (!blob) throw new Error('Error al convertir la imagen')
      
      // Generar un nombre único con hash para el archivo
      const fileHash = `${userData.auth_user_id}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
      const fileName = `${fileHash}.webp`
      const filePath = `usuarios/${fileName}`

      // Convertir el blob a File para subirlo
      const webpFile = new File([blob], fileName, { type: 'image/webp' })
      
      // Subir el archivo procesado (webp) a Supabase Storage
      const { error: uploadError } = await supabase.storage.from("avatar").upload(filePath, webpFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        console.error("Error al subir avatar:", uploadError)
        setUploadError("Error al subir el avatar. Intente nuevamente.")
        return
      }

      // Actualizar la tabla usuario_nomina con la nueva ruta del avatar
      const { error: updateError } = await supabase
        .from("usuario_nomina")
        .update({ avatar_path: filePath })
        .eq("auth_user_id", userData.auth_user_id)

      if (updateError) throw updateError

      // AHORA eliminar la imagen anterior del storage (después de que todo sea exitoso)
      if (oldAvatarPath && oldAvatarPath !== filePath) {
        const { error: deleteError } = await supabase.storage
          .from("avatar")
          .remove([oldAvatarPath])
        
        if (deleteError) {
          console.warn("Error al eliminar avatar anterior:", deleteError, "Ruta:", oldAvatarPath)
        } else {
          console.log("Avatar anterior eliminado exitosamente:", oldAvatarPath)
        }
      }

      // Obtener la URL pública del nuevo avatar
      const { data } = supabase.storage.from("avatar").getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)

      // Cerrar el modal de opciones de carga
      setShowUploadOptions(false)
      setIsModalOpen(false) // Cerrar el modal principal también
    } catch (error) {
      console.error("Error al subir avatar:", error)
      setUploadError("Error al subir el avatar. Intente nuevamente.")
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setShowUploadOptions(false)
  }

  if (!userData) return null

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="bg-primary/5 pb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div
                className="h-20 w-20 rounded-full overflow-hidden cursor-pointer border-2 border-white shadow-md"
                onClick={() => setIsModalOpen(true)}
              >
                <img src={avatarUrl || undefined} alt="User avatar" className="h-full w-full object-cover" />
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => setIsModalOpen(true)}
              >
                <Search className="h-5 w-5 text-white" />
              </div>
            </div>

            {isModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
                <div
                  className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-semibold">Vista previa</h2>
                    <button className="rounded-full p-1 hover:bg-gray-200 transition-colors" onClick={closeModal}>
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-6 flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className="h-40 w-40 rounded-full overflow-hidden border-4 border-white shadow-lg">
                        <img src={avatarUrl || undefined} alt="User avatar" className="h-full w-full object-cover" />
                      </div>
                    </div>

                    <Button
                      className="flex items-center gap-2"
                      onClick={() => setShowUploadOptions(true)}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4" />
                          <span>Cambiar imagen</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de opciones de carga */}
            {showUploadOptions && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Cambiar avatar</h3>
                    <button
                      className="rounded-full p-1 hover:bg-gray-100"
                      onClick={() => setShowUploadOptions(false)}
                      disabled={isUploading}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {uploadError && (
                    <Alert className="mb-4 bg-red-50 border-red-200">
                      <AlertDescription className="text-red-600">{uploadError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <button
                      className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      onClick={triggerFileInput}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5 text-primary" />
                      )}
                      <span>{isUploading ? "Subiendo..." : "Seleccionar imagen"}</span>
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                    />

                    <div className="text-xs text-gray-500">
                      Formatos permitidos: JPG, PNG, WEBP. Tamaño máximo: 5MB.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <CardTitle className="text-2xl md:text-2xl font-bold text-sm">{userData?.colaborador}</CardTitle>
              <p className="text-muted-foreground text-sm">{userData?.cargos?.nombre || "Sin cargo asignado"}</p>
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
                  <p className="text-sm font-medium">{userData?.cargos?.nombre || "No disponible"}</p>
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