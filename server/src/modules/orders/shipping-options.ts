export const shippingOptions = [
  { state: "Lagos", zone: "Lagos", shippingFee: "2500.00" },
  { state: "Ekiti", zone: "South West", shippingFee: "4000.00" },
  { state: "Ogun", zone: "South West", shippingFee: "4000.00" },
  { state: "Ondo", zone: "South West", shippingFee: "4000.00" },
  { state: "Osun", zone: "South West", shippingFee: "4000.00" },
  { state: "Oyo", zone: "South West", shippingFee: "4000.00" },
  { state: "Abia", zone: "National", shippingFee: "6500.00" },
  { state: "Adamawa", zone: "National", shippingFee: "6500.00" },
  { state: "Akwa Ibom", zone: "National", shippingFee: "6500.00" },
  { state: "Anambra", zone: "National", shippingFee: "6500.00" },
  { state: "Bauchi", zone: "National", shippingFee: "6500.00" },
  { state: "Bayelsa", zone: "National", shippingFee: "6500.00" },
  { state: "Benue", zone: "National", shippingFee: "6500.00" },
  { state: "Borno", zone: "National", shippingFee: "6500.00" },
  { state: "Cross River", zone: "National", shippingFee: "6500.00" },
  { state: "Delta", zone: "National", shippingFee: "6500.00" },
  { state: "Ebonyi", zone: "National", shippingFee: "6500.00" },
  { state: "Edo", zone: "National", shippingFee: "6500.00" },
  { state: "Enugu", zone: "National", shippingFee: "6500.00" },
  { state: "Gombe", zone: "National", shippingFee: "6500.00" },
  { state: "Imo", zone: "National", shippingFee: "6500.00" },
  { state: "Jigawa", zone: "National", shippingFee: "6500.00" },
  { state: "Kaduna", zone: "National", shippingFee: "6500.00" },
  { state: "Kano", zone: "National", shippingFee: "6500.00" },
  { state: "Katsina", zone: "National", shippingFee: "6500.00" },
  { state: "Kebbi", zone: "National", shippingFee: "6500.00" },
  { state: "Kogi", zone: "National", shippingFee: "6500.00" },
  { state: "Kwara", zone: "National", shippingFee: "6500.00" },
  { state: "Nasarawa", zone: "National", shippingFee: "6500.00" },
  { state: "Niger", zone: "National", shippingFee: "6500.00" },
  { state: "Plateau", zone: "National", shippingFee: "6500.00" },
  { state: "Rivers", zone: "National", shippingFee: "6500.00" },
  { state: "Sokoto", zone: "National", shippingFee: "6500.00" },
  { state: "Taraba", zone: "National", shippingFee: "6500.00" },
  { state: "Yobe", zone: "National", shippingFee: "6500.00" },
  { state: "Zamfara", zone: "National", shippingFee: "6500.00" },
  { state: "Federal Capital Territory", zone: "National", shippingFee: "6500.00" },
] as const

export type ShippingOption = (typeof shippingOptions)[number]

export function findShippingOption(state: unknown): ShippingOption | undefined {
  if (typeof state !== "string") return undefined
  const normalized = state.trim().toLocaleLowerCase("en-NG")
  return shippingOptions.find((option) => option.state.toLocaleLowerCase("en-NG") === normalized)
}
