"use client";

import Image from "next/image";
import Link from "next/link";
import type { FeedBattle } from "@/lib/database.types";
import { getPublicImageUrl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

type BattleCardProps = {
  battle: FeedBattle;
};

export function BattleCard({ battle }: BattleCardProps) {
  const optionA = battle.battle_options[0];
  const optionB = battle.battle_options[1];
  const imageA = getPublicImageUrl(optionA?.image_path);
  const imageB = getPublicImageUrl(optionB?.image_path);
  const previewImage = imageA ?? imageB;

  return (
    <Link href={`/b/${battle.slug}`}>
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[16/10] bg-secondary">
          {previewImage ? (
            <Image
              src={previewImage}
              alt={battle.title}
              fill
              className="object-cover transition-transform group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {optionA?.label} vs {optionB?.label}
            </div>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <h3 className="line-clamp-2 font-semibold leading-snug">{battle.title}</h3>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {optionA?.label} vs {optionB?.label}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {battle.total_votes} Votes
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
