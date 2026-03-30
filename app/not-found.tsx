import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl items-center px-4 py-10">
      <div className="w-full">
        <EmptyState
          title="Page not found"
          description="The page you were looking for is not available."
          actionHref="/"
          actionLabel="Back home"
        />
      </div>
    </main>
  );
}
