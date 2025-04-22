import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Comentario {
  id: number;
  usuario_id: string;
  nombre_usuario: string;
  comentario: string;
  fecha: string;
  respuesta_a: number | null;
  respuestas?: Comentario[];
}

export function ComentariosComunicados({ comunicadoId }: { comunicadoId: string }) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [respondiendoA, setRespondiendoA] = useState<number | null>(null);
  const [respuestaTexto, setRespuestaTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; nombre: string } | null>(null);

  // Obtener usuario actual
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Buscar nombre en usuario_nomina
      const { data: perfil } = await supabase
        .from("usuario_nomina")
        .select("colaborador")
        .eq("auth_user_id", user.id)
        .single();
      setUser({ id: user.id, nombre: perfil?.colaborador || "Usuario" });
    };
    fetchUser();
  }, []);

  // Cargar comentarios
  useEffect(() => {
    const fetchComentarios = async () => {
      setLoading(true);
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("comentarios_comunicados")
        .select(`id, usuario_id, comentario, fecha, respuesta_a, usuario_nomina:usuario_id(colaborador)`)
        .eq("comunicado_id", comunicadoId)
        .order("fecha", { ascending: true });
      if (!error && data) {
        // Normalizar y anidar respuestas
        const map: { [id: number]: Comentario } = {};
        const roots: Comentario[] = [];
        data.forEach((c: any) => {
          map[c.id] = {
            id: c.id,
            usuario_id: c.usuario_id,
            nombre_usuario: c.usuario_nomina?.colaborador || "Usuario",
            comentario: c.comentario,
            fecha: c.fecha,
            respuesta_a: c.respuesta_a,
            respuestas: [],
          };
        });
        Object.values(map).forEach((c) => {
          if (c.respuesta_a && map[c.respuesta_a]) {
            map[c.respuesta_a].respuestas!.push(c);
          } else {
            roots.push(c);
          }
        });
        setComentarios(roots);
      }
      setLoading(false);
    };
    fetchComentarios();
  }, [comunicadoId]);

  // Añadir comentario
  const handleComentar = async () => {
    if (!nuevoComentario.trim() || !user) return;
    setLoading(true);
    const supabase = createSupabaseClient();
    await supabase.from("comentarios_comunicados").insert({
      comunicado_id: comunicadoId,
      usuario_id: user.id,
      comentario: nuevoComentario,
      respuesta_a: null,
    });
    setNuevoComentario("");
    // Recargar comentarios
    const { data } = await supabase
      .from("comentarios_comunicados")
      .select(`id, usuario_id, comentario, fecha, respuesta_a, usuario_nomina:usuario_id(colaborador)`)
      .eq("comunicado_id", comunicadoId)
      .order("fecha", { ascending: true });
    if (data) {
      const map: { [id: number]: Comentario } = {};
      const roots: Comentario[] = [];
      data.forEach((c: any) => {
        map[c.id] = {
          id: c.id,
          usuario_id: c.usuario_id,
          nombre_usuario: c.usuario_nomina?.colaborador || "Usuario",
          comentario: c.comentario,
          fecha: c.fecha,
          respuesta_a: c.respuesta_a,
          respuestas: [],
        };
      });
      Object.values(map).forEach((c) => {
        if (c.respuesta_a && map[c.respuesta_a]) {
          map[c.respuesta_a].respuestas!.push(c);
        } else {
          roots.push(c);
        }
      });
      setComentarios(roots);
    }
    setLoading(false);
  };

  // Responder a comentario
  const handleResponder = async (comentarioId: number) => {
    if (!respuestaTexto.trim() || !user) return;
    setLoading(true);
    const supabase = createSupabaseClient();
    await supabase.from("comentarios_comunicados").insert({
      comunicado_id: comunicadoId,
      usuario_id: user.id,
      comentario: respuestaTexto,
      respuesta_a: comentarioId,
    });
    setRespuestaTexto("");
    setRespondiendoA(null);
    // Recargar comentarios
    const { data } = await supabase
      .from("comentarios_comunicados")
      .select(`id, usuario_id, comentario, fecha, respuesta_a, usuario_nomina:usuario_id(colaborador)`)
      .eq("comunicado_id", comunicadoId)
      .order("fecha", { ascending: true });
    if (data) {
      const map: { [id: number]: Comentario } = {};
      const roots: Comentario[] = [];
      data.forEach((c: any) => {
        map[c.id] = {
          id: c.id,
          usuario_id: c.usuario_id,
          nombre_usuario: c.usuario_nomina?.colaborador || "Usuario",
          comentario: c.comentario,
          fecha: c.fecha,
          respuesta_a: c.respuesta_a,
          respuestas: [],
        };
      });
      Object.values(map).forEach((c) => {
        if (c.respuesta_a && map[c.respuesta_a]) {
          map[c.respuesta_a].respuestas!.push(c);
        } else {
          roots.push(c);
        }
      });
      setComentarios(roots);
    }
    setLoading(false);
  };

  const renderComentarios = (comentarios: Comentario[], nivel = 0) => (
    <ul className={nivel === 0 ? "space-y-4" : "space-y-2 ml-8 border-l pl-4 border-slate-200"}>
      {comentarios.map((c) => (
        <li key={c.id} className="">
          <Card className="mb-1">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{c.nombre_usuario}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.fecha).toLocaleString("es-ES", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="text-sm mb-2 whitespace-pre-line">{c.comentario}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-xs px-2 py-1" onClick={() => { setRespondiendoA(c.id); setRespuestaTexto(""); }}>Responder</Button>
              </div>
              {respondiendoA === c.id && (
                <div className="mt-2 flex flex-col gap-2">
                  <Textarea
                    value={respuestaTexto}
                    onChange={e => setRespuestaTexto(e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleResponder(c.id)} disabled={loading || !respuestaTexto.trim()}>Enviar</Button>
                    <Button size="sm" variant="outline" onClick={() => setRespondiendoA(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {c.respuestas && c.respuestas.length > 0 && renderComentarios(c.respuestas, nivel + 1)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Comentarios</h2>
      {user && (
        <div className="mb-6">
          <Textarea
            value={nuevoComentario}
            onChange={e => setNuevoComentario(e.target.value)}
            placeholder="Escribe un comentario..."
            rows={3}
          />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleComentar} disabled={loading || !nuevoComentario.trim()}>Comentar</Button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="text-muted-foreground">Cargando comentarios...</div>
      ) : comentarios.length === 0 ? (
        <div className="text-muted-foreground">No hay comentarios aún.</div>
      ) : (
        renderComentarios(comentarios)
      )}
    </div>
  );
}