"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Image,
  Loader2,
} from "lucide-react";

export default function NuevoComunicado() {
  const router = useRouter();

  // Estados generales
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Catálogos
  const [categorias, setCategorias] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);

  // Usuarios según empresas seleccionadas
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Búsquedas locales
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [usuarioSearch, setUsuarioSearch] = useState("");

  // Imagen principal
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Archivos adjuntos
  const [adjuntos, setAdjuntos] = useState<{ name: string; url: string; size: number }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Refs para inputs ocultos
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado del formulario
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

  // Carga inicial: autenticación + catálogos
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      setLoading(true);
      const supabase = createSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      const { data: userData, error: roleError } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single();

      if (roleError || userData?.rol !== "administrador") {
        router.push("/perfil");
        return;
      }

      // Cargar categorías
      const { data: catData, error: catError } = await supabase
        .from("categorias_comunicados")
        .select("*")
        .order("nombre", { ascending: true });
      if (catError) setError("Error al cargar categorías.");
      else setCategorias(catData || []);

      // Cargar empresas
      const { data: empData, error: empError } = await supabase
        .from("empresas")
        .select("id, nombre")
        .order("nombre", { ascending: true });
      if (empError) setError("Error al cargar empresas.");
      else setEmpresas(empData || []);

      setLoading(false);
    };
    checkAuthAndLoad();
  }, [router]);

  // Recargar usuarios cuando cambian empresas seleccionadas
  useEffect(() => {
    if (formData.empresa_ids.length === 0) {
      setUsuarios([]);
      setFormData(prev => ({ ...prev, usuario_ids: [] }));
      setUsuarioSearch("");
      return;
    }
    const fetchUsuarios = async () => {
      setLoadingUsuarios(true);
      setError(null);
      const supabase = createSupabaseClient();
      const { data: usuData, error: usuError } = await supabase
        .from("usuario_nomina")
        .select("id, colaborador")
        .in("empresa_id", formData.empresa_ids)
        .order("colaborador", { ascending: true });

      if (usuError) {
        setError("Error al cargar usuarios.");
        setUsuarios([]);
      } else {
        setUsuarios(usuData || []);
        // Limpiar ids de usuarios que ya no están en la lista
        setFormData(prev => ({
          ...prev,
          usuario_ids: prev.usuario_ids.filter(uid =>
            (usuData || []).some(u => u.id === uid)
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

  // Determinar si todos los usuarios filtrados están seleccionados
  const allUsersSelected =
    filteredUsuarios.length > 0 &&
    filteredUsuarios.every(u => formData.usuario_ids.includes(u.id));

  // Handlers genéricos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Subida y procesamiento de imagen principal
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      setError("Tipo de archivo no permitido.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Máximo 5 MB.");
      return;
    }
    try {
      setUploadingImage(true);
      setError(null);

      // Preview
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Redimensionar a 4:3
      const img = document.createElement("img");
      img.src = previewUrl;
      await new Promise<void>(res => (img.onload = () => res()));

      const targetW = 800, targetH = 600;
      const imgRatio = img.width / img.height;
      const tgtRatio = targetW / targetH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgRatio > tgtRatio) {
        sw = img.height * tgtRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / tgtRatio;
        sy = (img.height - sh) / 2;
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      }

      // Convertir a WebP
      const blob: Blob | null = await new Promise(res =>
        canvas.toBlob(b => res(b), "image/webp", 0.85)
      );
      if (!blob) throw new Error("Conversión fallida");

      const fileName = `comunicado_${Date.now()}_${Math.random().toString(36).slice(2,8)}.webp`;
      const filePath = `comunicados/${fileName}`;
      const webpFile = new File([blob], fileName, { type: "image/webp" });

      const supabase = createSupabaseClient();
      const { error: uploadErr } = await supabase.storage
        .from("comunicados")
        .upload(filePath, webpFile, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("comunicados")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, imagen_url: urlData.publicUrl }));
    } catch (err: any) {
      setError("Error al subir imagen: " + (err.message || ""));
    } finally {
      setUploadingImage(false);
    }
  };

  // Subida de archivos adjuntos
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
          setError(`"${f.name}" excede 10 MB.`);
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
      setError("Error al subir archivos: " + (err.message || ""));
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Eliminar adjunto
  const handleRemoveFile = (idx: number) => {
    setAdjuntos(prev => prev.filter((_, i) => i !== idx));
  };

  // Formatear tamaño
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  // Guardar o publicar comunicado + tablas puente
  const handleSubmit = async (e: React.FormEvent, publicar = false) => {
    e.preventDefault();
    if (!formData.titulo.trim()) return setError("El título es obligatorio");
    if (!formData.contenido.trim()) return setError("El contenido es obligatorio");
    if (!formData.categoria_id) return setError("Debe seleccionar una categoría");

    try {
      setSaving(true);
      setError(null);

      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no encontrada");

      // 1) Insertar comunicado
      const { data: insertData, error: insertError } = await supabase
        .from("comunicados")
        .insert({
          titulo: formData.titulo,
          contenido: formData.contenido,
          imagen_url: formData.imagen_url,
          categoria_id: formData.categoria_id,
          autor_id: session.user.id,
          area_responsable: formData.area_responsable,
          estado: publicar ? "publicado" : "borrador",
        })
        .select("id");
      if (insertError || !insertData?.length) throw insertError;
      const comunicadoId = insertData[0].id;

      // 2) Insertar relaciones con empresas
      if (formData.empresa_ids.length) {
        const rows = formData.empresa_ids.map(eid => ({
          comunicado_id: comunicadoId,
          empresa_id: eid,
        }));
        await supabase.from("comunicados_empresas").insert(rows);
      }

      // 3) Insertar relaciones con usuarios
      if (formData.usuario_ids.length) {
        const rows = formData.usuario_ids.map(uid => ({
          comunicado_id: comunicadoId,
          usuario_id: uid,
        }));
        await supabase.from("comunicados_usuarios").insert(rows);
      }

      setSuccess(publicar
        ? "¡Comunicado publicado exitosamente!"
        : "Comunicado guardado como borrador"
      );
      setTimeout(() => router.push("/administracion/comunicados"), 2000);
    } catch (err: any) {
      setError("Error al guardar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="max-w-[90%] mx-auto flex-1 p-8 md:pl-64">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-2xl font-bold">Nuevo Comunicado</CardTitle>
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
                {/* Izquierda: Título y Contenido */}
                <div className="md:col-span-2 flex flex-col space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título del Comunicado</Label>
                    <Input
                      id="titulo"
                      name="titulo"
                      value={formData.titulo}
                      onChange={handleChange}
                      placeholder="Ingrese el título"
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
                      placeholder="Ingrese el contenido"
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
                      Guardar Borrador
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      onClick={e => handleSubmit(e, true)}
                      disabled={saving || uploadingImage || uploadingFiles}
                      className="flex-1"
                    >
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Publicar Comunicado
                    </Button>
                  </div>

                  {/* Imagen principal */}
                  <div className="space-y-2">
                    <Label htmlFor="imagen">Imagen principal (4:3)</Label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors">
                      {imagePreview ? (
                        <div className="relative w-full max-w-md">
                          <img
                            src={imagePreview}
                            alt="Vista previa"
                            className="rounded-lg w-full h-auto object-cover aspect-[4/3] shadow-md"
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
                          <Image className="h-8 w-8 text-primary" />
                          <p className="text-sm font-medium">Arrastra o haz clic para subir</p>
                          <p className="text-xs text-gray-500">JPG, PNG o WEBP (máx. 5MB)</p>
                          <Button
                            type="button"
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
                    <Label htmlFor="categoria">Categoría</Label>
                    <Select
                      value={formData.categoria_id}
                      onValueChange={v => setFormData(prev => ({ ...prev, categoria_id: v }))}
                    >
                      <SelectTrigger id="categoria">
                        <SelectValue placeholder="Seleccione una categoría" />
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
                    <Label htmlFor="area">Área responsable</Label>
                    <Select
                      value={formData.area_responsable}
                      onValueChange={v => setFormData(prev => ({ ...prev, area_responsable: v }))}
                    >
                      <SelectTrigger id="area">
                        <SelectValue placeholder="Seleccione un área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                        <SelectItem value="Dirección General">Dirección General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Empresas */}
                  <div className="space-y-2">
                    <Label htmlFor="empresas">Empresas</Label>
                    <div className="max-h-[250px] overflow-y-auto border rounded p-2 bg-white shadow-sm">
                      <Input
                        type="text"
                        placeholder="Buscar empresa..."
                        value={empresaSearch}
                        onChange={e => setEmpresaSearch(e.target.value)}
                        className="mb-2 w-full"
                      />
                      {filteredEmpresas.length ? (
                        filteredEmpresas.map(emp => (
                          <label
                            key={emp.id}
                            className="flex items-center gap-2 py-1 cursor-pointer select-none"
                          >
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
                            <span className="truncate" title={emp.nombre}>
                              {emp.nombre}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No se encontraron empresas</p>
                      )}
                    </div>
                  </div>

                  {/* Usuarios */}
                  <div className="space-y-2">
                    <Label htmlFor="usuarios">Usuarios</Label>
                    <div className="max-h-[250px] overflow-y-auto border rounded p-2 bg-white shadow-sm">
                      <Input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={usuarioSearch}
                        onChange={e => setUsuarioSearch(e.target.value)}
                        className="mb-2 w-full"
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
                          <label
                            key={u.id}
                            className="flex items-center gap-2 py-1 cursor-pointer select-none"
                          >
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
                            <span className="truncate" title={u.colaborador}>
                              {u.colaborador}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">
                          {loadingUsuarios ? "Cargando usuarios..." : "No se encontraron usuarios"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Archivos adjuntos */}
                  <div className="space-y-2">
                    <Label htmlFor="adjuntos">Archivos adjuntos (opcional)</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                      <div className="flex flex-col items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFiles}
                          className="w-full md:w-auto"
                        >
                          {uploadingFiles ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {uploadingFiles ? "Subiendo archivos..." : "Seleccionar archivos"}
                        </Button>
                        <p className="text-xs text-gray-500">Máx. 10MB por archivo</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingFiles}
                      />
                      {adjuntos.length > 0 && (
                        <div className="mt-4 border rounded-lg divide-y">
                          {adjuntos.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3">
                              <div className="flex-1 truncate">
                                <p className="font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleRemoveFile(idx)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
