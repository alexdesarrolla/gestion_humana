"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function EditarComunicadoRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Extraer el ID del comunicado de la URL actual
    const path = window.location.pathname
    const idMatch = path.match(/\/editar\/([^/]+)/)

    if (idMatch && idMatch[1]) {
      // Redirigir a la ruta correcta con el ID
      router.push(`/administracion/comunicados/editar/${idMatch[1]}/`)
    } else {
      // Si no se puede extraer el ID, redirigir a la lista de comunicados
      router.push("/administracion/comunicados")
    }
  }, [])

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
