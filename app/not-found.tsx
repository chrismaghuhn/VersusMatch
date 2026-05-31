import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1
        className="text-white"
        style={{ fontWeight: 900, fontSize: 48, letterSpacing: "-0.04em" }}
      >
        404
      </h1>
      <p className="mt-3 text-white/50">
        This battle does not exist or is no longer active.
      </p>
      <Link href="/feed" className="mt-6">
        <Button>Go to Feed</Button>
      </Link>
    </div>
  );
}
