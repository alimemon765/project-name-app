"use client";
import { EmptyState } from "@/components/EmptyState";

// Route error boundary: a render failure keeps the shell and offers a retry (components.md: error states).
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="pt-4">
      <EmptyState title="Something went wrong on this screen" body="The rest of the app still works. Try again, or come back in a minute.">
        <button type="button" onClick={reset} className="text-body underline underline-offset-4">Try again</button>
      </EmptyState>
    </div>
  );
}
