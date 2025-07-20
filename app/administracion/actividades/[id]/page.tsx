"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  User,
  Eye,
  Star,
  Edit,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DetallePublicacionBienestarPage() {
  const router = useRouter();
  const params = useParams();
  const publicacionId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [publicacion, setPublicacion] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError || !session) {
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

      // Cargar publicación
      const { data: publicacionData, error: publicacionError } = await supabase
        .from("publicaciones_bienestar")
        .select(`
          *,
          categorias_bienestar:categoria_id(nombre, tipo_seccion),
          usuario_nomina:autor_id(colaborador)
        `)
        .eq("id", publicacionId)
        .single();

      if (publicacionError || !publicacionData) {
        setError("No se pudo cargar la actividad.");
        setLoading(false);
        return;
      }

      // Verificar que la publicación pertenece a la sección de actividades
      if (publicacionData.categorias_bienestar?.tipo_seccion !== "actividades") {
        router.push("/administracion/actividades");
        return;
      }

      setPublicacion(publicacionData);

      // Incrementar contador de vistas
      await supabase
        .from("publicaciones_bienestar")
        .update({ vistas: (publicacionData.vistas || 0) + 1 })
        .eq("id", publicacionId);

      setLoading(false);
    };

    if (publicacionId) {
      checkAuthAndLoadData();
    }
  }, [publicacionId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="py-6 flex min-h-screen">
        <div className="w-full mx-auto flex-1">
          <Card className="shadow-md">
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 animate-pulse">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !publicacion) {
    return (
      <div className="py-6 flex min-h-screen">
        <div className="w-full mx-auto flex-1">
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">
                  {error || "No se pudo cargar la actividad."}
                </p>
                <Button
                  onClick={() => router.push("/administracion/actividades")}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a actividades
                </Button>
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
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/administracion/actividades")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/administracion/actividades/editar/${publicacion.id}`
                  )
                }
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <CardTitle className="text-3xl font-bold flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-blue-500" />
                  {publicacion.titulo}
                  {publicacion.destacado && (
                    <Star className="h-6 w-6 text-yellow-500 fill-current" />
                  )}
                </CardTitle>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <Badge variant="secondary">
                    {publicacion.categorias_bienestar?.nombre || "Sin categoría"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(publicacion.fecha_publicacion)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{publicacion.usuario_nomina?.colaborador || "Autor desconocido"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{(publicacion.vistas || 0) + 1} vistas</span>
                </div>
                <Badge
                  variant={
                    publicacion.estado === "publicado"
                      ? "default"
                      : publicacion.estado === "borrador"
                      ? "outline"
                      : "secondary"
                  }
                >
                  {publicacion.estado === "publicado"
                    ? "Publicado"
                    : publicacion.estado === "borrador"
                    ? "Borrador"
                    : "Archivado"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Imagen principal */}
              {publicacion.imagen_principal && (
                <div className="w-full">
                  <img
                    src={publicacion.imagen_principal}
                    alt={publicacion.titulo}
                    className="w-full h-64 md:h-96 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedImage(publicacion.imagen_principal)}
                  />
                </div>
              )}

              {/* Contenido */}
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {publicacion.contenido}
                </div>
              </div>

              {/* Galería de imágenes */}
              {publicacion.galeria_imagenes && publicacion.galeria_imagenes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Galería de imágenes</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {publicacion.galeria_imagenes.map((imagen: string, index: number) => (
                      <div key={index} className="relative group">
                        <img
                          src={imagen}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(imagen)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal para vista previa de imágenes */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Vista previa</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-0">
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Vista previa"
                  className="w-full h-auto max-h-[70vh] object-contain rounded"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}