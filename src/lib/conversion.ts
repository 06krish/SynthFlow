/**
 * Unit conversion factor reference map.
 * Each unit is mapped to a physical dimension and its factor relative to the absolute base:
 * - Weight base is 'g' (factor = 1)
 * - Volume base is 'mL' (factor = 1)
 * - Count base is 'item' (factor = 1)
 */
export const UNIT_FACTORS: Record<string, { dimension: string; factor: number }> = {
  // Weight
  g: { dimension: 'weight', factor: 1 },
  kg: { dimension: 'weight', factor: 1000 }, // 1 kg = 1000 g

  // Volume
  mL: { dimension: 'volume', factor: 1 },
  L: { dimension: 'volume', factor: 1000 },  // 1 L = 1000 mL

  // Count
  item: { dimension: 'count', factor: 1 }      // Count has no fractions
};

/**
 * Converts a quantity from one unit to another within the same dimension.
 * Example: convertQuantity(500, 'g', 'kg') => 0.5
 */
export function convertQuantity(amount: number, fromUnit: string, toUnit: string): number {
  const fromInfo = UNIT_FACTORS[fromUnit];
  const toInfo = UNIT_FACTORS[toUnit];

  // Validate that the units exist
  if (!fromInfo || !toInfo) {
    throw new Error(`Invalid unit: "${fromUnit}" or "${toUnit}" is not supported.`);
  }

  // Validate that they are in the same physical dimension
  if (fromInfo.dimension !== toInfo.dimension) {
    throw new Error(
      `Cannot convert "${fromUnit}" (${fromInfo.dimension}) to "${toUnit}" (${toInfo.dimension}). They must belong to the same dimension.`
    );
  }

  // Math formula: amount * (fromFactor / toFactor)
  // E.g., converting 500g to kg: 500 * (1 / 1000) = 0.5
  return amount * (fromInfo.factor / toInfo.factor);
}

/**
 * Calculates the subtotal price in INR for an ordered item.
 * @param quantity The quantity ordered (e.g. 500)
 * @param fromUnit The unit of the quantity ordered (e.g. 'g')
 * @param baseUnit The default unit for the product's base price (e.g. 'kg')
 * @param basePrice The price rate per base unit in INR (e.g. 250.00)
 */
export function calculateItemPrice(
  quantity: number,
  fromUnit: string,
  baseUnit: string,
  basePrice: number
): number {
  // 1. Convert the ordered quantity to the product's base price unit
  const convertedQuantity = convertQuantity(quantity, fromUnit, baseUnit);

  // 2. Subtotal = converted quantity * unit price rate
  return convertedQuantity * basePrice;
}
