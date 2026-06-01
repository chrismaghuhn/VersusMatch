export type TemplateCredit = {
  storageName: string;
  label: string;
};

export type PartyTemplateCredits = {
  provider: string;
  sourceArchive: string;
  licenseName: string;
  licenseVersion: string;
  purchaseDate: string;
  licenseHolder: string;
  governingLaw: string;
  importedAt: string;
  attributionRequired: boolean;
  attributionText: string | null;
  usageNote: string;
  templates: TemplateCredit[];
};

export const PARTY_TEMPLATE_CREDITS: PartyTemplateCredits = {
  provider: "Memes templates -HD- (licensed meme archive pack)",
  sourceArchive: "Memes templates -HD--20260601T184038Z-3-002.zip",
  licenseName: "Meme Archive License",
  licenseVersion: "1.0",
  purchaseDate: "2026-06-01",
  licenseHolder: "VersusMatch (licensed purchaser)",
  governingLaw: "Germany",
  importedAt: "2026-06-06",
  attributionRequired: false,
  attributionText: null,
  usageNote:
    "Licensed for commercial use, modification, and caption overlay. No attribution required. Third-party rights in individual memes may still apply — see LICENSE.txt.",
  templates: [
    { storageName: "meme-01-sleep-real-shit.jpg", label: "I sleep / Real shit (two-panel)" },
    { storageName: "meme-02-distracted-boyfriend.jpg", label: "Distracted boyfriend (empty template)" },
    { storageName: "meme-03-expanding-brain.jpg", label: "Expanding brain (four-panel)" },
    { storageName: "meme-04-gta-ah-shit.png", label: "GTA — Ah shit, here we go again" },
    { storageName: "meme-05-two-guys-bus.jpg", label: "Two guys on a bus (split)" },
    { storageName: "meme-06-gru-presentation.png", label: "Gru presentation board" },
    { storageName: "meme-07-this-is-fine.jpg", label: "This is fine" },
    { storageName: "meme-08-omni-man-blank.jpg", label: "Omni-man comparison (blank)" },
    { storageName: "meme-09-adios-wormhole.png", label: "Adios wormhole (empty template)" },
    { storageName: "meme-10-press-f.jpg", label: "Press F to pay respects (blank)" },
    { storageName: "meme-11-soyjak-chad.jpg", label: "Soyjak fans vs Chad fans" },
    { storageName: "meme-12-pepe-wojak.jpg", label: "Pepe vs Wojak" },
    { storageName: "meme-13-swole-cheems.jpg", label: "Swole Cheems vs small Doge" },
    { storageName: "meme-14-indiana-jones.jpg", label: "Indiana Jones idol swap (clean)" },
    { storageName: "meme-15-dune-box.jpg", label: "Dune pain box (blank)" },
    { storageName: "meme-16-swallow-pills.jpg", label: "Hard to swallow pills" },
    { storageName: "meme-17-infinity-stones.png", label: "Finally I have them all (blank)" },
    { storageName: "meme-18-windows-xp.jpg", label: "Windows XP task successful" },
    { storageName: "meme-19-guess-ill-die.jpg", label: "Guess I'll die" },
    { storageName: "meme-20-fire-rescue.jpg", label: "Fire rescue choice" },
  ],
};
