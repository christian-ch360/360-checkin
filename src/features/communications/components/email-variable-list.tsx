"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The variables a template can safely use, derived from real data this
 * template key can actually supply (see getAvailableVariables) — never a
 * hand-typed guess, so nothing shown here can produce an "unknown variable"
 * validation error if used as-is.
 */
export function EmailVariableList({
  variables,
  onInsert,
}: {
  variables: string[];
  onInsert: (token: string) => void;
}) {
  function copy(token: string) {
    navigator.clipboard
      .writeText(`{{${token}}}`)
      .then(() => toast.success(`{{${token}}} copied`))
      .catch(() => toast.error("Couldn't copy"));
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Available Variables</CardTitle>
      </CardHeader>
      <CardContent>
        {variables.length === 0 ? (
          <p className="text-sm text-muted-foreground">No variables available for this template.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {variables.map((token) => (
              <div key={token} className="flex items-center overflow-hidden rounded-md border">
                <button
                  type="button"
                  onClick={() => onInsert(`{{${token}}}`)}
                  className="px-2 py-1 font-mono text-xs hover:bg-muted"
                  title={`Insert {{${token}}} at cursor`}
                >
                  {`{{${token}}}`}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-full rounded-none border-l px-1.5"
                  onClick={() => copy(token)}
                  title={`Copy {{${token}}}`}
                >
                  <Copy className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
