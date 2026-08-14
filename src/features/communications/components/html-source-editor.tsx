"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Bold, Italic, Link2, MousePointerClick, Minus, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";

export type HtmlSourceEditorHandle = { insertAtCursor: (text: string) => void };

const ACCENT = "#16a34a";

const SNIPPETS = {
  bold: { before: "<strong>", after: "</strong>", icon: Bold, label: "Bold" },
  italic: { before: "<em>", after: "</em>", icon: Italic, label: "Italic" },
  link: { before: '<a href="https://" style="color: #16a34a;">', after: "</a>", icon: Link2, label: "Link" },
  divider: {
    before: '<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />\n',
    after: "",
    icon: Minus,
    label: "Divider",
  },
  button: {
    before: `<p style="margin: 16px 0;"><a href="https://" style="display: inline-block; background-color: ${ACCENT}; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">`,
    after: "</a></p>\n",
    icon: MousePointerClick,
    label: "Button",
  },
} as const;

/**
 * A lightweight, practical HTML source editor — not a plain textarea
 * (monospace, Tab inserts spaces instead of moving focus, a toolbar for the
 * handful of email-safe patterns admins actually need) but deliberately not
 * a full WYSIWYG either, since the project has no existing rich-text editor
 * to build on (see the codebase audit) and admin-authored email HTML is a
 * narrow, safety-sensitive surface where predictable raw markup beats a
 * heavier dependency. `ref` exposes `insertAtCursor` so the variables panel
 * can insert a `{{token}}` at the cursor instead of always appending.
 */
export const HtmlSourceEditor = forwardRef<HtmlSourceEditorHandle, { value: string; onChange: (value: string) => void }>(
  function HtmlSourceEditor({ value, onChange }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    function wrapSelection(before: string, after: string) {
      const el = textareaRef.current;
      if (!el) return;
      const { selectionStart, selectionEnd } = el;
      const selected = value.slice(selectionStart, selectionEnd);
      const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const cursor = selectionStart + before.length + selected.length;
        el.setSelectionRange(cursor, cursor);
      });
    }

    function insertAtCursor(text: string) {
      const el = textareaRef.current;
      if (!el) {
        onChange(value + text);
        return;
      }
      const { selectionStart, selectionEnd } = el;
      const next = value.slice(0, selectionStart) + text + value.slice(selectionEnd);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const cursor = selectionStart + text.length;
        el.setSelectionRange(cursor, cursor);
      });
    }

    useImperativeHandle(ref, () => ({ insertAtCursor }));

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Tab") {
        e.preventDefault();
        wrapSelection("  ", "");
      }
    }

    return (
      <div className="overflow-hidden rounded-lg border">
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1.5">
          {Object.entries(SNIPPETS).map(([key, snippet]) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              title={snippet.label}
              onClick={() => wrapSelection(snippet.before, snippet.after)}
            >
              <snippet.icon className="size-3.5" />
              {snippet.label}
            </Button>
          ))}
          <span className="ml-auto flex items-center gap-1 px-2 text-[11px] text-muted-foreground">
            <Variable className="size-3" /> HTML source
          </span>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder={"<p>Hi {{firstName}},</p>\n<p>Your message here…</p>"}
          className="h-80 w-full resize-y bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
    );
  }
);
