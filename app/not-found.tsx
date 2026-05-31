import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold">Nicht gefunden</h1>
      <p className="mt-3 text-muted-foreground">
        Dieses Battle existiert nicht oder ist nicht mehr aktiv.
      </p>
      <Link href="/feed" className="mt-6">
        <Button>Zum Feed</Button>
      </Link>
    </div>
  );
}
