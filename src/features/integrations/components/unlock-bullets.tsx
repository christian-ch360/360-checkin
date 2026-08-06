export function UnlockBullets({ lead, items }: { lead: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <p>{lead}</p>
      <ul className="space-y-1 text-left">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
