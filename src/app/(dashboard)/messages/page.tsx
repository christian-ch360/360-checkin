// The conversation list now lives in messages/layout.tsx (persistent left
// pane on desktop, list-only view on mobile) — this route only supplies the
// right-pane content when no thread is selected, which MessagesShell already
// renders itself. Nothing else is needed here.
export default function MessagesPage() {
  return null;
}
