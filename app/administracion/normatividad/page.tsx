"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  Settings,
  Scale,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Image from "next/image";

export default function Normatividad() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  const [filteredPublicaciones, setFilteredPublicaciones] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("all");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePublicacionId, setDeletePublicacionId] = useState<string>("");
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openDeleteDialog = (publicacionId: string) => {
    if (publicacionId) {
      setDeletePublicacionId(publicacionId);
      setDeleteInput("");
      setDeleteDialogOpen(true);
    }
  };

  const confirmDeletePublicacion = async () => {
    if (deleteInput.trim().toLowerCase() !== "eliminar") {
      setError("Debe escribir 'eliminar' para confirmar.");
      return;
    }
    setDeleteLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseClient();
      if (!deletePublicacionId) {
        setError("ID de la publicación no válido");
        return;
      }

      const { error } = await supabase
        .from("publicaciones_bienestar")
        .delete()
        .eq("id", deletePublicacionId);

      if (error) {
        setError(
          "Error al eliminar la publicación. Por favor, intente nuevamente."
        );
      } else {
        setPublicaciones((prev) => prev.filter((p) => p.id !== deletePublicacionId));
        setFilteredPublicaciones((prev) =>
          prev.filter((p) => p.id !== deletePublicacionId)
        );
        setSuccess("Publicación eliminada correctamente.");
        setDeleteDialogOpen(false);
      }
    } catch {
      setError("Error al eliminar la publicación. Por favor, intente nuevamente.");
    } finally {
      setDeleteLoading(false);
    }
  };

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

      // Cargar publicaciones
      const { data: publicacionesData, error: publicacionesError } = await supabase
        .from("publicaciones_bienestar")
        .select("*")
        .eq("tipo_seccion", "normatividad")
        .order("created_at", { ascending: false });

      if (!publicacionesError) {
        setPublicaciones(publicacionesData || []);
        setFilteredPublicaciones(publicacionesData || []);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  // Función de búsqueda y filtrado
  const applyFilters = () => {
    let filtered = [...publicaciones];

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (pub) =>
          pub.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pub.contenido.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pub.autor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }



    // Filtro por estado
    if (selectedEstado && selectedEstado !== "all") {
      filtered = filtered.filter((pub) => pub.estado === selectedEstado);
    }

    // Aplicar ordenamiento
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Manejar casos especiales para fechas
        if (sortConfig.key === "created_at") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredPublicaciones(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedEstado, sortConfig, publicaciones]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedEstado("all");
    setSortConfig(null);
  };

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Scale className="h-6 w-6 text-blue-500" />
                Gestión de Normatividad
              </CardTitle>
              <Button
                onClick={() => router.push("/administracion/normatividad/nuevo")}
                className="btn-custom flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Nueva publicación
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar publicaciones..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>

            {/* Tabla de publicaciones */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("titulo")}>
                      <div className="flex items-center gap-1">
                        Título
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                      <div className="flex items-center gap-1">
                        Fecha
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("autor")}>
                      <div className="flex items-center gap-1">
                        Autor
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("vistas")}>
                      <div className="flex items-center gap-1">
                        Vistas
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Skeleton loader para las filas
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-[200px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-[80px] rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[60px]" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredPublicaciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No se encontraron publicaciones
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPublicaciones.map((publicacion) => (
                      <TableRow key={publicacion.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{publicacion.titulo}</span>
                            {publicacion.destacado && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(publicacion.created_at)}</TableCell>
                        <TableCell>{publicacion.autor}</TableCell>
                        <TableCell>
                          <Badge
                            variant={publicacion.estado === "publicado" ? "default" : "secondary"}
                          >
                            {publicacion.estado === "publicado" ? "Publicado" : "Borrador"}
                          </Badge>
                        </TableCell>
                        <TableCell>{publicacion.vistas || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/administracion/normatividad/${publicacion.id}`)}
                              title="Ver publicación"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/administracion/normatividad/editar/${publicacion.id}`)}
                              title="Editar publicación"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openDeleteDialog(publicacion.id)}
                              title="Eliminar publicación"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Información de resultados */}
            {!loading && (
              <div className="text-sm text-gray-600">
                Mostrando {filteredPublicaciones.length} de {publicaciones.length} publicaciones
              </div>
            )}

            {/* Modal de confirmación de eliminación */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar eliminación</DialogTitle>
                  <DialogDescription>
                    ¿Está seguro de que desea eliminar esta publicación? Esta
                    acción no se puede deshacer.
                    <br />
                    Para confirmar, escriba{" "}
                    <span className="font-bold">eliminar</span> en el campo de
                    abajo.
                  </DialogDescription>
                </DialogHeader>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 mt-4"
                  placeholder="Escriba 'eliminar' para confirmar"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  disabled={deleteLoading}
                />
                {error && (
                  <div className="text-red-600 text-sm mt-2">{error}</div>
                )}
                <DialogFooter className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={deleteLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDeletePublicacion}
                    disabled={
                      deleteInput.trim().toLowerCase() !== "eliminar" ||
                      deleteLoading
                    }
                  >
                    {deleteLoading ? "Eliminando..." : "Eliminar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Mensajes de éxito y error */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}