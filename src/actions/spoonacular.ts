'use server'

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com/food/ingredients';

export interface SpoonacularIngredient {
    id: number;
    name: string;
    image: string;
    nutrition?: {
        nutrients: {
            name: string;
            amount: number;
            unit: string;
        }[]
    };
    possibleUnits?: string[];
}

export async function searchSpoonacular(query: string): Promise<SpoonacularIngredient[]> {
    if (!API_KEY) {
        console.warn("Spoonacular API key is missing.");
        return [];
    }
    if (!query) return [];

    try {
        // 1. Search for ingredients
        const searchRes = await fetch(
            `${BASE_URL}/search?query=${encodeURIComponent(query)}&number=5&apiKey=${API_KEY}`,
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (!searchRes.ok) {
            console.error("Spoonacular Search Error:", searchRes.statusText);
            return [];
        }

        const searchData = await searchRes.json();
        const results = searchData.results || [];

        // 2. Fetch details for each result to get nutrition
        // We do this in parallel. Note: Be mindful of rate limits. 5 items is conservative.
        const detailedResults = await Promise.all(
            results.map(async (item: any) => {
                try {
                    const infoRes = await fetch(
                        `${BASE_URL}/${item.id}/information?amount=100&unit=g&apiKey=${API_KEY}`
                    );
                    if (!infoRes.ok) return null;
                    const infoData = await infoRes.json();
                    return {
                        id: item.id,
                        name: item.name,
                        image: item.image,
                        nutrition: infoData.nutrition,
                        possibleUnits: infoData.possibleUnits
                    } as SpoonacularIngredient;
                } catch {
                    return null;
                }
            })
        );

        return detailedResults.filter(Boolean) as SpoonacularIngredient[];

    } catch (error) {
        console.error("Spoonacular API Error:", error);
        return [];
    }
}
