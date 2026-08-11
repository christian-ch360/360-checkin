import Link from "next/link";

/** Renders a post/comment body with #hashtags and @mentions turned into links — hashtags filter the feed, mentions link to the member's profile. */
export function BodyWithEntities({ body }: { body: string }) {
  const parts = body.split(/(#\w+|@[a-zA-Z0-9_]+)/g);

  return (
    <p className="whitespace-pre-wrap text-sm">
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          return (
            <Link key={i} href={`/community?hashtag=${part.slice(1).toLowerCase()}`} className="font-medium text-primary hover:underline">
              {part}
            </Link>
          );
        }
        if (part.startsWith("@")) {
          return (
            <span key={i} className="font-medium text-primary">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export function HashtagChip({ tag }: { tag: string }) {
  return (
    <Link
      href={`/community?hashtag=${tag}`}
      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
    >
      #{tag}
    </Link>
  );
}
