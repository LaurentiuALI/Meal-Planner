'use server'

export interface OFFProduct {
  code?: string;
  product_name: string;
  quantity?: string;
  nutriments: {
    "energy-kcal_100g"?: number;
    "proteins_100g"?: number;
    "carbohydrates_100g"?: number;
    "fat_100g"?: number;
    "fiber_100g"?: number;
  };
}

export async function searchOpenFoodFacts(query: string) {
  if (!query) return [];

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=code,product_name,nutriments,quantity`,
      {
        headers: {
          'User-Agent': 'MealPrepPlanner/1.0 (Integration Test) - contact@example.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Open Food Facts');
    }

    const data = await response.json();
    
    // Filter out products that don't have basic macro info
    const products: OFFProduct[] = data.products || [];
    return products.filter(p => p.nutriments && p.product_name);
  } catch (error) {
    console.error("OFF Search Error:", error);
    return [];
  }
}

export async function searchOpenFoodFactsByBarcode(barcode: string) {
  if (!barcode) return [];

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'MealPrepPlanner/1.0 (Integration Test) - contact@example.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Open Food Facts');
    }

    const data = await response.json();
    
    if (data.status === 1 && data.product) {
       const product = data.product;
       // Ensure it matches our interface and has basic info
       if (product.product_name && product.nutriments) {
         return [{ ...product, code: barcode } as OFFProduct];
       }
    }
    
    return [];
  } catch (error) {
    console.error("OFF Barcode Error:", error);
    return [];
  }
}
