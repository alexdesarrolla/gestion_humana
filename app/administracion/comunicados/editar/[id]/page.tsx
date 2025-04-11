import EditarComunicadoClient from "./EditarComunicadoClient"

// Esta función es necesaria para rutas dinámicas con exportación estática
export const dynamic = "force-dynamic"

export default function EditarComunicado({ params }: { params: { id: string } }) {
  return <EditarComunicadoClient id={params.id} />
}
