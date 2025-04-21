"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminSidebar } from "@/components/ui/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

export default function EditarComunicadoClient() {
  const router = useRouter();
  const params = useParams();
  const comunicadoId = params.id as string;

  // Estados
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Catálogos
  const [categorias, setCategorias] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);

  // Usuarios y búsqueda
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [usuarioSearch, setUsuarioSearch] = useState("");

  // Imagen principal
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Archivos adjuntos
  const [adjuntos, setAdjuntos] = useState<{ name: string; url: string; size: number }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulario
  const [formData, setFormData] = useState({
    titulo: "",
    contenido: "",
    categoria_id: "",
    area_responsable: "Recursos Humanos",
    imagen_url: "",
    estado: "borrador",
    empresa_ids: [] as number[],
    usuario_ids: [] as number[],
  });

  // Carga inicial: auth, categorías, empresas y datos del comunicado
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const supabase = createSupabaseClient();
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !session) {
        router.push("/login");
        return;
      }

      const { data: userData, error: roleErr } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single();
      if (roleErr || userData?.rol !== "administrador") {
        router.push("/perfil");
        return;
      }

      // Cargar categorías
      const { data: catData, error: catErr } = await supabase
        .from("categorias_comunicados")
        .select("*")
        .order("nombre", { ascending: true });
      if (catErr) setError("Error al cargar categorías.");
      else setCategorias(catData || []);

      // Cargar empresas
      const { data: empData, error: empErr } = await supabase
        .from("empresas")
        .select("id, nombre")
        .order("nombre", { ascending: true });
      if (empErr) setError("Error al cargar empresas.");
      else setEmpresas(empData || []);

      // Cargar datos del comunicado
      await loadComunicado(session.user.id);
      setLoading(false);
    };
    init();
  }, [router]);

  // Función para cargar comunicado y pivotes
  const loadComunicado = async (/* currentUserId unused here */) => {
    try {
      const supabase = createSupabaseClient();
      // Datos básicos
      const { data, error: comErr } = await supabase
        .from("comunicados")
        .select("titulo,contenido,categoria_id,area_responsable,imagen_url,estado,archivos_adjuntos")
        .eq("id", comunicadoId)
        .single();
      if (comErr || !data) {
        setError("No se encontró el comunicado.");
        return;
      }
      setFormData(prev => ({
        ...prev,
        titulo: data.titulo,
        contenido: data.contenido,
        categoria_id: data.categoria_id,
        area_responsable: data.area_responsable,
        imagen_url: data.imagen_url || "",
        estado: data.estado,
      }));
      if (data.imagen_url) setImagePreview(data.imagen_url);
      if (data.archivos_adjuntos) {
        try {
          setAdjuntos(JSON.parse(data.archivos_adjuntos));
        } catch {}
      }

      // Pivote empresas
      const { data: ceData } = await supabase
        .from("comunicados_empresas")
        .select("empresa_id")
        .eq("comunicado_id", comunicadoId);
      const empresa_ids = ceData?.map(r => r.empresa_id) || [];
      setFormData(prev => ({ ...prev, empresa_ids }));

      // Pivote usuarios
      const { data: cuData } = await supabase
        .from("comunicados_usuarios")
        .select("usuario_id")
        .eq("comunicado_id", comunicadoId);
      const usuario_ids = cuData?.map(r => r.usuario_id) || [];
      setFormData(prev => ({ ...prev, usuario_ids }));
    } catch (err: any) {
      setError("Error al cargar: " + err.message);
    }
  };

  // Cuando cambian las empresas seleccionadas, recargar usuarios
  useEffect(() => {
    if (formData.empresa_ids.length === 0) {
      setUsuarios([]);
      setFormData(prev => ({ ...prev, usuario_ids: [] }));
      return;
    }
    const fetchUsuarios = async () => {
      setLoadingUsuarios(true);
      const supabase = createSupabaseClient();
      const { data: usuData, error: usuErr } = await supabase
        .from("usuario_nomina")
        .select("id,colaborador,empresa_id")
        .in("empresa_id", formData.empresa_ids)
        .order("colaborador", { ascending: true });
      if (usuErr) {
        setError("Error al cargar usuarios.");
        setUsuarios([]);
      } else {
        setUsuarios(usuData || []);
        // Limpiar usuarios no válidos
        setFormData(prev => ({
          ...prev,
          usuario_ids: prev.usuario_ids.filter(id =>
            (usuData || []).some(u => u.id === id)
          ),
        }));
      }
      setLoadingUsuarios(false);
    };
    fetchUsuarios();
  }, [formData.empresa_ids]);

  // Filtrado en tiempo real
  const filteredEmpresas = empresas.filter(e =>
    e.nombre.toLowerCase().includes(empresaSearch.trim().toLowerCase())
  );
  const filteredUsuarios = usuarios.filter(u =>
    u.colaborador.toLowerCase().includes(usuarioSearch.trim().toLowerCase())
  );
  const allUsersSelected =
    filteredUsuarios.length > 0 &&
    filteredUsuarios.every(u => formData.usuario_ids.includes(u.id));

  // Handlers básicos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Subida de imagen (idéntico a NuevoComunicado)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      setError("Tipo no permitido.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Máx 5 MB.");
      return;
    }
    try {
      setUploadingImage(true);
      setError(null);
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      const img = document.createElement("img");
      img.src = preview;
      await new Promise<void>(res => (img.onload = () => res()));
      const targetW = 800, targetH = 600;
      const ratioImg = img.width / img.height;
      const ratioTgt = targetW / targetH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (ratioImg > ratioTgt) {
        sw = img.height * ratioTgt;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / ratioTgt;
        sy = (img.height - sh) / 2;
      }
      const canvas = document.createElement("canvas");
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      const blob: Blob|null = await new Promise(res =>
        canvas.toBlob(b => res(b), "image/webp", 0.85)
      );
      if (!blob) throw new Error("Falló conversión");
      const name = `comunicado_${Date.now()}_${Math.random().toString(36).slice(2,8)}.webp`;
      const path = `comunicados/${name}`;
      const webpFile = new File([blob], name, { type: "image/webp" });
      const supabase = createSupabaseClient();
      const { error: upErr } = await supabase.storage
        .from("comunicados")
        .upload(path, webpFile, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("comunicados")
        .getPublicUrl(path);
      setFormData(prev => ({ ...prev, imagen_url: urlData.publicUrl }));
    } catch (err: any) {
      setError("Error imagen: " + (err.message||""));
    } finally {
      setUploadingImage(false);
    }
  };

  // Subida de adjuntos (idéntico)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      setUploadingFiles(true);
      setError(null);
      const supabase = createSupabaseClient();
      const nuevos = [...adjuntos];
      for (const f of Array.from(files)) {
        if (f.size > 10 * 1024 * 1024) {
          setError(`"${f.name}" >10 MB.`);
          continue;
        }
        const name = `adjunto_${Date.now()}_${Math.random().toString(36).slice(2,8)}_${f.name}`;
        const path = `comunicados/adjuntos/${name}`;
        const { error: upErr } = await supabase.storage
          .from("comunicados")
          .upload(path, f, { cacheControl: "3600", upsert: false });
        if (upErr) continue;
        const { data: urlData } = supabase.storage
          .from("comunicados")
          .getPublicUrl(path);
        nuevos.push({ name: f.name, url: urlData.publicUrl, size: f.size });
      }
      setAdjuntos(nuevos);
    } catch (err: any) {
      setError("Error archivos: " + (err.message||""));
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (i: number) => {
    setAdjuntos(prev => prev.filter((_, idx) => idx !== i));
  };

  const formatFileSize = (b: number) =>
    b < 1024 ? b + " bytes"
    : b < 1048576 ? (b/1024).toFixed(1)+" KB"
    : (b/1048576).toFixed(1)+" MB";

  // Actualizar comunicado
  const handleSubmit = async (e: React.FormEvent, publicar = false) => {
    e.preventDefault();
    if (!formData.titulo.trim()) return setError("Título obligatorio");
    if (!formData.contenido.trim()) return setError("Contenido obligatorio");
    if (!formData.categoria_id) return setError("Seleccione categoría");

    try {
      setSaving(true);
      setError(null);
      const supabase = createSupabaseClient();

      // 1) Update comunicado
      const { error: updErr } = await supabase
        .from("comunicados")
        .update({
          titulo: formData.titulo,
          contenido: formData.contenido,
          categoria_id: formData.categoria_id,
          area_responsable: formData.area_responsable,
          imagen_url: formData.imagen_url,
          estado: publicar ? "publicado" : formData.estado,
          archivos_adjuntos: adjuntos.length ? JSON.stringify(adjuntos) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", comunicadoId);
      if (updErr) throw updErr;

      // 2) Pivot empresas: primero borrar existentes
      await supabase
        .from("comunicados_empresas")
        .delete()
        .eq("comunicado_id", comunicadoId);
      if (formData.empresa_ids.length) {
        const rows = formData.empresa_ids.map(eid => ({
          comunicado_id: comunicadoId,
          empresa_id: eid,
        }));
        await supabase.from("comunicados_empresas").insert(rows);
      }

      // 3) Pivot usuarios
      await supabase
        .from("comunicados_usuarios")
        .delete()
        .eq("comunicado_id", comunicadoId);
      if (formData.usuario_ids.length) {
        const rows = formData.usuario_ids.map(uid => ({
          comunicado_id: comunicadoId,
          usuario_id: uid,
        }));
        await supabase.from("comunicados_usuarios").insert(rows);
      }

      setSuccess(publicar ? "¡Publicado!" : "Actualizado!");
      setTimeout(() => router.push("/administracion/comunicados"), 2000);
    } catch (err: any) {
      setError("Error al guardar: " + (err.message||""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="max-w-[90%] mx-auto flex-1 p-8 md:pl-64">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-2xl font-bold">Editar Comunicado</CardTitle>
              <Button
                variant="outline"
                onClick={() => router.push("/administracion/comunicados")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {error && (
              <Alert className="mb-6 bg-red-50 text-red-800 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={e => handleSubmit(e, false)} className="space-y-6 md:pt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Izquierda */}
                <div className="md:col-span-2 flex flex-col space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título</Label>
                    <Input
                      id="titulo"
                      name="titulo"
                      value={formData.titulo}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2 flex flex-col flex-grow">
                    <Label htmlFor="contenido">Contenido</Label>
                    <Textarea
                      id="contenido"
                      name="contenido"
                      value={formData.contenido}
                      onChange={handleChange}
                      className="min-h-[200px] flex-grow"
                      required
                    />
                  </div>
                </div>

                {/* Derecha */}
                <div className="md:col-span-1 space-y-6">
                  {/* Botones */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 md:pt-8">
                    <Button
                      type="submit"
                      disabled={saving || uploadingImage || uploadingFiles}
                      className="flex-1"
                    >
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Actualizar
                    </Button>
                    {formData.estado !== "publicado" && (
                      <Button
                        type="button"
                        variant="default"
                        onClick={e => handleSubmit(e, true)}
                        disabled={saving || uploadingImage || uploadingFiles}
                        className="flex-1"
                      >
                        Publicar
                      </Button>
                    )}
                  </div>

                  {/* Imagen */}
                  <div className="space-y-2">
                    <Label>Imagen principal (4:3)</Label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:bg-gray-100">
                      {imagePreview ? (
                        <div className="relative w-full max-w-md">
                          <img
                            src={imagePreview}
                            alt="Vista previa"
                            className="rounded-lg w-full h-auto object-cover aspect-[4/3]"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setImagePreview(null);
                              setFormData(prev => ({ ...prev, imagen_url: "" }));
                              if (imageInputRef.current) imageInputRef.current.value = "";
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4">
                          <ImageIcon className="h-8 w-8 text-primary" />
                          <Button
                            variant="outline"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={uploadingImage}
                          >
                            {uploadingImage ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            Seleccionar imagen
                          </Button>
                        </div>
                      )}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </div>
                  </div>

                  {/* Categoría */}
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select
                      value={formData.categoria_id}
                      onValueChange={v => handleSelectChange("categoria_id", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Área responsable */}
                  <div className="space-y-2">
                    <Label>Área responsable</Label>
                    <Select
                      value={formData.area_responsable}
                      onValueChange={v => handleSelectChange("area_responsable", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                        <SelectItem value="Dirección General">Dirección General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Empresas */}
                  <div className="space-y-2">
                    <Label>Empresas</Label>
                    <div className="max-h-[250px] overflow-y-auto border rounded p-2 bg-white">
                      <Input
                        placeholder="Buscar empresa..."
                        value={empresaSearch}
                        onChange={e => setEmpresaSearch(e.target.value)}
                        className="mb-2"
                      />
                      {filteredEmpresas.length ? (
                        filteredEmpresas.map(emp => (
                          <label key={emp.id} className="flex items-center gap-2 py-1">
                            <input
                              type="checkbox"
                              checked={formData.empresa_ids.includes(emp.id)}
                              onChange={e => {
                                const checked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  empresa_ids: checked
                                    ? [...prev.empresa_ids, emp.id]
                                    : prev.empresa_ids.filter(id => id !== emp.id),
                                }));
                              }}
                            />
                            <span className="truncate">{emp.nombre}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No hay empresas</p>
                      )}
                    </div>
                  </div>

                  {/* Usuarios */}
                  <div className="space-y-2">
                    <Label>Usuarios</Label>
                    <div className="max-h-[250px] overflow-y-auto border rounded p-2 bg-white">
                      <Input
                        placeholder="Buscar usuario..."
                        value={usuarioSearch}
                        onChange={e => setUsuarioSearch(e.target.value)}
                        className="mb-2"
                        disabled={loadingUsuarios || usuarios.length === 0}
                      />

                      {/* Seleccionar todos */}
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={allUsersSelected}
                          onChange={e => {
                            const checked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              usuario_ids: checked
                                ? Array.from(new Set([
                                    ...prev.usuario_ids,
                                    ...filteredUsuarios.map(u => u.id),
                                  ]))
                                : prev.usuario_ids.filter(id =>
                                    !filteredUsuarios.map(u => u.id).includes(id)
                                  ),
                            }));
                          }}
                          disabled={loadingUsuarios}
                        />
                        <span>Seleccionar todos</span>
                      </label>

                      {filteredUsuarios.length ? (
                        filteredUsuarios.map(u => (
                          <label key={u.id} className="flex items-center gap-2 py-1">
                            <input
                              type="checkbox"
                              checked={formData.usuario_ids.includes(u.id)}
                              onChange={e => {
                                const checked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  usuario_ids: checked
                                    ? [...prev.usuario_ids, u.id]
                                    : prev.usuario_ids.filter(id => id !== u.id),
                                }));
                              }}
                            />
                            <span className="truncate">{u.colaborador}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">
                          {loadingUsuarios ? "Cargando..." : "No hay usuarios"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Archivos adjuntos */}
                  <div className="space-y-2">
                    <Label>Archivos adjuntos</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFiles}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingFiles ? "Subiendo..." : "Seleccionar archivos"}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingFiles}
                      />
                    </div>
                    {adjuntos.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {adjuntos.map((f, i) => (
                          <li key={i} className="flex items-center justify-between">
                            <span className="truncate">{f.name} ({formatFileSize(f.size)})</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveFile(i)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
