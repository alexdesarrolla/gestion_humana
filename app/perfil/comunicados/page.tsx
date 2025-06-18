"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createSupabaseClient } from "@/lib/supabase";
import { Search } from "lucide-react";

interface Comunicado {
  id: string;
  titulo: string;
  imagen_url: string | null;
  fecha_publicacion: string | null;
  area_responsable: string;
  estado: string;
  comunicados_empresas: {
    empresa_id: string;
    empresas: {
      nombre: string;
    };
  }[];
  comunicados_usuarios: {
    usuario_id: string;
    usuario_nomina: {
      colaborador: string;
    };
  }[];
  comunicados_cargos: {
    cargo_id: string;
    cargos: {
      nombre: string;
    };
  }[];
}

export default function ComunicadosPage() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [comunicadosFiltrados, setComunicadosFiltrados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnasPorFila, setColumnasPorFila] = useState("4");
  const [paginaActual, setPaginaActual] = useState(1);
  const comunicadosPorPagina = 8;

  // Mapeo de valores a clases Tailwind
  const gridColsMap: Record<string, string> = {
    "3": "lg:grid-cols-3",
    "4": "lg:grid-cols-4",
    "5": "lg:grid-cols-5",
    "6": "lg:grid-cols-6",
  };

  useEffect(() => {
    const fetchComunicados = async () => {
      const supabase = createSupabaseClient();

      // 1) Obtener el usuario actual
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error obteniendo usuario:", userError);
        setLoading(false);
        return;
      }

      // 2) Obtener empresa_id, id y cargo_id del usuario en "usuario_nomina"
      interface PerfilUsuario {
        empresa_id: string;
        id: string;
        cargo_id: string;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("usuario_nomina")
        .select("empresa_id, id, cargo_id")
        .eq("auth_user_id", user.id)
        .single<PerfilUsuario>();

      if (perfilError || !perfil) {
        console.error("No se pudo determinar la empresa del usuario:", perfilError);
        setLoading(false);
        return;
      }
      const empresaId = perfil.empresa_id;
      const usuarioId = perfil.id;
      const cargoId = perfil.cargo_id;

      // 3) Obtener todos los comunicados publicados
      const { data, error } = await supabase
        .from("comunicados")
        .select(`
          id,
          titulo,
          imagen_url,
          fecha_publicacion,
          area_responsable,
          estado,
          comunicados_empresas!left(empresa_id, empresas!inner(nombre)),
          comunicados_usuarios!left(usuario_id, usuario_nomina!inner(colaborador)),
          comunicados_cargos!left(cargo_id, cargos!inner(nombre))
        `)
        .eq("estado", "publicado")
        .order("fecha_publicacion", { ascending: false });

      if (error) {
        console.error("Error cargando comunicados:", error);
        setComunicados([]);
      } else {
        const lista = data.map((comunicado) => {
          return {
            id: comunicado.id as string,
            titulo: comunicado.titulo as string,
            imagen_url: comunicado.imagen_url as string | null,
            fecha_publicacion: comunicado.fecha_publicacion as string | null,
            area_responsable: comunicado.area_responsable as string,
            estado: comunicado.estado as string,
            comunicados_empresas: (comunicado.comunicados_empresas as unknown) as {
              empresa_id: string;
              empresas: {
                nombre: string;
              };
            }[],
            comunicados_usuarios: (comunicado.comunicados_usuarios as unknown) as {
              usuario_id: string;
              usuario_nomina: {
                colaborador: string;
              };
            }[],
            comunicados_cargos: (comunicado.comunicados_cargos as unknown) as {
              cargo_id: string;
              cargos: {
                nombre: string;
              };
            }[]
          };
        });

        // Filtrado por cargo y usuarios específicos
        const filtrados = lista.filter((comunicado) => {
          // 1. Verificar si está dirigido al cargo del usuario o no tiene cargo específico
          const tieneCargosEspec = comunicado.comunicados_cargos?.length! > 0;
          const dirigidoAlCargo = tieneCargosEspec 
            ? comunicado.comunicados_cargos?.some((item) => item.cargo_id === cargoId)
            : true; // Si no tiene cargos específicos, se muestra a todos
          
          if (!dirigidoAlCargo) return false;

          // 2. Si tiene usuarios específicos, verificar que incluya al usuario actual
          const tieneUsuariosEspec = comunicado.comunicados_usuarios?.length! > 0;
          if (tieneUsuariosEspec) {
            return comunicado.comunicados_usuarios?.some(
              (item) => item.usuario_id === usuarioId
            );
          }

          // 3. Si no tiene usuarios específicos, mostrar el comunicado
          return true;
        });

        setComunicados(filtrados);
        setComunicadosFiltrados(filtrados);
      }

      setLoading(false);
    };

    fetchComunicados();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Cargando comunicados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-[90%] mx-auto px-4 sm:px-6 md:px-8 space-y-6">
              {/* Cabecera y filtros */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Comunicados</h1>
                  <p className="text-muted-foreground">
                    Aquí encontrarás todos los comunicados dirigidos a tu cargo o dirigidos específicamente a ti.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Buscar comunicados..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => {
                        const termino = e.target.value.toLowerCase();
                        setSearchTerm(e.target.value);
                        const filt = comunicados.filter(
                          (c) =>
                            c.titulo.toLowerCase().includes(termino) ||
                            c.area_responsable.toLowerCase().includes(termino)
                        );
                        setComunicadosFiltrados(filt);
                        setPaginaActual(1);
                      }}
                    />
                  </div>
                  <Select
                    value={columnasPorFila}
                    onValueChange={(value) => setColumnasPorFila(value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Columnas por fila" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 columnas</SelectItem>
                      <SelectItem value="4">4 columnas</SelectItem>
                      <SelectItem value="5">5 columnas</SelectItem>
                      <SelectItem value="6">6 columnas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Grid de comunicados */}
              <div
                className={
                  `grid grid-cols-1 md:grid-cols-2 ` +
                  `${gridColsMap[columnasPorFila] || "lg:grid-cols-4"} gap-6`
                }
              >
                {comunicadosFiltrados.length > 0 ? (
                  comunicadosFiltrados
                    .slice(
                      (paginaActual - 1) * comunicadosPorPagina,
                      paginaActual * comunicadosPorPagina
                    )
                    .map((c) => (
                      <div key={c.id} className="bg-white shadow rounded-lg overflow-hidden">
                        <img
                          src={c.imagen_url || "/placeholder.webp"}
                          alt={c.titulo}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          <h2 className="text-lg font-semibold mb-2">{c.titulo}</h2>
                          <p className="text-gray-600 mb-1">
                            <span className="font-medium">Área:</span> {c.area_responsable}
                          </p>
                          <p className="text-gray-600 mb-1">
                            <span className="font-medium">Fecha:</span>{" "}
                            {c.fecha_publicacion
                              ? new Date(c.fecha_publicacion).toLocaleDateString()
                              : "-"}
                          </p>
                          <Button variant="outline" onClick={() => window.location.href = `/perfil/comunicados/${c.id}`}>Ver comunicado</Button>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 col-span-full">
                    No hay comunicados dirigidos a tu cargo o dirigidos específicamente a ti.
                  </p>
                )}

                {/* Paginación */}
                {comunicadosFiltrados.length > comunicadosPorPagina && (
                  <div className="col-span-full flex justify-center gap-2 mt-6">
                    {Array.from({
                      length: Math.ceil(comunicadosFiltrados.length / comunicadosPorPagina),
                    }).map((_, index) => (
                      <Button
                        key={index}
                        variant={paginaActual === index + 1 ? "default" : "outline"}
                        onClick={() => setPaginaActual(index + 1)}
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
