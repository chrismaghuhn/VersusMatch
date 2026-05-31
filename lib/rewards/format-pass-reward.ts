export function formatPassReward(reward: string): string {
  return reward
    .split("+")
    .map((part) => {
      const [kind, value] = part.split(":");
      const label = value?.replace(/_/g, " ") ?? part;
      if (kind === "title") return `Title: ${label}`;
      if (kind === "badge") return `Badge: ${label}`;
      if (kind === "share_card") return `Share card: ${label}`;
      return part;
    })
    .join(" · ");
}

export function seasonDaysRemaining(endsAt: string): number {
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
