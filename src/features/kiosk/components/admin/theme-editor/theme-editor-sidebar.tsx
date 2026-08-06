"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { THEME_EDITOR_GROUPS, THEME_EDITOR_SECTIONS, searchThemeEditorSections } from "./section-registry";

export function ThemeEditorSidebar({
  activeSectionId,
  onSelectSection,
  iconOnly = false,
}: {
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  /** Tablet mode: icon rail with tooltips instead of full labels. */
  iconOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const results = query.trim() ? searchThemeEditorSections(query) : null;

  return (
    <nav className="flex h-full flex-col gap-3">
      {!iconOnly && (
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      )}

      {results ? (
        <div className="space-y-0.5">
          {results.length === 0 && <p className="px-2 text-sm text-muted-foreground">No matching settings.</p>}
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelectSection(s.id);
                setQuery("");
              }}
              className={cn(
                "flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                activeSectionId === s.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span>{s.label}</span>
              <span className="text-xs text-muted-foreground">{s.groupLabel}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto">
          {THEME_EDITOR_GROUPS.map((group) => {
            const sections = THEME_EDITOR_SECTIONS.filter((s) => s.group === group.id);
            const collapsed = collapsedGroups.has(group.id);
            return (
              <div key={group.id}>
                {iconOnly ? (
                  <p className="px-1 pt-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase first:pt-0">
                    {group.label.slice(0, 1)}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
                  >
                    <ChevronDown className={cn("size-3.5 transition-transform", collapsed && "-rotate-90")} />
                    {group.label}
                  </button>
                )}
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 py-0.5">
                        {sections.map((s) =>
                          iconOnly ? (
                            <Tooltip key={s.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onSelectSection(s.id)}
                                  className={cn(
                                    "flex size-9 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                                    activeSectionId === s.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                  )}
                                >
                                  {s.label.slice(0, 1)}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right">{s.label}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => onSelectSection(s.id)}
                              className={cn(
                                "block w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                                activeSectionId === s.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                              )}
                            >
                              {s.label}
                            </button>
                          )
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
}
