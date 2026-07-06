export const MEGA_STONES = new Set([
  "Abomasite", "Absolite", "Aerodactylite", "Aggronite", "Alakazite",
  "Altarianite", "Ampharosite", "Audinite", "Banettite", "Beedrillite",
  "Black Augurite", "Blastoisinite", "Blazikenite", "Cameruptite",
  "Chandelurite", "Charizardite X", "Charizardite Y", "Chesnaughtite",
  "Chimechite", "Clefablite", "Crabominite", "Delphoxite", "Diancite",
  "Dragoninite", "Drampanite", "Emboarite", "Excadrite", "Feraligite",
  "Floettite", "Froslassite", "Galladite", "Garchompite", "Gardevoirite",
  "Gengarite", "Glalitite", "Glimmoranite", "Golurkite", "Greninjite",
  "Gyaradosite", "Hawluchanite", "Heracronite", "Houndoominite",
  "Kangaskhanite", "Latiasite", "Latiosite", "Lopunnite", "Lucarionite",
  "Manectite", "Mawilite", "Medichamite", "Meganiumite", "Meowsticite",
  "Metagrossite", "Mewtwonite X", "Mewtwonite Y", "Pidgeotite", "Pinsirite",
  "Sablenite", "Salamencite", "Scraftite", "Sceptilite", "Scizorite", "Scovillainite",
  "Sharpedonite", "Skarmorite", "Slowbronite", "Starminite", "Steelixite",
  "Swampertite", "Tyranitarite", "Venusaurite", "Victreebelite"
]);

/**
 * Maps a Pokémon hold item name to its corresponding image asset path.
 * Images are located in the /items directory and follow the SV (Scarlet/Violet) naming convention.
 * 
 * @param itemName The name of the item (e.g., "Choice Band", "King's Rock", "Charizardite Y")
 * @returns The absolute path to the image asset, or null if no item is selected
 */
export const getItemImageUrl = (itemName: string | null): string | null => {
  if (!itemName || itemName === 'None' || itemName === '(No Item)') {
    return null;
  }

  // Normalize the name:
  // 1. Replace spaces with underscores
  
  const normalizedName = itemName.replace(/ /g, '_');
  
  if (MEGA_STONES.has(itemName)) {
    return `/images/mega-stone/Bag_${normalizedName}_CP_Sprite.png`;
  }
  
  // Note: We use absolute paths from the public directory/root if served there,
  // The items are now located in public/images/items/
  return `/images/items/${normalizedName}_SV.png`;
};
