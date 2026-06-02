import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ code: string }> };

export default async function BoardBrawlJoinPage({ params }: PageProps) {
  const { code } = await params;
  redirect(`/board-brawl?join=${encodeURIComponent(code)}`);
}
