'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Eye, User } from 'lucide-react'

interface Publicacion {
  id: number
  titulo: string
  contenido: string
  imagen_principal?: string
  fecha_publicacion: string
  vistas: number
  tipo_seccion: string
  estado: string
  galeria_imagenes?: string[]
}

interface Usuario {
  colaborador: string
  cargo_nombre?: string
}

export default function PublicacionDetalle() {
  const params = useParams()
  const router = useRouter()
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null)
  const [autor, setAutor] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Hace unos segundos'
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`
    if (diffInSeconds < 31536000) return `Hace ${Math.floor(diffInSeconds / 2592000)} meses`
    return `Hace ${Math.floor(diffInSeconds / 31536000)} años`
  }

  const getSectionColor = (tipo: string) => {
    switch (tipo) {
      case 'bienestar':
        return 'bg-emerald-100 text-emerald-700'
      case 'actividades':
        return 'bg-amber-100 text-amber-700'
      case 'sst':
        return 'bg-red-100 text-red-700'
      case 'normatividad':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getSectionName = (tipo: string) => {
    switch (tipo) {
      case 'bienestar':
        return 'Bienestar'
      case 'actividades':
        return 'Actividades'
      case 'sst':
        return 'SST'
      case 'normatividad':
        return 'Normatividad'
      default:
        return 'General'
    }
  }

  useEffect(() => {
    const fetchPublicacion = async () => {
      try {
        setLoading(true)
        const supabase = createSupabaseClient()
        
        // Obtener la publicación
        const { data: publicacionData, error: publicacionError } = await supabase
          .from('publicaciones_bienestar')
          .select('*')
          .eq('id', params.id as string)
          .eq('estado', 'publicado')
          .single()

        if (publicacionError) {
          throw new Error('Publicación no encontrada')
        }

        setPublicacion(publicacionData as unknown as Publicacion)

        // Incrementar las vistas
        await supabase
          .from('publicaciones_bienestar')
          .update({ vistas: ((publicacionData.vistas as number) || 0) + 1 })
          .eq('id', params.id as string)

        // Obtener información del autor si existe autor_id
        if (publicacionData.autor_id) {
          const { data: autorData } = await supabase
            .from('usuario_nomina')
            .select('colaborador')
            .eq('auth_user_id', publicacionData.autor_id)
            .single()

          if (autorData) {
            setAutor({
              colaborador: autorData.colaborador as string,
              cargo_nombre: undefined
            })
          }
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la publicación')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPublicacion()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="h-64 bg-gray-200 rounded mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !publicacion) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Publicación no encontrada</h1>
            <p className="text-gray-600 mb-6">{error || 'La publicación que buscas no existe o ha sido eliminada.'}</p>
            <Button onClick={() => router.push('/')}>Ir al inicio</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Botón de volver */}
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        {/* Contenido principal */}
        <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Imagen principal */}
          {publicacion.imagen_principal && (
            <div className="w-full h-64 md:h-80 lg:h-96 overflow-hidden">
              <img
                src={publicacion.imagen_principal}
                alt={publicacion.titulo}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Contenido */}
          <div className="p-8">
            {/* Metadatos */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSectionColor(publicacion.tipo_seccion)}`}>
                {getSectionName(publicacion.tipo_seccion)}
              </span>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                {formatTimeAgo(publicacion.fecha_publicacion)}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Eye className="w-4 h-4 mr-1" />
                {publicacion.vistas || 0} vistas
              </div>
              {autor && (
                <div className="flex items-center text-sm text-gray-500">
                  <User className="w-4 h-4 mr-1" />
                  {autor.colaborador}
                  {autor.cargo_nombre && (
                    <span className="ml-1">• {autor.cargo_nombre}</span>
                  )}
                </div>
              )}
            </div>

            {/* Título */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
              {publicacion.titulo}
            </h1>

            {/* Contenido */}
            <div 
              className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: publicacion.contenido }}
            />

            {/* Image Gallery */}
            {publicacion.galeria_imagenes && publicacion.galeria_imagenes.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Galería de imágenes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publicacion.galeria_imagenes.map((imagen, index) => (
                    <div 
                      key={index} 
                      className="relative aspect-square overflow-hidden rounded-lg cursor-pointer"
                      onClick={() => setSelectedImage(imagen)}
                    >
                      <img
                        src={imagen}
                        alt={`Imagen ${index + 1} de la galería`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Modal */}
            {selectedImage && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
                onClick={() => setSelectedImage(null)}
              >
                <div 
                  className="relative max-w-4xl max-h-[90vh] w-full"
                  onClick={e => e.stopPropagation()}
                >
                  <img
                    src={selectedImage}
                    alt="Imagen ampliada"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <button
                    className="absolute top-4 right-4 text-white hover:text-gray-300"
                    onClick={() => setSelectedImage(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

          </div>
        </article>

        {/* Botón de acción adicional */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            size="lg"
          >
            Ver más publicaciones
          </Button>
        </div>
      </div>
    </div>
  )
}
