/**
 * Minimal Tiptap wrapper: a bold/italic/list/link toolbar over StarterKit,
 * styled to match the rest of ui/ (border + focus ring like Textarea).
 * Stores/emits HTML — callers must sanitize before rendering it anywhere
 * outside this editor (e.g. DOMPurify), since it's arbitrary rich text.
 */

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { IconBold, IconItalic, IconLink, IconList, IconListNumbers } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-45",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder, disabled, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "min-h-[140px] text-sm leading-relaxed focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // Keep the editor in sync when `value` changes from outside (e.g. loading
  // an amenity for editing) without fighting the user's own typing.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previousUrl ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-input bg-gates-surface ring-offset-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      <div className="flex items-center gap-0.5 border-b border-input px-2 py-1.5">
        <ToolbarButton
          label="Negrita"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <IconBold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <IconItalic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <IconList className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <IconListNumbers className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Enlace" active={editor.isActive("link")} disabled={disabled} onClick={setLink}>
          <IconLink className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="px-3.5 py-2.5" placeholder={placeholder} />
    </div>
  );
}
