import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { categories, products } from "./schema.js";

const categorySeed = [
  {
    name: "Fashion & accessories",
    slug: "fashion",
    description: "Everyday fashion and finishing touches.",
  },
  {
    name: "Tech & electronics",
    slug: "electronics",
    description: "Useful technology for work, home, and travel.",
  },
  {
    name: "Beauty & self-care",
    slug: "beauty",
    description: "Everyday personal care and beauty essentials.",
  },
  {
    name: "Home & living",
    slug: "home",
    description: "Thoughtful details for a comfortable home.",
  },
  {
    name: "Lifestyle & more",
    slug: "lifestyle",
    description: "Practical essentials for daily routines and travel.",
  },
] as const;

type SeedProduct = {
  name: string;
  slug: string;
  categorySlug: (typeof categorySeed)[number]["slug"];
  description: string;
  price: string;
  stock: number;
  imageUrl: string;
};

function unsplash(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&q=85`;
}

const productSeed: SeedProduct[] = [
  // Fashion & accessories — 12
  { name: "Everyday Canvas Tote", slug: "everyday-canvas-tote", categorySlug: "fashion", description: "A versatile canvas tote for errands, work, and everyday essentials.", price: "18500.00", stock: 18, imageUrl: unsplash("photo-1544816155-12df9643f363") },
  { name: "Classic Low-Top Sneakers", slug: "classic-low-top-sneakers", categorySlug: "fashion", description: "Clean, versatile low-top sneakers designed for everyday outfits.", price: "42000.00", stock: 12, imageUrl: unsplash("photo-1542291026-7eec264c27ff") },
  { name: "Minimal Leather Wallet", slug: "minimal-leather-wallet", categorySlug: "fashion", description: "A compact wallet with a simple profile for daily carry.", price: "16500.00", stock: 15, imageUrl: unsplash("photo-1627123424574-724758594e93") },
  { name: "Everyday Crossbody Bag", slug: "everyday-crossbody-bag", categorySlug: "fashion", description: "A practical crossbody bag for keeping everyday essentials close.", price: "27500.00", stock: 9, imageUrl: unsplash("photo-1584917865442-de89df76afd3") },
  { name: "Classic UV Sunglasses", slug: "classic-uv-sunglasses", categorySlug: "fashion", description: "A timeless sunglasses silhouette for bright days and casual wear.", price: "14500.00", stock: 20, imageUrl: unsplash("photo-1511499767150-a48a237f0083") },
  { name: "Everyday Leather Belt", slug: "everyday-leather-belt", categorySlug: "fashion", description: "A simple belt designed to pair with casual and smart-casual outfits.", price: "12000.00", stock: 14, imageUrl: unsplash("photo-1624222247344-550fb8d9b7a2") },
  { name: "Compact Travel Backpack", slug: "compact-travel-backpack", categorySlug: "fashion", description: "A lightweight backpack with room for daily essentials and short trips.", price: "38500.00", stock: 8, imageUrl: unsplash("photo-1553062407-98eeb64c6a62") },
  { name: "Everyday Analog Watch", slug: "everyday-analog-watch", categorySlug: "fashion", description: "A minimal analog watch with a clean face and versatile styling.", price: "35500.00", stock: 7, imageUrl: unsplash("photo-1523275335684-37898b6baf30") },
  { name: "Soft Knit Beanie", slug: "soft-knit-beanie", categorySlug: "fashion", description: "A soft knit beanie for a comfortable finishing touch.", price: "9500.00", stock: 16, imageUrl: unsplash("photo-1576871337622-98d48d1cf531") },
  { name: "Everyday Hoop Earrings", slug: "everyday-hoop-earrings", categorySlug: "fashion", description: "Simple hoop earrings designed to work with day-to-day looks.", price: "8500.00", stock: 22, imageUrl: unsplash("photo-1535632066927-ab7c9ab60908") },
  { name: "Structured Mini Handbag", slug: "structured-mini-handbag", categorySlug: "fashion", description: "A structured mini handbag for outings and light everyday carry.", price: "32000.00", stock: 6, imageUrl: unsplash("photo-1566150905458-1bf1fc113f0d") },
  { name: "Everyday Crew Socks Set", slug: "everyday-crew-socks-set", categorySlug: "fashion", description: "A multi-pair set of comfortable crew socks for daily use.", price: "6500.00", stock: 30, imageUrl: unsplash("photo-1586350977771-b3b0d50f2e5d") },

  // Tech & electronics — 12
  { name: "Studio Wireless Headphones", slug: "studio-wireless-headphones", categorySlug: "electronics", description: "Wireless over-ear headphones for music, calls, and focused work.", price: "68500.00", stock: 10, imageUrl: unsplash("photo-1505740420928-5e560c06d30e") },
  { name: "Essential Smart Watch", slug: "essential-smart-watch", categorySlug: "electronics", description: "A modern smartwatch for notifications, activity tracking, and daily routines.", price: "79500.00", stock: 8, imageUrl: unsplash("photo-1523275335684-37898b6baf30") },
  { name: "Wireless Earbuds", slug: "wireless-earbuds", categorySlug: "electronics", description: "Compact wireless earbuds for listening on the move.", price: "38500.00", stock: 14, imageUrl: unsplash("photo-1606220945770-b5b6c2c55bf1") },
  { name: "Portable Bluetooth Speaker", slug: "portable-bluetooth-speaker", categorySlug: "electronics", description: "A compact speaker for music at home or on the go.", price: "29500.00", stock: 11, imageUrl: unsplash("photo-1608043152269-423dbba4e7e1") },
  { name: "Fast USB-C Wall Charger", slug: "fast-usb-c-wall-charger", categorySlug: "electronics", description: "A compact USB-C charger for compatible phones and accessories.", price: "12500.00", stock: 25, imageUrl: unsplash("photo-1583394838336-acd977736f90") },
  { name: "Braided USB-C Cable", slug: "braided-usb-c-cable", categorySlug: "electronics", description: "A durable braided cable for charging compatible USB-C devices.", price: "4500.00", stock: 35, imageUrl: unsplash("photo-1615526675159-e248c3021d3f") },
  { name: "Adjustable Laptop Stand", slug: "adjustable-laptop-stand", categorySlug: "electronics", description: "An adjustable stand to create a more comfortable desk setup.", price: "22500.00", stock: 9, imageUrl: unsplash("photo-1527864550417-7fd91fc51a46") },
  { name: "Wireless Compact Mouse", slug: "wireless-compact-mouse", categorySlug: "electronics", description: "A compact wireless mouse for everyday laptop and desktop use.", price: "14500.00", stock: 17, imageUrl: unsplash("photo-1527814050087-3793815479db") },
  { name: "Mechanical-Style Keyboard", slug: "mechanical-style-keyboard", categorySlug: "electronics", description: "A practical keyboard with tactile-style keys for typing and desk work.", price: "32500.00", stock: 7, imageUrl: unsplash("photo-1587829741301-dc798b83add3") },
  { name: "1080p Web Camera", slug: "1080p-web-camera", categorySlug: "electronics", description: "A desktop webcam for video meetings and online learning.", price: "28500.00", stock: 6, imageUrl: unsplash("photo-1587826080692-f439cd0b70da") },
  { name: "Protective Phone Case", slug: "protective-phone-case", categorySlug: "electronics", description: "A slim protective case; check device compatibility before purchase.", price: "7500.00", stock: 24, imageUrl: unsplash("photo-1601593346740-925612772716") },
  { name: "Multi-Port USB Hub", slug: "multi-port-usb-hub", categorySlug: "electronics", description: "A compact hub for connecting compatible USB accessories to a computer.", price: "18500.00", stock: 10, imageUrl: unsplash("photo-1625842268584-8f3296236761") },

  // Beauty & self-care — 8
  { name: "Daily Glow Skincare Set", slug: "daily-glow-skincare-set", categorySlug: "beauty", description: "A sample skincare bundle for a simple daily self-care routine.", price: "24500.00", stock: 12, imageUrl: unsplash("photo-1608248543803-ba4f8c70ae0b") },
  { name: "Hydrating Face Moisturizer", slug: "hydrating-face-moisturizer", categorySlug: "beauty", description: "A daily moisturizer concept for a simple skincare routine; check ingredients before use.", price: "9800.00", stock: 18, imageUrl: unsplash("photo-1556229010-6c3f2c9ca5f8") },
  { name: "Gentle Facial Cleanser", slug: "gentle-facial-cleanser", categorySlug: "beauty", description: "A gentle cleanser concept for everyday facial cleansing; review the product label before use.", price: "8500.00", stock: 20, imageUrl: unsplash("photo-1556228720-195a672e8a03") },
  { name: "Vitamin C Serum", slug: "vitamin-c-serum", categorySlug: "beauty", description: "A serum-style skincare sample; confirm ingredients and suitability before use.", price: "13500.00", stock: 10, imageUrl: unsplash("photo-1601049541289-9b1b7bbbfe19") },
  { name: "Body Lotion", slug: "body-lotion", categorySlug: "beauty", description: "A daily body-care product concept for a simple moisturizing routine.", price: "7200.00", stock: 16, imageUrl: unsplash("photo-1608248543803-ba4f8c70ae0b") },
  { name: "Soft Makeup Brush Set", slug: "soft-makeup-brush-set", categorySlug: "beauty", description: "A set of soft brushes for applying and blending makeup.", price: "11500.00", stock: 13, imageUrl: unsplash("photo-1522335789203-aabd1fc54bc9") },
  { name: "Reusable Makeup Pads", slug: "reusable-makeup-pads", categorySlug: "beauty", description: "Reusable cleansing pads for a lower-waste personal-care routine.", price: "4500.00", stock: 25, imageUrl: unsplash("photo-1596462502278-27bfdc403348") },
  { name: "Manicure Care Kit", slug: "manicure-care-kit", categorySlug: "beauty", description: "A compact manicure kit for basic nail care at home.", price: "9500.00", stock: 11, imageUrl: unsplash("photo-1610992015732-2449b76344bc") },

  // Home & living — 10
  { name: "Sculpted Ceramic Vase", slug: "sculpted-ceramic-vase", categorySlug: "home", description: "A sculptural ceramic-style vase for shelves, tables, and sideboards.", price: "19800.00", stock: 8, imageUrl: unsplash("photo-1578500494198-246f612d3b3d") },
  { name: "Soft Woven Throw", slug: "soft-woven-throw", categorySlug: "home", description: "A soft decorative throw for a sofa, reading chair, or bed.", price: "32500.00", stock: 7, imageUrl: unsplash("photo-1600210492486-724fe5c67fb0") },
  { name: "Minimal Table Lamp", slug: "minimal-table-lamp", categorySlug: "home", description: "A simple table lamp concept for bedside tables and workspaces.", price: "28500.00", stock: 6, imageUrl: unsplash("photo-1507473885765-e6ed057f782c") },
  { name: "Cotton Cushion Cover Set", slug: "cotton-cushion-cover-set", categorySlug: "home", description: "A coordinated set of cushion covers to refresh a living space.", price: "14500.00", stock: 14, imageUrl: unsplash("photo-1584100936595-c0654b55a2e2") },
  { name: "Wooden Serving Tray", slug: "wooden-serving-tray", categorySlug: "home", description: "A versatile serving tray for coffee tables, breakfast, and hosting.", price: "12500.00", stock: 10, imageUrl: unsplash("photo-1603199506016-b9a594b593c0") },
  { name: "Scented Candle", slug: "scented-candle", categorySlug: "home", description: "A decorative candle concept for creating a calm atmosphere at home.", price: "7800.00", stock: 19, imageUrl: unsplash("photo-1603006905003-be475563bc59") },
  { name: "Compact Storage Basket", slug: "compact-storage-basket", categorySlug: "home", description: "A woven-style basket for organizing small household items.", price: "10500.00", stock: 12, imageUrl: unsplash("photo-1593085260707-5377ba37f868") },
  { name: "Stoneware Mug Set", slug: "stoneware-mug-set", categorySlug: "home", description: "A coordinated mug set for coffee, tea, and everyday use.", price: "13500.00", stock: 9, imageUrl: unsplash("photo-1514228742587-6b1558fcca3d") },
  { name: "Minimal Wall Clock", slug: "minimal-wall-clock", categorySlug: "home", description: "A clean wall clock concept for a home office or living area.", price: "17500.00", stock: 5, imageUrl: unsplash("photo-1563861826100-9cb868fdbe1c") },
  { name: "Desk Organizer", slug: "desk-organizer", categorySlug: "home", description: "A compact organizer for keeping stationery and small desk items in order.", price: "8900.00", stock: 15, imageUrl: unsplash("photo-1499951360447-b19be8fe80f5") },

  // Lifestyle & more — 8
  { name: "Insulated Travel Bottle", slug: "insulated-travel-bottle", categorySlug: "lifestyle", description: "A reusable bottle concept for carrying drinks during daily routines.", price: "12500.00", stock: 20, imageUrl: unsplash("photo-1602143407151-7111542de6e8") },
  { name: "Daily Planner Notebook", slug: "daily-planner-notebook", categorySlug: "lifestyle", description: "A notebook for planning tasks, notes, and everyday priorities.", price: "6500.00", stock: 28, imageUrl: unsplash("photo-1531346878377-a5be20888e57") },
  { name: "Travel Packing Cubes", slug: "travel-packing-cubes", categorySlug: "lifestyle", description: "Packing cubes to help organize clothes and accessories in luggage.", price: "15500.00", stock: 11, imageUrl: unsplash("photo-1500530855697-b586d89ba3ee") },
  { name: "Compact Umbrella", slug: "compact-umbrella", categorySlug: "lifestyle", description: "A foldable umbrella concept for keeping in a bag on rainy days.", price: "8500.00", stock: 16, imageUrl: unsplash("photo-1534274988757-a28bf1a57c17") },
  { name: "Reusable Shopping Bags Set", slug: "reusable-shopping-bags-set", categorySlug: "lifestyle", description: "Reusable bags for groceries, errands, and everyday shopping.", price: "5500.00", stock: 24, imageUrl: unsplash("photo-1544816155-12df9643f363") },
  { name: "Insulated Lunch Bag", slug: "insulated-lunch-bag", categorySlug: "lifestyle", description: "A portable lunch bag concept for carrying meals and snacks.", price: "11500.00", stock: 13, imageUrl: unsplash("photo-1606760227091-3dd870d97f1d") },
  { name: "Travel Toiletry Organizer", slug: "travel-toiletry-organizer", categorySlug: "lifestyle", description: "A zippered organizer concept for keeping travel toiletries together.", price: "9800.00", stock: 10, imageUrl: unsplash("photo-1553531384-411a247ccd73") },
  { name: "Reusable Desk Bottle", slug: "reusable-desk-bottle", categorySlug: "lifestyle", description: "A reusable bottle for keeping water close while working or studying.", price: "8900.00", stock: 17, imageUrl: unsplash("photo-1602143407151-7111542de6e8") },
];

async function seedCatalog(): Promise<void> {
  await db.insert(categories).values([...categorySeed]).onConflictDoNothing();

  const storedCategories = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
  const categoryIds = new Map(storedCategories.map((category) => [category.slug, category.id]));

  const rows = productSeed.map((product) => {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Category "${product.categorySlug}" was not available after seeding.`);
    }

    return {
      name: product.name,
      slug: product.slug,
      categoryId,
      description: product.description,
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl,
      isActive: true,
    };
  });

  await db.insert(products).values(rows).onConflictDoNothing();

  const finalCategories = await db.select({ id: categories.id }).from(categories);
  const finalProducts = await db.select({ id: products.id }).from(products);

  console.log("Emmanex development catalog seed completed.");
  console.log(`Categories currently in database: ${finalCategories.length}`);
  console.log(`Products currently in database: ${finalProducts.length}`);
  console.log(`Products defined in this seed: ${productSeed.length}`);
  console.log("Existing rows were not overwritten or deleted.");
}

seedCatalog().catch((error: unknown) => {
  console.error("Failed to seed the Emmanex development catalog:", error);
  process.exitCode = 1;
});
