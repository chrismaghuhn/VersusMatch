export type TemplateCredit = {
  storageName: string;
  label: string;
};

export type PartyTemplateCredits = {
  provider: string;
  sourceArchive: string;
  importedAt: string;
  attributionRequired: boolean;
  attributionText: string | null;
  usageNote: string;
  templates: TemplateCredit[];
};

export const PARTY_TEMPLATE_CREDITS: PartyTemplateCredits = {
  provider: "Memes templates -HD- (user-provided pack)",
  sourceArchive: "Memes templates -HD--20260601T184038Z-3-002.zip",
  importedAt: "2026-06-03",
  attributionRequired: false,
  attributionText: null,
  usageNote:
    "Static meme-format images with user-generated caption overlays in MemeFight Party private rooms.",
  templates: [
    { storageName: "meme-01-sleep-real-shit.jpg", label: "I sleep / Real shit (two-panel)" },
    { storageName: "meme-02-distracted-boyfriend.jpg", label: "Distracted boyfriend (empty template)" },
    { storageName: "meme-03-expanding-brain.jpg", label: "Expanding brain (four-panel)" },
    { storageName: "meme-04-gta-ah-shit.png", label: "GTA — Ah shit, here we go again" },
    { storageName: "meme-05-two-guys-bus.jpg", label: "Two guys on a bus (split)" },
    { storageName: "meme-06-gru-presentation.png", label: "Gru presentation board" },
    { storageName: "meme-07-this-is-fine.jpg", label: "This is fine" },
    { storageName: "meme-08-omni-man-blank.jpg", label: "Omni-man comparison (blank)" },
  ],
};
