/**
 * Maps a Pokémon hold item name to its corresponding image asset path.
 * Images are located in the /items directory and follow the SV (Scarlet/Violet) naming convention.
 * 
 * @param itemName The name of the item (e.g., "Choice Band", "King's Rock")
 * @returns The absolute path to the image asset, or null if no item is selected
 */
export const getItemImageUrl = (itemName: string | null): string | null => {
  if (!itemName || itemName === 'None' || itemName === '(No Item)') {
    return null;
  }

  // Normalize the name:
  // 1. Replace spaces with underscores
  // 2. The assets follow the pattern "{Normalized_Name}_SV.png"
  // Example: "Choice Band" -> "Choice_Band_SV.png"
  // Example: "King's Rock" -> "King's_Rock_SV.png"
  // Example: "Heavy-Duty Boots" -> "Heavy-Duty_Boots_SV.png"
  
  const normalizedName = itemName.replace(/ /g, '_');
  
  // Note: We use absolute paths from the public directory/root if served there,
  // The items are now located in public/images/items/
  return `/images/items/${normalizedName}_SV.png`;
};
