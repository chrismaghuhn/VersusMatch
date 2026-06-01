export type AvatarId =
  | "gremlin"
  | "skull"
  | "cyclops"
  | "fox"
  | "demon"
  | "clown"
  | "robot"
  | "ghost"
  | "crown"
  | "alien"
  | "cat"
  | "frog"
  | "shroom"
  | "bandit"
  | "rage"
  | "ghoul"
  | "wizard"
  | "pilot"
  | "blob"
  | "pixel"
  | "vampire"
  | "shark"
  | "punk"
  | "snake";

export const AVATAR_IDS: AvatarId[] = [
  "gremlin",
  "skull",
  "cyclops",
  "fox",
  "demon",
  "clown",
  "robot",
  "ghost",
  "crown",
  "alien",
  "cat",
  "frog",
  "shroom",
  "bandit",
  "rage",
  "ghoul",
  "wizard",
  "pilot",
  "blob",
  "pixel",
  "vampire",
  "shark",
  "punk",
  "snake",
];

export function isAvatarId(value: string): value is AvatarId {
  return (AVATAR_IDS as readonly string[]).includes(value);
}
