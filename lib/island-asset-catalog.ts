/** Closed local review catalog. Never resolve an asset URL from user input. */
export const ISLAND_ASSET_CATALOG = {
  bridge: {
    worldStatus: "not-mounted",
    title: "Ponte tropicale", label: "ponte tropicale",
    file: "bridge-v1.glb", url: "/models/archipelago/bridge-v1.glb",
    root: "BridgeAsset__walking_surface_pivot", triangles: 120_000,
    sheet: "reference-sheets-v1/10-timber-bridge.png",
    alt: "Tavola di riferimento multivista del ponte tropicale",
  },
  palm: {
    worldStatus: "not-mounted",
    title: "Palma curva", label: "palma curva",
    file: "palm-v1.glb", url: "/models/archipelago/palm-v1.glb",
    root: "Palm_V1_Origin_At_Trunk_Base", triangles: 150_000,
    sheet: "reference-sheets-v1/11-curved-palm.png",
    alt: "Tavola di riferimento multivista della palma curva",
  },
  cliff: {
    worldStatus: "not-mounted",
    title: "Scogliera v1", label: "modulo scogliera v1",
    file: "cliff-v1.glb", url: "/models/archipelago/cliff-v1.glb",
    root: "Cliff_V1_Origin_At_Coast_Base", triangles: 100_000,
    sheet: "reference-sheets-v1/12-cliff-module.png",
    alt: "Tavola di riferimento multivista del modulo scogliera v1",
  },
  studio: {
    worldStatus: "not-mounted",
    title: "Casa-studio v1", label: "casa-studio v1",
    file: "studio-v1.glb", url: "/models/archipelago/studio-v1.glb",
    root: "HomeStudio_V1_Origin_At_Deck_Centre", triangles: 180_000,
    sheet: "reference-sheets-v1/02-home-studio.png",
    alt: "Tavola di riferimento multivista della casa-studio",
  },
  "cliff-v2": {
    worldStatus: "not-mounted",
    title: "Scogliera v2", label: "modulo scogliera v2",
    file: "cliff-v2.glb", url: "/models/archipelago/cliff-v2.glb",
    root: "Cliff_V2_Origin_At_Coast_Base", triangles: 100_000,
    sheet: "reference-sheets-v2/12-cliff-module.png",
    alt: "Tavola di riferimento multivista del modulo scogliera v2",
  },
  "studio-v2": {
    worldStatus: "batched-prototype",
    title: "Casa-studio v2", label: "casa-studio v2",
    file: "studio-v2.glb", url: "/models/archipelago/studio-v2.glb",
    root: "HomeStudio_V2_Origin_At_Deck_Centre", triangles: 180_000,
    sheet: "reference-sheets-v1/02-home-studio.png",
    alt: "Tavola di riferimento multivista della casa-studio",
  },
  workshop: {
    worldStatus: "batched-prototype",
    title: "Officina digitale", label: "officina digitale",
    file: "workshop-v1.glb", url: "/models/archipelago/workshop-v1.glb",
    root: "DigitalWorkshop_V1_Origin_At_Deck_Centre", triangles: 180_000,
    sheet: "reference-sheets-v3/03-digital-workshop.png",
    alt: "Tavola multivista dell’officina digitale con pergole asimmetriche",
  },
  archive: {
    worldStatus: "batched-prototype",
    title: "Archivio e osservatorio", label: "archivio e osservatorio",
    file: "archive-v1.glb", url: "/models/archipelago/archive-v1.glb",
    root: "ArchiveObservatory_V1_Origin_At_Deck_Centre", triangles: 180_000,
    sheet: "reference-sheets-v1/06-archive-observatory.png",
    alt: "Tavola multivista dell’archivio con biblioteca aperta e cupola dell’osservatorio",
  },
  laboratory: {
    worldStatus: "batched-prototype",
    title: "Laboratorio sospeso", label: "laboratorio sospeso",
    file: "suspended-lab-v1.glb", url: "/models/archipelago/suspended-lab-v1.glb",
    root: "SuspendedLab_V1_Origin_At_Deck_Centre", triangles: 180_000,
    sheet: "reference-sheets-v1/04-suspended-lab.png",
    alt: "Tavola multivista del laboratorio sospeso con pergole, gru e strumenti meccanici",
  },
  harbor: {
    worldStatus: "batched-prototype",
    title: "Porto di benvenuto", label: "porto di benvenuto",
    file: "welcome-harbor-v1.glb", url: "/models/archipelago/welcome-harbor-v1.glb",
    root: "WelcomeHarbor_V1_Origin_At_Deck_Centre", triangles: 180_000,
    sheet: "reference-sheets-v1/01-welcome-office.png",
    alt: "Tavola multivista del porto di benvenuto con piccolo ufficio tropicale e mappa",
  },
  dance: {
    worldStatus: "batched-prototype",
    title: "Padiglione della danza", label: "padiglione della danza",
    file: "dance-pavilion-v1.glb", url: "/models/archipelago/dance-pavilion-v1.glb",
    root: "DancePavilion_V1_Origin_At_Deck_Centre", triangles: 180_000,
    sheet: "reference-sheets-v5/14-dance-pavilion.png",
    alt: "Tavola multivista del padiglione aperto con parquet, pergola, tende e vegetazione tropicale",
  },
  lighthouse: {
    worldStatus: "batched-prototype",
    title: "Faro e casa-radio", label: "faro e casa-radio",
    file: "contact-lighthouse-v1.glb", url: "/models/archipelago/contact-lighthouse-v1.glb",
    root: "ContactLighthouse_V1_Origin_At_Tower_Base", triangles: 180_000,
    sheet: "reference-sheets-v6/15-contact-lighthouse.png",
    alt: "Tavola multivista del faro in pietra chiara con lanterna ottagonale e casa-radio aperta",
  },
  "projects-terrain": {
    worldStatus: "not-mounted",
    title: "Isola Progetti · terreno", label: "terreno dell’isola Progetti",
    file: "projects-island-v1.glb", url: "/models/archipelago/projects-island-v1.glb",
    root: "ProjectsIsland_V1_Origin_At_Sea_Level", triangles: 100_000,
    sheet: "island-reconstruction-v1/projects-concept-oblique.png",
    alt: "Concept di terreno calcareo con radura centrale e tre rilievi posteriori; riferimento artistico non ortografico",
  },
  "projects-terrain-v2": {
    worldStatus: "not-mounted",
    title: "Isola Progetti · studio v2", label: "nuovo terreno dell’isola Progetti",
    file: "projects-island-v2-r8.glb", url: "/models/archipelago/projects-island-v2-r8.glb",
    root: "ProjectsIsland_V2_Origin_At_Sea_Level", triangles: 180_000,
    sheet: "island-reconstruction-v2/projects-turnaround-v2.png",
    alt: "Guida direzionale della nuova isola senza edifici, con radura color miele, cresta posteriore e contrafforti calcarei; non CAD ortografico",
  },
} as const;

export type IslandAssetId = keyof typeof ISLAND_ASSET_CATALOG;
/** The original three routes retain their identity and order. */
export const ISLAND_ASSET_IDS = ["bridge", "palm", "cliff", "studio", "cliff-v2", "studio-v2", "workshop", "archive", "laboratory", "harbor", "dance", "lighthouse", "projects-terrain", "projects-terrain-v2"] as const satisfies readonly IslandAssetId[];
export const ISLAND_ASSET_MASTER_PROFILE = { bytes: 8 * 1024 * 1024, materials: 12, textures: 12 } as const;
export const ISLAND_ASSET_VARIANTS = ["master", "batched"] as const;
export type IslandAssetVariant = typeof ISLAND_ASSET_VARIANTS[number];

export function getIslandAssetEntry(id: string | null | undefined) {
  return id && Object.hasOwn(ISLAND_ASSET_CATALOG, id)
    ? ISLAND_ASSET_CATALOG[id as IslandAssetId]
    : undefined;
}

export function getIslandAssetVariant(value: string | null | undefined): IslandAssetVariant | undefined {
  if (value === null || value === undefined) return "master";
  return value === "master" || value === "batched" ? value : undefined;
}

/** Variant names never enter a path: derive siblings from the closed catalog. */
export function getIslandAssetSelection(id: string | null | undefined, value: string | null | undefined) {
  const entry = getIslandAssetEntry(id), variant = getIslandAssetVariant(value);
  if (!entry || !variant) return undefined;
  return {
    ...entry, variant,
    file: variant === "batched" ? entry.file.replace(/\.glb$/, "-batched.glb") : entry.file,
    url: variant === "batched" ? entry.url.replace(/\.glb$/, "-batched.glb") : entry.url,
  };
}
