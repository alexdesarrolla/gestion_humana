"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Trash2, Eye, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function Comunicados() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [comunicados, setComunicados] = useState<any[]>([])
  const [filteredComunicados, setFilteredComunicados] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Estado para el modal de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteComunicadoId, setDeleteComunicadoId] = useState<string | null>(null)
  const [deleteInput, setDeleteInput] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Función para abrir el modal de confirmación
  const openDeleteDialog = (comunicadoId: string) => {
    setDeleteComunicadoId(comunicadoId)
    setDeleteInput("")
    setDeleteDialogOpen(true)
  }

  // Función para eliminar comunicado con confirmación
  const confirmDeleteComunicado = async () => {
    if (deleteInput.trim().toLowerCase() !== "eliminar") {
      setError("Debe escribir 'eliminar' para confirmar.")
      return
    }
    setDeleteLoading(true)
    setError(null)
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase
        .from('comunicados')
        .delete()
        .eq('id', deleteComunicadoId)
      if (error) {
        setError('Error al eliminar el comunicado. Por favor, intente nuevamente.')
      } else {
        setComunicados(prev => prev.filter(c => c.id !== deleteComunicadoId))
        setFilteredComunicados(prev => prev.filter(c => c.id !== deleteComunicadoId))
        setSuccess('Comunicado eliminado correctamente.')
        setDeleteDialogOpen(false)
      }
    } catch (e: any) {
      setError('Error al eliminar el comunicado. Por favor, intente nuevamente.')
    } finally {
      setDeleteLoading(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
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
      } else {
        setCategorias(categoriasData || [])
      }

      // Cargar comunicados
      const { data: comunicadosData, error: comunicadosError } = await supabase
        .from("comunicados")
        .select(`
          *,
          categorias_comunicados:categoria_id(nombre),
          usuario_nomina:autor_id(colaborador)
        `)
        .order("fecha_publicacion", { ascending: false })

      if (comunicadosError) {
        console.error("Error al cargar comunicados:", comunicadosError)
      } else {
        setComunicados(comunicadosData || [])
        setFilteredComunicados(comunicadosData || [])
      }

      setLoading(false)
    }

    checkAuth()
  }, [])

  // Función para ordenar comunicados
  const requestSort = (key: string) => {
    let direction = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction: direction as "asc" | "desc" });
  };

  // Aplicar ordenamiento
  useEffect(() => {
    if (!sortConfig) return;

    const sortedData = [...filteredComunicados].sort((a, b) => {
      if (sortConfig.key === "categoria") {
        // Ordenar por nombre de categoría
        const aValue = a.categorias_comunicados?.nombre || "";
        const bValue = b.categorias_comunicados?.nombre || "";
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else if (sortConfig.key === "autor") {
        // Ordenar por nombre de autor
        const aValue = a.usuario_nomina?.colaborador || "";
        const bValue = b.usuario_nomina?.colaborador || "";
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else if (sortConfig.key === "fecha") {
        // Ordenar por fecha
        const aValue = new Date(a.fecha_publicacion).getTime();
        const bValue = new Date(b.fecha_publicacion).getTime();
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      } else {
        // Ordenar por otros campos
        const aValue = a[sortConfig.key] || "";
        const bValue = b[sortConfig.key] || "";
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
    });

    setFilteredComunicados(sortedData);
  }, [sortConfig]);

  // Función para filtrar comunicados
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setSearchLoading(true);

    // Cancelar búsqueda anterior si existe
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Debounce para evitar muchas búsquedas seguidas
    searchTimeout.current = setTimeout(() => {
      filterComunicados(value, selectedCategoria);
      setSearchLoading(false);
    }, 300);
  };

  // Función para filtrar por categoría
  const handleCategoriaChange = (value: string) => {
    setSelectedCategoria(value);
    filterComunicados(searchTerm, value);
  };

  // Aplicar filtros
  const filterComunicados = (search: string, categoria: string) => {
    let filtered = [...comunicados];

    // Filtrar por término de búsqueda
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.titulo.toLowerCase().includes(searchLower) ||
          item.contenido.toLowerCase().includes(searchLower) ||
          (item.usuario_nomina?.colaborador || "").toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por categoría
    if (categoria && categoria !== "all") {
      filtered = filtered.filter((item) => item.categoria_id === categoria);
    }

    setFilteredComunicados(filtered);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="max-w-[90%] mx-auto flex-1 p-8 md:pl-64">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-2xl font-bold">Comunicados Internos</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={() => router.push('/administracion/comunicados/nuevo')} 
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Añadir nuevo
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/administracion/comunicados/categorias')} 
                  className="flex items-center gap-2"
                >
                  Gestionar categorías
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar comunicados..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Select
                value={selectedCategoria}
                onValueChange={handleCategoriaChange}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredComunicados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron comunicados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">
                        <div 
                          className="flex items-center cursor-pointer" 
                          onClick={() => requestSort('titulo')}
                        >
                          Título
                          {sortConfig?.key === 'titulo' && (
                            sortConfig.direction === 'asc' ? 
                              <ChevronUp className="ml-1 h-4 w-4" /> : 
                              <ChevronDown className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>
                        <div 
                          className="flex items-center cursor-pointer" 
                          onClick={() => requestSort('categoria')}
                        >
                          Categoría
                          {sortConfig?.key === 'categoria' && (
                            sortConfig.direction === 'asc' ? 
                              <ChevronUp className="ml-1 h-4 w-4" /> : 
                              <ChevronDown className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>
                        <div 
                          className="flex items-center cursor-pointer" 
                          onClick={() => requestSort('fecha')}
                        >
                          Fecha
                          {sortConfig?.key === 'fecha' && (
                            sortConfig.direction === 'asc' ? 
                              <ChevronUp className="ml-1 h-4 w-4" /> : 
                              <ChevronDown className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>
                        <div 
                          className="flex items-center cursor-pointer" 
                          onClick={() => requestSort('autor')}
                        >
                          Autor/Área
                          {sortConfig?.key === 'autor' && (
                            sortConfig.direction === 'asc' ? 
                              <ChevronUp className="ml-1 h-4 w-4" /> : 
                              <ChevronDown className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>
                        <div 
                          className="flex items-center cursor-pointer" 
                          onClick={() => requestSort('estado')}
                        >
                          Estado
                          {sortConfig?.key === 'estado' && (
                            sortConfig.direction === 'asc' ? 
                              <ChevronUp className="ml-1 h-4 w-4" /> : 
                              <ChevronDown className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComunicados.map((comunicado) => (
                      <TableRow key={comunicado.id}>
                        <TableCell className="font-medium">{comunicado.titulo}</TableCell>
                        <TableCell>
                          {comunicado.categorias_comunicados?.nombre || "Sin categoría"}
                        </TableCell>
                        <TableCell>{formatDate(comunicado.fecha_publicacion)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{comunicado.usuario_nomina?.colaborador || ""}</span>
                            <span className="text-xs text-gray-500">{comunicado.area_responsable}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={comunicado.estado === "publicado" ? "default" : 
                                   comunicado.estado === "borrador" ? "outline" : "secondary"}
                          >
                            {comunicado.estado === "publicado" ? "Publicado" : 
                             comunicado.estado === "borrador" ? "Borrador" : "Archivado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/administracion/comunicados/${comunicado.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/administracion/comunicados/editar/${comunicado.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openDeleteDialog(comunicado.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {/* Modal de confirmación de eliminación */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar eliminación</DialogTitle>
                  <DialogDescription>
                    ¿Está seguro de que desea eliminar este comunicado? Esta acción no se puede deshacer.<br />
                    Para confirmar, escriba <span className="font-bold">eliminar</span> en el campo de abajo.
                  </DialogDescription>
                </DialogHeader>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 mt-4"
                  placeholder="Escriba 'eliminar' para confirmar"
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  disabled={deleteLoading}
                />
                {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
                <DialogFooter className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>Cancelar</Button>
                  <Button variant="destructive" onClick={confirmDeleteComunicado} disabled={deleteInput.trim().toLowerCase() !== "eliminar" || deleteLoading}>
                    {deleteLoading ? "Eliminando..." : "Eliminar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}