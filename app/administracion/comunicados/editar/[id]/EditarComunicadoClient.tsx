"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, Upload, X, ImageIcon, Loader2 } from "lucide-react"

export default function EditarComunicadoClient() {
  const router = useRouter()
  const params = useParams()
  const comunicadoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<any[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [adjuntos, setAdjuntos] = useState<{ name: string; url: string; size: number }[]>([])

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

      // Cargar datos del comunicado
      await loadComunicado(comunicadoId)
    }

    checkAuth()
  }, [comunicadoId, router])

  // Cargar datos del comunicado
  const loadComunicado = async (id: string) => {
    try {
      const supabase = createSupabaseClient()

      const { data, error } = await supabase
        .from("comunicados")
        .select(`
          *,
          categorias_comunicados:categoria_id(nombre),
          usuario_nomina:autor_id(colaborador)
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      if (!data) {
        setError("No se encontró el comunicado solicitado")
        return
      }

      // Establecer datos del formulario
      setFormData({
        titulo: data.titulo,
        contenido: data.contenido,
        categoria_id: data.categoria_id,
        area_responsable: data.area_responsable,
        imagen_url: data.imagen_url || "",
        estado: data.estado,
      })

      // Establecer imagen de vista previa si existe
      if (data.imagen_url) {
        setImagePreview(data.imagen_url)
      }

      // Establecer archivos adjuntos si existen
      if (data.archivos_adjuntos) {
        try {
          const adjuntosData = JSON.parse(data.archivos_adjuntos)
          setAdjuntos(adjuntosData)
        } catch (e) {
          console.error("Error al parsear archivos adjuntos:", e)
        }
      }
    } catch (error: any) {
      console.error("Error al cargar comunicado:", error)
      setError("Error al cargar el comunicado: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Manejar cambios en selects
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
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
      const img = document.createElement("img")
      img.src = previewUrl
      await new Promise((resolve) => {
        img.onload = resolve
      })

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

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
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight)
      }

      // Convertir a webp con 85% de calidad
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/webp", 0.85)
      })

      if (!blob) throw new Error("Error al convertir la imagen")

      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 8)
      const fileName = `comunicado_${timestamp}_${randomString}.webp`
      const filePath = `comunicados/${fileName}`

      // Convertir el blob a File para subirlo
      const webpFile = new File([blob], fileName, { type: "image/webp" })

      // Subir el archivo procesado a Supabase Storage
      const supabase = createSupabaseClient()
      const { error: uploadError, data } = await supabase.storage.from("comunicados").upload(filePath, webpFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: urlData } = supabase.storage.from("comunicados").getPublicUrl(filePath)

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Error al obtener la URL pública de la imagen")
      }

      // Actualizar estado del formulario con la URL de la imagen
      setFormData((prev) => ({ ...prev, imagen_url: urlData.publicUrl }))
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
        const { error: uploadError, data } = await supabase.storage.from("comunicados").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

        if (uploadError) {
          console.error(`Error al subir ${file.name}:`, uploadError)
          continue
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage.from("comunicados").getPublicUrl(filePath)

        // Añadir a la lista de adjuntos
        newAdjuntos.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
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

  // Actualizar comunicado
  const handleSubmit = async (e: React.FormEvent, publicar = false) => {
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

      // Preparar datos para actualizar
      const comunicadoData = {
        ...formData,
        estado: publicar ? "publicado" : formData.estado,
        archivos_adjuntos: adjuntos.length > 0 ? JSON.stringify(adjuntos) : null,
        updated_at: new Date().toISOString(),
      }

      // Actualizar en la base de datos
      const { data, error: updateError } = await supabase
        .from("comunicados")
        .update(comunicadoData)
        .eq("id", comunicadoId)
        .select()

      if (updateError) throw updateError

      setSuccess(publicar ? "¡Comunicado publicado exitosamente!" : "Comunicado actualizado correctamente")

      // Redireccionar después de 2 segundos
      setTimeout(() => {
        router.push("/administracion/comunicados")
      }, 2000)
    } catch (error: any) {
      console.error("Error al actualizar comunicado:", error)
      setError("Error al actualizar: " + (error.message || "Intente nuevamente"))
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
              <CardTitle className="text-2xl font-bold">Editar Comunicado</CardTitle>
              <Button
                variant="outline"
                onClick={() => router.push("/administracion/comunicados")}
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

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
                {/* Estado actual */}
                <div className="mb-6">
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium 
                    bg-opacity-10 border
                    ${
                      formData.estado === "publicado"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : formData.estado === "borrador"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                    }`}
                  >
                    Estado actual:{" "}
                    {formData.estado === "publicado"
                      ? "Publicado"
                      : formData.estado === "borrador"
                        ? "Borrador"
                        : "Archivado"}
                  </div>
                </div>

                {/* Imagen principal */}
                <div className="space-y-2 mb-6">
                  <Label htmlFor="imagen">Imagen principal (Relación 4:3)</Label>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors">
                    {imagePreview ? (
                      <div className="relative w-full max-w-md">
                        <img
                          src={imagePreview || "/placeholder.svg"}
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
                            setFormData((prev) => ({ ...prev, imagen_url: "" }))
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
                          <ImageIcon className="h-8 w-8 text-primary" />
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

                {/* Título */}
                <div className="space-y-2 mb-6">
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

                {/* Categoría */}
                <div className="space-y-2 mb-6">
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
                <div className="space-y-2 mb-6">
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

                {/* Contenido */}
                <div className="space-y-2 mb-6">
                  <Label htmlFor="contenido">Contenido</Label>
                  <Textarea
                    id="contenido"
                    name="contenido"
                    value={formData.contenido}
                    onChange={handleChange}
                    placeholder="Ingrese el contenido del comunicado"
                    className="min-h-[200px]"
                    required
                  />
                </div>

                {/* Archivos adjuntos */}
                <div className="space-y-2 mb-6">
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
                              onClick={() => handleRemoveFile(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 justify-end">
                  <Button type="submit" variant="outline" disabled={saving}>
                    Guardar cambios
                  </Button>
                  {formData.estado !== "publicado" && (
                    <Button type="button" onClick={(e) => handleSubmit(e, true)} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Publicando...
                        </>
                      ) : (
                        "Publicar comunicado"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
