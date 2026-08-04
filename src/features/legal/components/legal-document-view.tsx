import type { LegalDocumentDefinition } from "@/features/legal/types";

function formatEffectiveDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Renders a full legal document: title, version/effective-date meta strip,
 * summary, and every section with an anchor-linkable heading. Shared by
 * every /legal/* page — the only thing that differs between documents is
 * the `document` prop, so a future revision never touches this component.
 */
export function LegalDocumentView({ document }: { document: LegalDocumentDefinition }) {
  return (
    <article className="w-full max-w-3xl">
      <header className="space-y-4 border-b border-black/10 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-balance text-black sm:text-4xl">
          {document.title}
        </h1>
        <p className="text-lg text-black/60 text-balance">{document.summary}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-black/40">
          <span>
            Version <span className="font-medium text-black/60">{document.version}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Effective {formatEffectiveDate(document.effectiveDate)}</span>
        </div>
      </header>

      <nav aria-label="Table of contents" className="my-8 rounded-2xl border border-black/10 bg-black/[0.02] p-5">
        <p className="mb-3 text-xs font-medium tracking-wide text-black/40 uppercase">On this page</p>
        <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {document.sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-sm text-black/60 underline-offset-2 hover:text-black hover:underline"
              >
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10 py-4">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-black">{section.heading}</h2>
            {section.body.map((paragraph, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-black/70">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
