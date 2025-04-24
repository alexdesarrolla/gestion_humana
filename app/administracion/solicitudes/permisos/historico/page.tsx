'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminSidebar } from "@/components/ui/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SolicitudPermiso = {
  id: string;
  usuario_id: string;
  tipo_permiso: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_solicitud: string | null;
  estado: string;
  fecha_resolucion: string | null;
  pdf_url: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  usuario?: {
    colaborador: string;
    cedula: string;
  };
};

export default function AdminPermisosHistorico() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<SolicitudPermiso[]>([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<SolicitudPermiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const supabase = createSupabaseClient();

        // 1) Traer solicitudes
        const { data: solData, error: solError } = await supabase
          .from("solicitudes_permisos")
          .select(`
            id, usuario_id, tipo_permiso, fecha_inicio, fecha_fin, fecha_solicitud,
            estado, fecha_resolucion, pdf_url, hora_inicio, hora_fin
          `)
          .order("fecha_solicitud", { ascending: false });
        if (solError) throw solError;
        if (!solData || solData.length === 0) {
          setSolicitudes([]);
          setFilteredSolicitudes([]);
          return;
        }

        // 2) Traer datos de los colaboradores
        const userIds = Array.from(new Set(solData.map(s => s.usuario_id)));
        const { data: usersData, error: usersError } = await supabase
          .from("usuario_nomina")
          .select("auth_user_id, colaborador, cedula")
          .in("auth_user_id", userIds);
        if (usersError) throw usersError;

        // 3) Combinar
        const combined = solData.map(s => {
          const usuario = usersData?.find(u => u.auth_user_id === s.usuario_id);
          return { ...s, usuario: usuario ? { colaborador: usuario.colaborador, cedula: usuario.cedula } : undefined };
        });

        setSolicitudes(combined);
        setFilteredSolicitudes(combined);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error al cargar el histórico");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // aplicar filtros
  useEffect(() => {
    let result = solicitudes;
    if (searchTerm) {
      const lc = searchTerm.toLowerCase();
      result = result.filter(
        s =>
          s.usuario?.colaborador.toLowerCase().includes(lc) ||
          s.usuario?.cedula.includes(lc)
      );
    }
    if (selectedEstado !== "all") {
      result = result.filter(s => s.estado === selectedEstado);
    }
    setFilteredSolicitudes(result);
  }, [searchTerm, selectedEstado, solicitudes]);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "N/A";

  const formatTime = (t: string | null) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    return h && m ? `${h}:${m}` : t;
  };

  const humanType = (t: string) => {
    switch (t) {
      case "no_remunerado": return "No remunerado";
      case "remunerado": return "Remunerado";
      case "actividad_interna": return "Actividad interna";
      default: return t;
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedEstado("all");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 py-6">
          <div className="max-w-[90%] mx-auto space-y-6">
            {/* Título */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Histórico - Solicitudes de Permisos</h1>
                <p className="text-muted-foreground">
                  Consulta y filtra el historial de permisos laborales.
                </p>
              </div>
              <Button onClick={() => router.push('/administracion/solicitudes/permisos')}>Ir a Permisos Pendientes</Button>
            </div>

            {/* Filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                  {/* Buscar */}
                  <div className="flex-1 min-w-[220px]">
                    <Label htmlFor="search" className="mb-1 block text-sm">
                      Buscar
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        id="search"
                        placeholder="Por nombre o cédula..."
                        className="pl-8 h-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          aria-label="Limpiar búsqueda"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Estado */}
                  <div className="min-w-[150px]">
                    <Label htmlFor="estado" className="mb-1 block text-sm">
                      Estado
                    </Label>
                    <Select
                      id="estado"
                      value={selectedEstado}
                      onValueChange={setSelectedEstado}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Limpiar */}
                  <button
                    className="h-9 px-4 border rounded"
                    onClick={clearFilters}
                  >
                    Limpiar
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Tabla */}
            <Card>
              <CardContent className="p-0">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    {error}
                  </Alert>
                )}

                {loading ? (
                  <p className="text-center py-10">Cargando historial...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Cédula</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Fecha Inicio</TableHead>
                          <TableHead>Fecha Fin</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSolicitudes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6">
                              No se encontraron solicitudes.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSolicitudes.map(s => (
                            <TableRow key={s.id}>
                              <TableCell>
                                {s.usuario?.colaborador ?? s.usuario_id}
                              </TableCell>
                              <TableCell>
                                {s.usuario?.cedula ?? "-"}
                              </TableCell>
                              <TableCell>{humanType(s.tipo_permiso)}</TableCell>
                              <TableCell>{formatDate(s.fecha_inicio)}</TableCell>
                              <TableCell>{formatDate(s.fecha_fin)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    s.estado === "aprobado"
                                      ? "secondary"
                                      : s.estado === "rechazado"
                                      ? "destructive"
                                      : "default"
                                  }
                                >
                                  {s.estado}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {s.pdf_url ? (
                                  <Button
                                    size="sm"
                                    onClick={() => window.open(s.pdf_url!, "_blank")}
                                >
                                  <FileDown className="h-4 w-4 mr-1" /> Ver PDF
                                </Button>
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    Sin PDF
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
