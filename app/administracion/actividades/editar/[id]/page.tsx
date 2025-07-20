"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calendar, X } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

export default function EditarPublicacionBienestar() {
  const router = useRouter();
  const params = useParams();
  const publicacionId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  const [formData, setFormData] = useState({
    titulo: "",
    contenido: "",
    imagen_principal: "",
    galeria_imagenes: [] as string[],
    destacado: false,
    estado: "borrador",
  });

  useEffect(() => {
    const checkAuth = async () => {
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

      setUserId(session.user.id);

      // Cargar publicación
      const { data: publicacionData, error: publicacionError } = await supabase
        .from("publicaciones_bienestar")
        .select("*")
        .eq("id", publicacionId)
        .single();

      if (!publicacionError && publicacionData) {
        const pub = publicacionData;

        setFormData({
          titulo: pub.titulo || "",
          contenido: pub.contenido || "",
          imagen_principal: pub.imagen_principal || "",
          galeria_imagenes: pub.galeria_imagenes || [],
          destacado: pub.destacado || false,
          estado: pub.estado || "borrador",
        });
      } else {
        setError("No se pudo cargar la actividad.");
      }

      setLoading(false);
    };

    if (publicacionId) {
      checkAuth();
    }
  }, [publicacionId]);

  const handleImageUpload = (url: string, isMain: boolean = false) => {
    if (isMain) {
      setFormData({ ...formData, imagen_principal: url });
    } else {
      setFormData({
        ...formData,
        galeria_imagenes: [...formData.galeria_imagenes, url],
      });
    }
  };

  const removeGalleryImage = (index: number) => {
    const newGallery = formData.galeria_imagenes.filter((_, i) => i !== index);
    setFormData({ ...formData, galeria_imagenes: newGallery });
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

      const updateData = {
        titulo: formData.titulo.trim(),
        contenido: formData.contenido.trim(),
        categoria_id: null,
        imagen_principal: formData.imagen_principal || null,
        galeria_imagenes: formData.galeria_imagenes.length > 0 ? formData.galeria_imagenes : null,
        destacado: formData.destacado,
        estado: isDraft ? "borrador" : "publicado",
        updated_at: new Date().toISOString(),
        tipo_seccion: "actividades",
      };

      const { error } = await supabase
        .from("publicaciones_bienestar")
        .update(updateData)
        .eq("id", publicacionId);

      if (error) {
        setError("Error al actualizar la actividad. Por favor, intente nuevamente.");
      } else {
        setSuccess(
          `Actividad ${isDraft ? "guardada como borrador" : "publicada"} correctamente.`
        );
        setTimeout(() => {
          router.push("/administracion/actividades");
        }, 2000);
      }
    } catch {
      setError("Error al actualizar la actividad. Por favor, intente nuevamente.");
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
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 animate-pulse">
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
                onClick={() => router.push("/administracion/actividades")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6 text-blue-500" />
                Editar Actividad
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(false);
              }}
              className="space-y-6"
            >
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
                  placeholder="Título de la actividad"
                  disabled={saving}
                  required
                />
              </div>



              {/* Imagen principal */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Imagen principal
                </label>
                <ImageUpload
                  bucket="bienestar"
                  onChange={(url) => handleImageUpload(url, true)}
                  value={formData.imagen_principal}
                />
                {formData.imagen_principal && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={formData.imagen_principal}
                      alt="Imagen principal"
                      className="w-32 h-32 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() =>
                        setFormData({ ...formData, imagen_principal: "" })
                      }
                      disabled={saving}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
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
                  placeholder="Contenido de la actividad"
                  disabled={saving}
                  rows={8}
                  required
                />
              </div>

              {/* Galería de imágenes */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Galería de imágenes
                </label>
                <ImageUpload
                  bucket="bienestar"
                  onChange={(url) => handleImageUpload(url, false)}
                />
                {formData.galeria_imagenes.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.galeria_imagenes.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => removeGalleryImage(index)}
                          disabled={saving}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Estado y Destacado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <SelectItem value="archivado">Archivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 mt-6">
                  <Checkbox
                    id="destacado"
                    checked={formData.destacado}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, destacado: !!checked })
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
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
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
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-custom"
                >
                  {saving ? "Actualizando..." : "Actualizar actividad"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}