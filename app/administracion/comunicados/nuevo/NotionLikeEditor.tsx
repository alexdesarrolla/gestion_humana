"use client"

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Quote,
  Minus,
  X
} from "lucide-react"

interface NotionLikeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function NotionLikeEditor({
  value,
  onChange,
  placeholder = "Presiona '/' para ver comandos o empieza a escribir...",
}: NotionLikeEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg border border-gray-200 shadow-sm',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none',
      },
    },
  })

  if (!editor) {
    return null
  }

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setShowLinkInput(false)
      setLinkUrl('')
    }
  }

  return (
    <div className="relative min-h-[300px] w-full rounded-lg border border-input bg-background px-3 py-2 ring-offset-background">
      {editor && (
        <BubbleMenu
          className="flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
          tippyOptions={{ duration: 100 }}
          editor={editor}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("px-2 py-1", { "bg-muted": editor.isActive("bold") })}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("px-2 py-1", { "bg-muted": editor.isActive("italic") })}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn("px-2 py-1", { "bg-muted": editor.isActive("heading", { level: 1 }) })}
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn("px-2 py-1", { "bg-muted": editor.isActive("heading", { level: 2 }) })}
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("px-2 py-1", { "bg-muted": editor.isActive("bulletList") })}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn("px-2 py-1", { "bg-muted": editor.isActive("orderedList") })}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLinkInput(!showLinkInput)}
            className={cn("px-2 py-1", { "bg-muted": editor.isActive("link") })}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </BubbleMenu>
      )}

      {showLinkInput && (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-2 rounded-t-lg border-b bg-white p-2">
          <input
            type="url"
            placeholder="Ingresa la URL..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <Button size="sm" onClick={addLink}>
            Añadir
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowLinkInput(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1 border-b pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn("px-2", { "bg-muted": editor.isActive("heading", { level: 1 }) })}
        >
          <Heading1 className="h-4 w-4 mr-1" /> Título 1
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn("px-2", { "bg-muted": editor.isActive("heading", { level: 2 }) })}
        >
          <Heading2 className="h-4 w-4 mr-1" /> Título 2
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("px-2", { "bg-muted": editor.isActive("bold") })}
        >
          <Bold className="h-4 w-4 mr-1" /> Negrita
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("px-2", { "bg-muted": editor.isActive("italic") })}
        >
          <Italic className="h-4 w-4 mr-1" /> Cursiva
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("px-2", { "bg-muted": editor.isActive("bulletList") })}
        >
          <List className="h-4 w-4 mr-1" /> Lista
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn("px-2", { "bg-muted": editor.isActive("orderedList") })}
        >
          <ListOrdered className="h-4 w-4 mr-1" /> Lista numerada
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn("px-2", { "bg-muted": editor.isActive("blockquote") })}
        >
          <Quote className="h-4 w-4 mr-1" /> Cita
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4 mr-1" /> Línea
        </Button>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}