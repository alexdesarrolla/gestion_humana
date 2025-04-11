"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Link } from "lucide-react"

interface SimpleEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SimpleEditor({
  value,
  onChange,
  placeholder = "Escribe el contenido del comunicado aquí...",
}: SimpleEditorProps) {
  const [htmlContent, setHtmlContent] = useState(value || "")

  // Actualizar el estado interno cuando cambia el valor externo
  useEffect(() => {
    setHtmlContent(value || "")
  }, [value])

  // Actualizar el valor externo cuando cambia el estado interno
  const handleChange = (newContent: string) => {
    setHtmlContent(newContent)
    onChange(newContent)
  }

  // Insertar HTML en la posición actual del cursor
  const insertHTML = (tag: string, attributes = "") => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()

    // Crear el nuevo contenido HTML
    const openTag = attributes ? `<${tag} ${attributes}>` : `<${tag}>`
    const closeTag = `</${tag}>`
    const newHTML = openTag + (selectedText || "Texto") + closeTag

    // Insertar el nuevo HTML en el textarea
    const currentContent = htmlContent
    const newContent = currentContent + "\n" + newHTML

    handleChange(newContent)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-2">
        <Button type="button" variant="outline" size="sm" onClick={() => insertHTML("strong")}>
          <Bold className="h-4 w-4 mr-1" /> Negrita
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insertHTML("em")}>
          <Italic className="h-4 w-4 mr-1" /> Cursiva
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insertHTML("h1")}>
          <Heading1 className="h-4 w-4 mr-1" /> Título 1
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insertHTML("h2")}>
          <Heading2 className="h-4 w-4 mr-1" /> Título 2
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insertHTML("ul")}>
          <List className="h-4 w-4 mr-1" /> Lista
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insertHTML("ol")}>
          <ListOrdered className="h-4 w-4 mr-1" /> Lista numerada
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insertHTML("a", 'href="#"')}>
          <Link className="h-4 w-4 mr-1" /> Enlace
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Label htmlFor="editor-help" className="text-sm text-gray-500 mb-2 block">
            Puedes usar HTML básico para dar formato al texto:
          </Label>
          <div className="text-xs text-gray-500 mb-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>
              <code>&lt;strong&gt;</code> para <strong>negrita</strong>
            </div>
            <div>
              <code>&lt;em&gt;</code> para <em>cursiva</em>
            </div>
            <div>
              <code>&lt;h1&gt;</code> para títulos grandes
            </div>
            <div>
              <code>&lt;h2&gt;</code> para subtítulos
            </div>
            <div>
              <code>&lt;ul&gt;&lt;li&gt;</code> para listas
            </div>
            <div>
              <code>&lt;a href="..."&gt;</code> para enlaces
            </div>
          </div>
        </CardContent>
      </Card>

      <Textarea
        value={htmlContent}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[300px] font-mono text-sm"
        id="html-editor"
      />

      <div className="border rounded-md p-4">
        <Label className="text-sm text-gray-500 mb-2 block">Vista previa:</Label>
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>
    </div>
  )
}
