"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, Heart, Star, Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PublicacionDetalle {
  id: string;
  titulo: string;
  contenido: string;
  imagen_principal: string | null;
  galeria_imagenes: string[];
  fecha_publicacion: string | null;
  autor_id: string;
  categoria_id: string;
  destacado: boolean;
  vistas: number;
  estado: string;
  categorias_bienestar: {
    nombre: string;
    color: string;
  } | null;
  usuario_nomina: {
    colaborador: string;
  } | null;
}

export default function DetallePublicacionBienestarPage() {
  const params = useParams();
  const router = useRouter();
  const publicacionId = params.id as string;
  const [publicacion, setPublicacion] = useState<PublicacionDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Formatear la fecha de publicación
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Fecha no disponible";
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("es-ES", options);
  };

  // Obtener las iniciales del autor para el avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Funciones para el modal de imagen
  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  useEffect(() => {
    const fetchPublicacion = async () => {
      setLoading(true);
      setError(null);
      
      const supabase = createSupabaseClient();
      
      // Verificar autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Debe iniciar sesión para ver esta publicación");
        setLoading(false);
        return;
      }

      // Verificar que el usuario es administrador
      const { data: userData } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single();

      if (!userData || userData.rol !== "administrador") {
        setError("No tiene permisos para ver esta publicación");
        setLoading(false);
        return;
      }

      // Primero verificar si la tabla categorias_bienestar existe
      const { data: testCategoria } = await supabase
        .from("categorias_bienestar")
        .select("*")
        .limit(1);
      
      console.log("Test categorias_bienestar:", testCategoria);

      // Obtener la publicación
      const { data, error: fetchError } = await supabase
        .from("publicaciones_bienestar")
        .select(`
          id,
          titulo,
          contenido,
          imagen_principal,
          galeria_imagenes,
          fecha_publicacion,
          autor_id,
          categoria_id,
          destacado,
          vistas,
          estado
        `)
        .eq("id", publicacionId)
        .single();
        
      // Si la consulta principal es exitosa, obtener datos relacionados por separado
      let categoriaData = null;
      let autorData = null;
      
      if (data && !fetchError) {
        // Obtener categoría por separado
        if (data.categoria_id) {
          const { data: categoria } = await supabase
            .from("categorias_bienestar")
            .select("nombre, color")
            .eq("id", data.categoria_id)
            .single();
          categoriaData = categoria;
        }
        
        // Obtener autor por separado
        if (data.autor_id) {
          const { data: autor } = await supabase
            .from("usuario_nomina")
            .select("colaborador")
            .eq("auth_user_id", data.autor_id)
            .single();
          autorData = autor;
        }
      }

      if (fetchError) {
        console.error("Error al cargar publicación:", fetchError);
        setError(`No se pudo cargar la publicación: ${fetchError.message}`);
        setPublicacion(null);
      } else if (!data) {
        setError("Publicación no encontrada");
        setPublicacion(null);
      } else {
        // Incrementar contador de vistas
        await supabase
          .from("publicaciones_bienestar")
          .update({ vistas: (data.vistas || 0) + 1 })
          .eq("id", publicacionId);

        // Para pruebas, agregar imágenes de ejemplo si no hay galería
        const galeriaImagenes = data.galeria_imagenes && data.galeria_imagenes.length > 0 
          ? data.galeria_imagenes 
          : [
              'https://picsum.photos/800/600?random=1',
              'https://picsum.photos/800/600?random=2',
              'https://picsum.photos/800/600?random=3'
            ];
        
        setPublicacion({
          id: data.id,
          titulo: data.titulo,
          contenido: data.contenido,
          imagen_principal: data.imagen_principal,
          galeria_imagenes: galeriaImagenes,
          fecha_publicacion: data.fecha_publicacion,
          autor_id: data.autor_id,
          categoria_id: data.categoria_id,
          destacado: data.destacado,
          vistas: (data.vistas || 0) + 1,
          estado: data.estado,
          categorias_bienestar: categoriaData,
          usuario_nomina: autorData,
        });
      }
      
      setLoading(false);
    };

    if (publicacionId) {
      fetchPublicacion();
    }
  }, [publicacionId]);



  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando publicación...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!publicacion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Publicación no encontrada</h2>
            <p className="text-gray-600 mb-4">La publicación que busca no existe o ha sido eliminada.</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header con botón de volver */}
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">{publicacion.vistas} vistas</span>
        </div>
      </div>

      {/* Contenido principal */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {publicacion.destacado && (
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                )}
                <CardTitle className="text-2xl font-bold text-gray-800">
                  {publicacion.titulo}
                </CardTitle>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(publicacion.fecha_publicacion)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{publicacion.usuario_nomina?.colaborador || "Autor desconocido"}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {publicacion.categorias_bienestar && (
                <Badge 
                  style={{ backgroundColor: publicacion.categorias_bienestar.color }}
                  className="text-white"
                >
                  <Heart className="h-3 w-3 mr-1" />
                  {publicacion.categorias_bienestar.nombre}
                </Badge>
              )}
              
              <Badge variant={publicacion.estado === "publicado" ? "default" : "secondary"}>
                {publicacion.estado === "publicado" ? "Publicado" : "Borrador"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Imagen principal */}
          {publicacion.imagen_principal && (
            <div className="w-full">
              <img
                src={publicacion.imagen_principal}
                alt={publicacion.titulo}
                className="w-full h-64 md:h-80 object-cover rounded-lg border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Contenido */}
          <div className="prose max-w-none">
            <div 
              className="text-gray-700 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: publicacion.contenido.replace(/\n/g, '<br>') }}
            />
          </div>
          
          {/* Galería de imágenes */}
          {publicacion.galeria_imagenes && publicacion.galeria_imagenes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Galería de Imágenes
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {publicacion.galeria_imagenes.map((img, index) => (
                  <div
                    key={index}
                    className="cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
                    onClick={() => openImageModal(img)}
                  >
                    <img
                      src={img}
                      alt={`Imagen de la galería ${index + 1}`}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Modal for image preview */}
              {selectedImage && (
                <Dialog open={!!selectedImage} onOpenChange={() => closeImageModal()}>
                  <DialogContent className="max-w-3xl max-h-[90vh]">
                    <img 
                      src={selectedImage} 
                      alt="Imagen ampliada" 
                      className="w-full h-[90vh] rounded-lg"
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => closeImageModal()}>
          <DialogContent className="max-w-3xl">
            <img src={selectedImage} alt="Imagen ampliada" className="w-full h-auto rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}