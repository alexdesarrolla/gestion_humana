"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Scale, Upload, X } from "lucide-react";
import Image from "next/image";
import { ImageUpload } from "@/components/ui/image-upload";

export default function EditarPublicacionNormatividad() {
  const router = useRouter();
  const params = useParams();
  const publicacionId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    titulo: "",
    contenido: "",
    imagen_principal: null as File | null,
    imagen_principal_url: "",
    galeria_imagenes: [] as File[],
    galeria_imagenes_urls: [] as string[],
    destacado: false,
    estado: "borrador",
  });

  const [imagenPrincipalPreview, setImagenPrincipalPreview] = useState<
    string | null
  >(null);
  const [galeriaPreview, setGaleriaPreview] = useState<string[]>([]);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        router.push("/");
        return;
      }

      // Verificar rol
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single();

      if (userError || userData?.rol !== "administrador") {
        router.push("/perfil");
        return;
      }



      // Cargar datos de la publicación
      const { data: publicacionData, error: publicacionError } = await supabase
        .from("publicaciones_bienestar")
        .select("*")
        .eq("id", publicacionId)
        .eq("tipo_seccion", "normatividad")
        .single();

      if (publicacionError || !publicacionData) {
        setError("No se pudo cargar la publicación.");
        setLoading(false);
        return;
      }

      // Establecer datos del formulario
      setFormData({
        titulo: (publicacionData.titulo as string) || "",
        contenido: (publicacionData.contenido as string) || "",
        imagen_principal: null,
        imagen_principal_url: (publicacionData.imagen_principal as string) || "",
        galeria_imagenes: [],
        galeria_imagenes_urls: (publicacionData.galeria_imagenes as string[]) || [],
        destacado: (publicacionData.destacado as boolean) || false,
        estado: (publicacionData.estado as string) || "borrador",
      });

      // Establecer previews
      if (publicacionData.imagen_principal) {
        setImagenPrincipalPreview(publicacionData.imagen_principal as string);
      }
      if (publicacionData.galeria_imagenes) {
        setGaleriaPreview(publicacionData.galeria_imagenes as string[]);
      }

      setLoading(false);
    };

    if (publicacionId) {
      checkAuthAndLoadData();
    }
  }, [publicacionId]);

  const handleImagenPrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, imagen_principal: file });
      const reader = new FileReader();
      reader.onload = () => setImagenPrincipalPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGaleriaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setFormData({
        ...formData,
        galeria_imagenes: [...formData.galeria_imagenes, ...files],
      });

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setGaleriaPreview((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImagenPrincipal = () => {
    setFormData({ ...formData, imagen_principal: null, imagen_principal_url: "" });
    setImagenPrincipalPreview(null);
  };

  const removeGaleriaImage = (index: number) => {
    // Si es una imagen existente (URL)
    if (index < formData.galeria_imagenes_urls.length) {
      const newUrls = formData.galeria_imagenes_urls.filter((_, i) => i !== index);
      setFormData({ ...formData, galeria_imagenes_urls: newUrls });
    } else {
      // Si es una imagen nueva (File)
      const fileIndex = index - formData.galeria_imagenes_urls.length;
      const newFiles = formData.galeria_imagenes.filter((_, i) => i !== fileIndex);
      setFormData({ ...formData, galeria_imagenes: newFiles });
    }
    
    const newPreview = galeriaPreview.filter((_, i) => i !== index);
    setGaleriaPreview(newPreview);
  };

  const uploadImage = async (file: File, folder: string) => {
    const supabase = createSupabaseClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from("bienestar")
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("bienestar").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!formData.titulo.trim()) {
      setError("El título es requerido.");
      return;
    }

    if (!formData.contenido.trim()) {
      setError("El contenido es requerido.");
      return;
    }



    setSaving(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Sesión expirada. Por favor, inicie sesión nuevamente.");
        return;
      }

      let imagenPrincipalUrl = formData.imagen_principal_url;
      let galeriaUrls = [...formData.galeria_imagenes_urls];

      // Subir nueva imagen principal si existe
      if (formData.imagen_principal) {
        imagenPrincipalUrl = await uploadImage(
          formData.imagen_principal,
          "normatividad/principales"
        );
      }

      // Subir nuevas imágenes de galería
      if (formData.galeria_imagenes.length > 0) {
        const uploadPromises = formData.galeria_imagenes.map((file) =>
          uploadImage(file, "normatividad/galeria")
        );
        const newUrls = await Promise.all(uploadPromises);
        galeriaUrls = [...galeriaUrls, ...newUrls];
      }

      // Actualizar la publicación
      const publicacionData = {
        titulo: formData.titulo.trim(),
        contenido: formData.contenido.trim(),
        imagen_principal: imagenPrincipalUrl || null,
        galeria_imagenes: galeriaUrls.length > 0 ? galeriaUrls : null,
        destacado: formData.destacado,
        estado: isDraft ? "borrador" : "publicado",
        updated_at: new Date().toISOString(),
        tipo_seccion: "normatividad",
      };

      const { data, error } = await supabase
        .from("publicaciones_bienestar")
        .update(publicacionData)
        .eq("id", publicacionId)
        .eq("tipo_seccion", "normatividad")
        .select()
        .single();

      if (error) {
        console.error('Error al actualizar la publicación:', error);
        setError(`Error al actualizar la publicación: ${error.message}`);
      } else {
        setSuccess(
          `Publicación ${isDraft ? "guardada como borrador" : "actualizada"} correctamente.`
        );
        setTimeout(() => {
          router.push("/administracion/normatividad");
        }, 2000);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      setError(`Error al actualizar la publicación: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 flex min-h-screen">
        <div className="w-full mx-auto flex-1">
          <Card className="shadow-md">
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/administracion/normatividad")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Scale className="h-6 w-6 text-blue-500" />
                Editar Publicación de Normatividad
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <form className="space-y-6">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Título *
                </label>
                <Input
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  placeholder="Título de la publicación"
                  disabled={saving}
                />
              </div>



              {/* Estado */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Estado
                </label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) =>
                    setFormData({ ...formData, estado: value })
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="publicado">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Imagen Principal */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Imagen Principal
                </label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("imagen-principal")?.click()
                      }
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {imagenPrincipalPreview ? "Cambiar imagen" : "Seleccionar imagen"}
                    </Button>
                    <input
                      id="imagen-principal"
                      type="file"
                      accept="image/*"
                      onChange={handleImagenPrincipalChange}
                      className="hidden"
                      disabled={saving}
                    />
                  </div>
                  {imagenPrincipalPreview && (
                    <div className="relative inline-block">
                      <Image
                        src={imagenPrincipalPreview}
                        alt="Vista previa"
                        width={200}
                        height={150}
                        className="rounded-lg object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={removeImagenPrincipal}
                        disabled={saving}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Contenido */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Contenido *
                </label>
                <Textarea
                  value={formData.contenido}
                  onChange={(e) =>
                    setFormData({ ...formData, contenido: e.target.value })
                  }
                  placeholder="Contenido de la publicación"
                  disabled={saving}
                  rows={10}
                />
              </div>

              {/* Galería de Imágenes */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Galería de Imágenes
                </label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("galeria-imagenes")?.click()
                      }
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Agregar imágenes
                    </Button>
                    <input
                      id="galeria-imagenes"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGaleriaChange}
                      className="hidden"
                      disabled={saving}
                    />
                  </div>
                  {galeriaPreview.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {galeriaPreview.map((preview, index) => (
                        <div key={index} className="relative">
                          <Image
                            src={preview}
                            alt={`Galería ${index + 1}`}
                            width={150}
                            height={100}
                            className="rounded-lg object-cover w-full h-24"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => removeGaleriaImage(index)}
                            disabled={saving}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Destacado */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="destacado"
                  checked={formData.destacado}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, destacado: checked as boolean })
                  }
                  disabled={saving}
                />
                <label
                  htmlFor="destacado"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Marcar como destacado
                </label>
              </div>

              {/* Mensajes de error y éxito */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {success}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? "Guardando..." : "Guardar como borrador"}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={saving}
                  className="flex-1 btn-custom"
                >
                  {saving ? "Actualizando..." : "Actualizar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}