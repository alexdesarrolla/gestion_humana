"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { Heart, Plus, Edit, Trash2, Search } from "lucide-react";

interface Categoria {
  id: string;
  nombre: string;
  descripcion: string;
  activa: boolean;
  created_at: string;
  _count?: {
    publicaciones_bienestar: number;
  };
}

interface FormData {
  nombre: string;
  descripcion: string;
  activa: boolean;
}

export default function CategoriasBienestar() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    descripcion: "",
    activa: true,
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

      await fetchCategorias();
      setLoading(false);
    };

    checkAuth();
  }, []);

  const fetchCategorias = async () => {
    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("categorias_bienestar")
        .select(`
          *,
          publicaciones_bienestar(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Procesar los datos para incluir el conteo
      const categoriasConConteo = data?.map(categoria => ({
        ...categoria,
        _count: {
          publicaciones_bienestar: categoria.publicaciones_bienestar?.length || 0
        }
      })) || [];
      
      setCategorias(categoriasConConteo);
    } catch (error: any) {
      console.error("Error al cargar categorías:", error);
      setError("Error al cargar las categorías");
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      activa: true,
    });
    setEditingCategoria(null);
    setError(null);
    setSuccess(null);
  };

  const openDialog = (categoria?: Categoria) => {
    if (categoria) {
      setEditingCategoria(categoria);
      setFormData({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        activa: categoria.activa,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const supabase = createSupabaseClient();
      
      if (editingCategoria) {
        // Actualizar categoría existente
        const { error } = await supabase
          .from("categorias_bienestar")
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            activa: formData.activa,
          })
          .eq("id", editingCategoria.id);

        if (error) throw error;
        setSuccess("Categoría actualizada exitosamente");
      } else {
        // Crear nueva categoría
        const { error } = await supabase
          .from("categorias_bienestar")
          .insert({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            activa: formData.activa,
          });

        if (error) throw error;
        setSuccess("Categoría creada exitosamente");
      }

      await fetchCategorias();
      closeDialog();
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error("Error al guardar categoría:", error);
      setError("Error al guardar la categoría. Por favor, intente nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== "eliminar") {
      setError("Debe escribir 'eliminar' para confirmar");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const supabase = createSupabaseClient();
      
      // Verificar si la categoría tiene publicaciones
      const { data: publicaciones, error: checkError } = await supabase
        .from("publicaciones_bienestar")
        .select("id")
        .eq("categoria_id", id)
        .limit(1);

      if (checkError) throw checkError;
      
      if (publicaciones && publicaciones.length > 0) {
        setError("No se puede eliminar una categoría que tiene publicaciones asociadas");
        return;
      }

      const { error } = await supabase
        .from("categorias_bienestar")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchCategorias();
      setDeletingId(null);
      setDeleteConfirm("");
      setSuccess("Categoría eliminada exitosamente");
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error("Error al eliminar categoría:", error);
      setError("Error al eliminar la categoría. Por favor, intente nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const filteredCategorias = categorias.filter((categoria) =>
    categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categoria.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="py-6">
        <Card className="shadow-md">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6">
      <Card className="shadow-md">
        <CardHeader className="bg-primary/5 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-6 w-6 text-red-500" />
              Categorías de Bienestar
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open) {
                closeDialog();
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()} className="btn-custom">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Categoría
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategoria ? "Editar Categoría" : "Nueva Categoría"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCategoria 
                        ? "Modifique los datos de la categoría" 
                        : "Complete los datos para crear una nueva categoría"}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => handleInputChange("nombre", e.target.value)}
                        placeholder="Nombre de la categoría"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="descripcion">Descripción</Label>
                      <Textarea
                        id="descripcion"
                        value={formData.descripcion}
                        onChange={(e) => handleInputChange("descripcion", e.target.value)}
                        placeholder="Descripción de la categoría"
                        rows={3}
                      />
                    </div>
                    

                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="activa"
                        checked={formData.activa}
                        onChange={(e) => handleInputChange("activa", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="activa">Categoría activa</Label>
                    </div>
                  </div>
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                      {error}
                    </div>
                  )}
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving} className="btn-custom">
                      {saving ? "Guardando..." : editingCategoria ? "Actualizar" : "Crear"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Barra de búsqueda */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar categorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Mensajes */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Tabla de categorías */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Publicaciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {searchTerm ? "No se encontraron categorías" : "No hay categorías creadas"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategorias.map((categoria) => (
                    <TableRow key={categoria.id}>
                      <TableCell className="font-medium">{categoria.nombre}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {categoria.descripcion || "Sin descripción"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={categoria.activa ? "default" : "secondary"}>
                          {categoria.activa ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categoria._count?.publicaciones_bienestar || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(categoria)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Dialog open={deletingId === categoria.id} onOpenChange={(open) => {
                            if (!open) {
                              setDeletingId(null);
                              setDeleteConfirm("");
                              setError(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-600"
                                onClick={() => {
                                  setDeletingId(categoria.id);
                                  setDeleteConfirm("");
                                  setError(null);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirmar eliminación</DialogTitle>
                                <DialogDescription>
                                  ¿Está seguro de que desea eliminar la categoría "{categoria.nombre}"?
                                  Esta acción no se puede deshacer.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="confirm-delete">
                                    Escriba "eliminar" para confirmar:
                                  </Label>
                                  <Input
                                    id="confirm-delete"
                                    value={deleteConfirm}
                                    onChange={(e) => setDeleteConfirm(e.target.value)}
                                    placeholder="eliminar"
                                  />
                                </div>
                                {error && (
                                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                                    {error}
                                  </div>
                                )}
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setDeleteConfirm("");
                                    setError(null);
                                    setDeletingId(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDelete(categoria.id)}
                                  disabled={saving || deleteConfirm !== "eliminar"}
                                >
                                  {saving ? "Eliminando..." : "Eliminar"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}