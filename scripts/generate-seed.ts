
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching data from SQLite...');

  const ingredients = await prisma.ingredient.findMany();
  const tools = await prisma.tool.findMany();
  const recipes = await prisma.recipe.findMany({
    include: {
      steps: {
        include: {
          ingredients: true,
          tools: true
        }
      }
    }
  });
  const templates = await prisma.planTemplate.findMany({
    include: {
      days: {
        include: {
          meals: true
        }
      }
    }
  });
  const settings = await prisma.settings.findFirst();

  const seedContent = `
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Ingredients
  const ingredients = ${JSON.stringify(ingredients, null, 2)};
  for (const ing of ingredients) {
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      update: {},
      create: ing
    });
  }

  // 2. Tools
  const tools = ${JSON.stringify(tools, null, 2)};
  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { id: tool.id },
      update: {},
      create: {
        id: tool.id,
        name: tool.name
      }
    });
  }

  // 3. Recipes
  const recipes = ${JSON.stringify(recipes, null, 2)};
  for (const recipe of recipes) {
    // Check if recipe exists
    const existing = await prisma.recipe.findUnique({ where: { id: recipe.id } });
    if (!existing) {
      await prisma.recipe.create({
        data: {
          id: recipe.id,
          name: recipe.name,
          method: recipe.method, // JSON string
          steps: {
            create: recipe.steps.map(s => ({
              id: s.id,
              description: s.description,
              sortOrder: s.sortOrder,
              ingredients: {
                create: s.ingredients.map(ri => ({
                  ingredientId: ri.ingredientId,
                  amount: ri.amount
                }))
              },
              tools: {
                create: s.tools.map(t => ({
                  toolId: t.toolId
                }))
              }
            }))
          }
        }
      });
    }
  }

  // 4. Settings
  const settings = ${JSON.stringify(settings, null, 2)};
  if (settings) {
    await prisma.settings.upsert({
      where: { id: settings.id },
      update: settings,
      create: settings
    });
  }
  
  // 5. Templates (simplified seeding)
  const templates = ${JSON.stringify(templates, null, 2)};
  for (const t of templates) {
      const existing = await prisma.planTemplate.findUnique({ where: { id: t.id } });
      if (!existing) {
          await prisma.planTemplate.create({
              data: {
                  id: t.id,
                  name: t.name,
                  isActive: t.isActive,
                  createdAt: t.createdAt,
                  updatedAt: t.updatedAt,
                  days: {
                      create: t.days.map(d => ({
                          id: d.id,
                          name: d.name,
                          sortOrder: d.sortOrder,
                          targetCalories: d.targetCalories,
                          targetProtein: d.targetProtein,
                          targetCarbs: d.targetCarbs,
                          targetFat: d.targetFat,
                          targetFiber: d.targetFiber,
                          meals: {
                              create: d.meals.map(m => ({
                                  id: m.id,
                                  recipeId: m.recipeId,
                                  slotName: m.slotName,
                                  sortOrder: m.sortOrder,
                                  servings: m.servings
                              }))
                          }
                      }))
                  }
              }
          })
      }
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

  const seedPath = path.join(process.cwd(), 'prisma', 'seed.ts');
  fs.writeFileSync(seedPath, seedContent);
  console.log('Seed file generated at:', seedPath);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
