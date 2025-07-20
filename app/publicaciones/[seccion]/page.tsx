'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Publicacion {
  id: number;
  titulo: string;
  contenido: string;
  imagen_principal?: string;
  galeria_imagenes?: string[];
  fecha_publicacion: string;
  estado: string;
  seccion: string;
  autor_id: number;
  autor?: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

const sectionConfig = {
  bienestar: {
    title: 'Blog de Bienestar',
    color: 'emerald',
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    hoverColor: 'hover:text-emerald-700',
    icon: '💚'
  },
  actividades: {
    title: 'Cronograma de Actividades',
    color: 'amber',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    hoverColor: 'hover:text-amber-700',
    icon: '🎯'
  },
  sst: {
    title: 'Seguridad y Salud en el Trabajo',
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    hoverColor: 'hover:text-red-700',
    icon: '🛡️'
  },
  normatividad: {
    title: 'Blog de Normatividad',
    color: 'purple',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600',
    hoverColor: 'hover:text-purple-700',
    icon: '📋'
  }
};

export default function PublicacionesSeccion() {
  const params = useParams();
  const seccion = params.seccion as string;
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  const config = sectionConfig[seccion as keyof typeof sectionConfig];

  useEffect(() => {
    if (seccion && config) {
      fetchPublicaciones();
    }
  }, [seccion, currentPage]);

  const fetchPublicaciones = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/publicaciones?seccion=${seccion}&page=${currentPage}&limit=${itemsPerPage}`);
      if (response.ok) {
        const data = await response.json();
        setPublicaciones(data.publicaciones || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      }
    } catch (error) {
      console.error('Error fetching publicaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `Hace ${diffInWeeks} semana${diffInWeeks > 1 ? 's' : ''}`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `Hace ${diffInMonths} mes${diffInMonths > 1 ? 'es' : ''}`;
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sección no encontrada</h1>
          <p className="text-gray-600 mb-6">La sección solicitada no existe.</p>
          <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <span className={`inline-block ${config.bgColor} text-white px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wide mr-3`}>
                {seccion.toUpperCase()}
              </span>
              <span className="text-4xl">{config.icon}</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{config.title}</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explora todas las publicaciones de {config.title.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <a href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
                Inicio
              </a>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">{config.title}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Publications Grid */}
            {publicaciones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {publicaciones.map((publicacion) => (
                  <article key={publicacion.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <div className="h-48 overflow-hidden">
                      {publicacion.imagen_principal ? (
                        <img 
                          src={publicacion.imagen_principal} 
                          alt={publicacion.titulo}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className={`w-full h-full bg-${config.color}-100 flex items-center justify-center`}>
                          <span className={`${config.textColor} text-6xl`}>{config.icon}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg line-clamp-2">
                        {publicacion.titulo}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                        {publicacion.contenido.replace(/<[^>]*>/g, '').substring(0, 150)}...
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(publicacion.fecha_publicacion)}
                        </span>
                        <a 
                          href={`/publicacion/${publicacion.id}`}
                          className={`text-sm ${config.textColor} ${config.hoverColor} font-medium hover:underline`}
                        >
                          Leer más →
                        </a>
                      </div>
                      {publicacion.autor && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            Por {publicacion.autor.nombre} {publicacion.autor.apellido}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">{config.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay publicaciones disponibles
                </h3>
                <p className="text-gray-600 mb-6">
                  Aún no se han publicado contenidos en esta sección.
                </p>
                <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                  ← Volver al inicio
                </a>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === page
                        ? `${config.bgColor} text-white`
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}