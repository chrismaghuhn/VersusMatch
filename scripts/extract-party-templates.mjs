/**
 * Copy curated meme templates from the extracted ZIP folder into import/files/.
 *
 * Source: assets/party-templates/import/extracted/Memes templates -HD-/
 * Run: node scripts/extract-party-templates.mjs
 */
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extractedDir = resolve(
  root,
  "assets/party-templates/import/extracted/Memes templates -HD-"
);
const filesDir = resolve(root, "assets/party-templates/import/files");

/** @type {{ source: string; dest: string }[]} */
const PICKS = [
  {
    source: "Adios Wormhole - Full Clean Empty Template.png",
    dest: "meme-09-adios-wormhole.png",
  },
  {
    source: "press f to pay respects - blank.jpg",
    dest: "meme-10-press-f.jpg",
  },
  {
    source: "Soyjak fans vs Chad fans.jpg",
    dest: "meme-11-soyjak-chad.jpg",
  },
  {
    source: "pepe frog vs wojak.jpg",
    dest: "meme-12-pepe-wojak.jpg",
  },
  {
    source: "Swole Cheems Chad Doge.jpg",
    dest: "meme-13-swole-cheems.jpg",
  },
  {
    source: "Indiana Jones totem - clean 2.jpg",
    dest: "meme-14-indiana-jones.jpg",
  },
  {
    source: "dune 2021 box blank.jpg",
    dest: "meme-15-dune-box.jpg",
  },
  {
    source: "Hard to swallow pills pilules médicaments avaler.jpg",
    dest: "meme-16-swallow-pills.jpg",
  },
  {
    source: "Finally i have them all - blank.png",
    dest: "meme-17-infinity-stones.png",
  },
  {
    source: "Windows xp task successful.jpg",
    dest: "meme-18-windows-xp.jpg",
  },
  {
    source: "guess ill die.jpg",
    dest: "meme-19-guess-ill-die.jpg",
  },
  {
    source: "Fire rescue - feu incendie choisir sauver.jpg",
    dest: "meme-20-fire-rescue.jpg",
  },
];

mkdirSync(filesDir, { recursive: true });

let copied = 0;
for (const { source, dest } of PICKS) {
  const from = resolve(extractedDir, source);
  const to = resolve(filesDir, dest);
  if (!existsSync(from)) {
    console.error("Missing source:", source);
    process.exit(1);
  }
  copyFileSync(from, to);
  console.log("copied", dest, "<-", source);
  copied++;
}

console.log(`\n${copied} templates copied to import/files/`);
