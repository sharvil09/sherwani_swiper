import mapJson from "./palette-map.json";

export const PALETTE_OF_URL: Record<string, string> = mapJson as Record<string, string>;

export const BUCKETS = [
  { id: "ivory", title: "Ivory & Gold — the core", blurb: "Off-white and cream sherwanis with gold embroidery. This is the foundation of the whole board." },
  { id: "maroon", title: "Red & Maroon accents", blurb: "The color story, carried by velvet dupattas, stoles and detailing — rarely the sherwani itself." },
  { id: "jewel", title: "Jewel tones", blurb: "Navy, emerald and deep statement pieces. Evening and standout options." },
  { id: "pastel", title: "Pastels", blurb: "Blush, powder blue and soft daytime looks for haldi / mehndi hours." },
  { id: "new", title: "New likes", blurb: "Liked after the style analysis — not yet classified." },
] as const;

export type BucketId = (typeof BUCKETS)[number]["id"];

export function bucketOf(url: string): BucketId {
  const b = PALETTE_OF_URL[url];
  return b === "ivory" || b === "maroon" || b === "jewel" || b === "pastel" ? b : "new";
}

export const PROFILE_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "The palette (measured across all liked photos)",
    body: "Roughly half the board reads gold and amber — ivory-gold sherwanis, zardozi embroidery and warm tones. About a quarter is neutrals (whites, creams, beiges), and around 14% is red and maroon, carried almost entirely by dupattas and stoles rather than the sherwani itself. Blue, green and pink barely appear on garments.",
  },
  {
    heading: "Pattern 1 — Ivory base, always",
    body: "Nearly every like is an off-white or cream sherwani with gold embroidery: floral jaal, tone-on-tone threadwork, dense but never gaudy. This is the non-negotiable core of the taste.",
  },
  {
    heading: "Pattern 2 — Contrast dupatta",
    body: "The color in this board comes from the stole, not the sherwani. Maroon velvet with a gold border is the recurring favorite; tonal ivory is the quieter second choice.",
  },
  {
    heading: "Pattern 3 — Layered jewelry",
    body: "Multi-strand pearl malas show up constantly, with emerald-green bead necklaces as the secondary signature. The styling is maximalist accessorizing, not minimal.",
  },
  {
    heading: "Pattern 4 — Full royal styling",
    body: "Safa (turban) with kalgi brooch and feather, kamarbandh waist sash, churidar with embroidered mojari. The liked looks are complete head-to-toe outfits, not separates.",
  },
  {
    heading: "Pattern 5 — The outliers",
    body: "A navy velvet with silver work, a powder blue and a blush pink also made the cut — all daytime or evening statement pieces, all still heavily accessorized. They point to how the wardrobe splits by event.",
  },
  {
    heading: "In words",
    body: "Regal ivory-and-gold traditionalist. Mughal-court maximalism: classic silhouette, rich embellishment, and the personality carried by accessories — pearls, emerald, maroon velvet, feathered safa. Timeless with the richness turned up; not modern-minimal, not quirky.",
  },
  {
    heading: "Suggestions for reviewers",
    body: "1) Lock the formula for the main ceremony: ivory sherwani with gold jaal, maroon velvet dupatta, pearl mala with an emerald accent, cream safa with kalgi. 2) Assign the outliers to events: navy velvet for a reception or sangeet night; blush pink or powder blue for haldi or mehndi daytime. 3) The gap to fill: there is no emerald or green garment and almost no pastel green — given how often green beads appear, a deep-green velvet stole or safa against ivory would land exactly on this taste.",
  },
];
