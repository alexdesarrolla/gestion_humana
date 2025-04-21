"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, Upload, X, Image, Loader2 } from "lucide-react"

export default function NuevoComunicado() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<any[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [adjuntos, setAdjuntos] = useState<{name: string, url: string, size: number}[]>([])
  const [empresas, setEmpresas] = useState<any[]>([])
  
  // Referencias para los inputs de archivos
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    titulo: "",
    contenido: "",
    categoria_id: "",
    area_responsable: "Recursos Humanos",
    imagen_url: "",
    estado: "borrador",
    empresa_ids: [] // IDs de empresas seleccionadas
  })

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true)
      const supabase = createSupabaseClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push("/login")
        return
      }

      // Verificar si el usuario es administrador
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError || userData?.rol !== "administrador") {
        router.push("/perfil")
        return
      }

      // Cargar categorías
      const { data: categoriasData, error: categoriasError } = await supabase
        .from("categorias_comunicados")
        .select("*")
        .order("nombre", { ascending: true })

      if (categoriasError) {
        console.error("Error al cargar categorías:", categoriasError)
        setError("Error al cargar las categorías. Por favor, intente nuevamente.")
      } else {
        setCategorias(categoriasData || [])
      }

      // Cargar empresas
      const { data: empresasData, error: empresasError } = await supabase
        .from("empresas")
        .select("id, nombre")
        .order("nombre", { ascending: true })
      if (empresasError) {
        setError("Error al cargar las empresas. Por favor, intente nuevamente.")
      } else {
        setEmpresas(empresasData || [])
      }

      setLoading(false)
    }

    checkAuth()
  }, [])

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Manejar cambios en selects
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Manejar subida de imagen principal
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const fileExt = file.name.split(".").pop()?.toLowerCase()
    const allowedExts = ["jpg", "jpeg", "png", "webp"]

    if (!allowedExts.includes(fileExt || "")) {
      setError("Tipo de archivo no permitido. Use JPG, PNG o WEBP.")
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo es demasiado grande. Máximo 5MB.")
      return
    }

    try {
      setUploadingImage(true)
      setError(null)

      // Mostrar vista previa
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)

      // Crear un canvas para redimensionar la imagen manteniendo relación de aspecto 4:3
      const img = document.createElement('img')
      img.src = previewUrl
      await new Promise((resolve) => { img.onload = resolve })
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Establecer dimensiones con relación 4:3
      const targetWidth = 800
      const targetHeight = 600 // 4:3 ratio
      
      // Calcular dimensiones para recortar manteniendo relación 4:3
      let sourceX = 0
      let sourceY = 0
      let sourceWidth = img.width
      let sourceHeight = img.height
      
      const imgRatio = img.width / img.height
      const targetRatio = targetWidth / targetHeight
      
      if (imgRatio > targetRatio) {
        // Imagen más ancha que 4:3, recortar los lados
        sourceWidth = img.height * targetRatio
        sourceX = (img.width - sourceWidth) / 2
      } else {
        // Imagen más alta que 4:3, recortar arriba y abajo
        sourceHeight = img.width / targetRatio
        sourceY = (img.height - sourceHeight) / 2
      }
      
      canvas.width = targetWidth
      canvas.height = targetHeight
      
      if (ctx) {
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(
          img, 
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, targetWidth, targetHeight
        )
      }
      
      // Convertir a webp con 85% de calidad
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.85)
      })
      
      if (!blob) throw new Error('Error al convertir la imagen')
      
      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 8)
      const fileName = `comunicado_${timestamp}_${randomString}.webp`
      const filePath = `comunicados/${fileName}`

      // Convertir el blob a File para subirlo
      const webpFile = new File([blob], fileName, { type: 'image/webp' })
      
      // Subir el archivo procesado a Supabase Storage
      const supabase = createSupabaseClient()
      const { error: uploadError, data } = await supabase.storage
        .from("comunicados")
        .upload(filePath, webpFile, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from("comunicados")
        .getPublicUrl(filePath)

      // Actualizar estado del formulario con la URL de la imagen
      setFormData(prev => ({ ...prev, imagen_url: urlData.publicUrl }))
      
    } catch (error: any) {
      console.error("Error al subir imagen:", error)
      setError("Error al subir la imagen: " + (error.message || "Intente nuevamente"))
    } finally {
      setUploadingImage(false)
    }
  }

  // Manejar subida de archivos adjuntos
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setUploadingFiles(true)
      setError(null)

      const supabase = createSupabaseClient()
      const newAdjuntos = [...adjuntos]

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validar tamaño (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError(`El archivo ${file.name} es demasiado grande. Máximo 10MB.`)
          continue
        }

        // Generar nombre único para el archivo
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 8)
        const fileName = `adjunto_${timestamp}_${randomString}_${file.name}`
        const filePath = `comunicados/adjuntos/${fileName}`

        // Subir archivo
        const { error: uploadError, data } = await supabase.storage
          .from("comunicados")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          console.error(`Error al subir ${file.name}:`, uploadError)
          continue
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from("comunicados")
          .getPublicUrl(filePath)

        // Añadir a la lista de adjuntos
        newAdjuntos.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size
        })
      }

      setAdjuntos(newAdjuntos)
    } catch (error: any) {
      console.error("Error al subir archivos:", error)
      setError("Error al subir archivos: " + (error.message || "Intente nuevamente"))
    } finally {
      setUploadingFiles(false)
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Eliminar archivo adjunto
  const handleRemoveFile = (index: number) => {
    const newAdjuntos = [...adjuntos]
    newAdjuntos.splice(index, 1)
    setAdjuntos(newAdjuntos)
  }

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  // Guardar comunicado
  const handleSubmit = async (e: React.FormEvent, publicar: boolean = false) => {
    e.preventDefault()
    
    // Validaciones
    if (!formData.titulo.trim()) {
      setError("El título es obligatorio")
      return
    }
    
    if (!formData.contenido.trim()) {
      setError("El contenido es obligatorio")
      return
    }
    
    if (!formData.categoria_id) {
      setError("Debe seleccionar una categoría")
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      const supabase = createSupabaseClient()
      
      // Obtener ID del usuario actual
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error("No se pudo obtener la sesión del usuario")
      }
      
      // Preparar datos para guardar
      const comunicadoData = {
        ...formData,
        estado: publicar ? "publicado" : "borrador",
        autor_id: session.user.id,
        archivos_adjuntos: adjuntos.length > 0 ? JSON.stringify(adjuntos) : null,
        empresa_ids: formData.empresa_ids && formData.empresa_ids.length > 0 ? JSON.stringify(formData.empresa_ids) : null
      }
      
      // Insertar en la base de datos
      const { data, error: insertError } = await supabase
        .from("comunicados")
        .insert(comunicadoData)
        .select()
      
      if (insertError) throw insertError
      
      setSuccess(publicar ? 
        "¡Comunicado publicado exitosamente!" : 
        "Comunicado guardado como borrador")
      
      // Redireccionar después de 2 segundos
      setTimeout(() => {
        router.push("/administracion/comunicados")
      }, 2000)
      
    } catch (error: any) {
      console.error("Error al guardar comunicado:", error)
      setError("Error al guardar: " + (error.message || "Intente nuevamente"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="max-w-[90%] mx-auto flex-1 p-8 md:pl-64">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-2xl font-bold">Nuevo Comunicado</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => router.push('/administracion/comunicados')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {error && (
              <Alert className="mb-6 bg-red-50 text-red-800 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 md:pt-8">
              {/* Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column (Title & Content) */}
                <div className="md:col-span-2 flex flex-col space-y-6">
                  {/* Título */}
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título del Comunicado</Label>
                    <Input
                      id="titulo"
                      name="titulo"
                      value={formData.titulo}
                      onChange={handleChange}
                      placeholder="Ingrese el título del comunicado"
                      required
                    />
                  </div>

                  {/* Contenido - Make it grow */}
                  <div className="space-y-2 flex flex-col flex-grow">
                    <Label htmlFor="contenido">Contenido</Label>
                    <Textarea
                      id="contenido"
                      name="contenido"
                      value={formData.contenido}
                      onChange={handleChange}
                      placeholder="Ingrese el contenido del comunicado"
                      className="min-h-[200px] flex-grow" // Added flex-grow
                      required
                    />
                  </div>
                </div>

                {/* Right Column (Image, Category, Area, Attachments) */}
                <div className="md:col-span-1 space-y-6">
                  {/* Botones de acción */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 md:pt-8">
                    <Button
                      type="submit" // Handles draft save via form onSubmit -> handleSubmit(e, false)
                      disabled={saving || uploadingImage || uploadingFiles}
                      className="flex-1"
                    >
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Guardar Borrador
                    </Button>
                    <Button
                      type="button"
                      disabled={saving || uploadingImage || uploadingFiles || !formData.imagen_url}
                      onClick={(e) => handleSubmit(e, true)} // Handles publish -> handleSubmit(e, true)
                      variant="default"
                      className="flex-1"
                    >
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Publicar Comunicado
                    </Button>
                  </div>

                  {/* Estado (Mostrar solo si se está editando, aquí es nuevo, así que no se muestra) */}
                  {/* No mostrar estado en la página de nuevo comunicado */}

                  {/* Imagen principal */}
                  <div className="space-y-2">
                    <Label htmlFor="imagen">Imagen principal (Relación 4:3)</Label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors">
                      {imagePreview ? (
                        <div className="relative w-full max-w-md">
                          <img 
                            src={imagePreview} 
                            alt="Vista previa" 
                            className="rounded-lg w-full h-auto object-cover aspect-[4/3] shadow-md" 
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 rounded-full h-8 w-8"
                            onClick={() => {
                              setImagePreview(null)
                              setFormData(prev => ({ ...prev, imagen_url: "" }))
                              if (imageInputRef.current) {
                                imageInputRef.current.value = ""
                              }
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="p-4 bg-primary/10 rounded-full">
                            <Image className="h-8 w-8 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium mb-1">Arrastra y suelta o haz clic para subir</p>
                            <p className="text-xs text-gray-500">JPG, PNG o WEBP (máx. 5MB)</p>
                          </div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => imageInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="mt-2"
                          >
                            {uploadingImage ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Subiendo...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Seleccionar imagen
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      <input
                        ref={imageInputRef}
                        type="file"
                        id="imagen"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </div>
                  </div>

                  {/* Categoría */}
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoría</Label>
                    <Select
                      value={formData.categoria_id}
                      onValueChange={(value) => handleSelectChange("categoria_id", value)}
                    >
                      <SelectTrigger id="categoria">
                        <SelectValue placeholder="Seleccione una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Área responsable */}
                  <div className="space-y-2">
                    <Label htmlFor="area">Área responsable</Label>
                    <Select
                      value={formData.area_responsable}
                      onValueChange={(value) => handleSelectChange("area_responsable", value)}
                    >
                      <SelectTrigger id="area">
                        <SelectValue placeholder="Seleccione un área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                        <SelectItem value="Dirección General">Dirección General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Empresas (Selección múltiple) */}
                  <div className="space-y-2">
                    <Label htmlFor="empresas">Empresas</Label>
                    <div className="max-h-[200px] w-full overflow-y-auto max-h-60 border rounded bg-white shadow-sm p-2">
                      {empresas.length > 0 ? (
                        <>
                          <Input
                            type="text"
                            placeholder="Buscar empresa..."
                            className="mb-2"
                            onChange={e => {
                              // Opcional: implementar búsqueda local si se desea
                            }}
                          />
                          <div>
                            {empresas.map((empresa) => (
                              <label key={empresa.id} className="flex items-center gap-2 py-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={formData.empresa_ids.includes(empresa.id)}
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    setFormData(prev => ({
                                      ...prev,
                                      empresa_ids: checked
                                        ? [...prev.empresa_ids, empresa.id]
                                        : prev.empresa_ids.filter((id: string) => id !== empresa.id)
                                    }));
                                  }}
                                />
                                <span className="truncate" title={empresa.nombre}>{empresa.nombre}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500 text-sm">No hay empresas disponibles</span>
                      )}
                    </div>
                  </div>

                  {/* Archivos adjuntos */}
                  <div className="space-y-2">
                    <Label htmlFor="adjuntos">Archivos adjuntos (opcional)</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFiles}
                          className="w-full md:w-auto"
                        >
                          {uploadingFiles ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Subiendo archivos...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Seleccionar archivos
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-gray-500">Máximo 10MB por archivo</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="adjuntos"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingFiles}
                      />
                      
                      {/* Lista de archivos adjuntos */}
                      {adjuntos.length > 0 && (
                        <div className="mt-4 border rounded-lg divide-y">
                          {adjuntos.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3">
                              <div className="flex-1 truncate">
                                <p className="font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleRemoveFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
