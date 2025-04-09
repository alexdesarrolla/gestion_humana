import EditarComunicadoClient from "./EditarComunicadoClient"

// Esta función es necesaria para rutas dinámicas con exportación estática
export async function generateStaticParams() {
  // En un entorno de desarrollo o cuando se usa Server Components,
  // podríamos obtener todos los IDs de comunicados desde la base de datos
  // Pero como estamos usando Client Components, simplemente devolvemos un array vacío
  // Next.js generará estas páginas bajo demanda
  return []
}

export default function EditarComunicado() {
  return <EditarComunicadoClient />
}
