"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { THEME_EDITOR_SECTIONS, type ThemeEditorContext } from "./section-registry";
import { ThemeEditorSidebar } from "./theme-editor-sidebar";
import { ThemeEditorTopBar } from "./theme-editor-topbar";
import { ThemeEditorPreviewPanel } from "./theme-editor-preview-panel";
import type { DEVICE_SIZES } from "./device-preview-switcher";
import type { ResolvedKioskTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";

const DEFAULT_SECTION_ID = THEME_EDITOR_SECTIONS[0].id;

export function ThemeEditorShell({
  context,
  themeName,
  isPending,
  onSaveDraft,
  onPublish,
  onDuplicate,
  onDeleteRequest,
  previewTheme,
  device,
  onDeviceChange,
  previewAsLive,
  onPreviewAsLiveChange,
  wouldBeLive,
  kioskName,
  kioskLocation,
}: {
  context: ThemeEditorContext;
  themeName: string;
  isPending: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onDuplicate: () => void;
  onDeleteRequest: () => void;
  previewTheme: ResolvedKioskTheme;
  device: keyof typeof DEVICE_SIZES;
  onDeviceChange: (device: keyof typeof DEVICE_SIZES) => void;
  previewAsLive: string;
  onPreviewAsLiveChange: (value: string) => void;
  wouldBeLive: boolean;
  kioskName: string;
  kioskLocation: string | null;
}) {
  const [activeSectionId, setActiveSectionId] = useState(DEFAULT_SECTION_ID);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const activeSection = THEME_EDITOR_SECTIONS.find((s) => s.id === activeSectionId) ?? THEME_EDITOR_SECTIONS[0];

  function selectSection(id: string) {
    setActiveSectionId(id);
    setMobileNavOpen(false);
  }

  return (
    <div className="space-y-4">
      <ThemeEditorTopBar
        themeName={themeName}
        themeKey={context.themeKey}
        latest={context.latest}
        isPending={isPending}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        onDuplicate={onDuplicate}
        onDeleteRequest={onDeleteRequest}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Sidebar — icon rail from md, full labels from lg */}
        <aside className="hidden shrink-0 md:block md:w-14 lg:w-60">
          <div className="lg:hidden">
            <ThemeEditorSidebar activeSectionId={activeSectionId} onSelectSection={selectSection} iconOnly />
          </div>
          <div className="hidden lg:block">
            <ThemeEditorSidebar activeSectionId={activeSectionId} onSelectSection={selectSection} />
          </div>
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>Theme Editor</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <ThemeEditorSidebar activeSectionId={activeSectionId} onSelectSection={selectSection} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Editor + Preview */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-base font-semibold">{activeSection.label}</h2>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection.id}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                transition={{ duration: reduceMotion ? 0 : 0.15 }}
              >
                {activeSection.render(context)}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="xl:w-[480px] xl:shrink-0">
            <ThemeEditorPreviewPanel
              previewTheme={previewTheme}
              device={device}
              onDeviceChange={onDeviceChange}
              previewAsLive={previewAsLive}
              onPreviewAsLiveChange={onPreviewAsLiveChange}
              wouldBeLive={wouldBeLive}
              kioskName={kioskName}
              kioskLocation={kioskLocation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
