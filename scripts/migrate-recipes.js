const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_TOOLS = [
  "Frying Pan", "Saucepan", "Stock Pot", "Oven", "Baking Sheet", 
  "Knife", "Cutting Board", "Blender", "Food Processor", "Bowl", "Whisk"
];

async function main() {
  console.log("Starting migration...");

  // 1. Seed Tools
  console.log("Seeding Tools...");
  for (const name of DEFAULT_TOOLS) {
    await prisma.tool.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  // 2. Migrate Recipes
  console.log("Migrating Recipes...");
  const recipes = await prisma.recipe.findMany({
    include: { ingredients: true, steps: true }
  });

  for (const recipe of recipes) {
    if (recipe.steps.length > 0) {
      console.log(`Skipping recipe ${recipe.name} (already migrated)`);
      continue;
    }

    console.log(`Migrating recipe: ${recipe.name}`);

    // Create Step 1
    // Handle JSON parsing for instructions safely
    let description = recipe.instructions;
    try {
        // Try to see if it's a JSON array of strings (old instructions format?)
        // Or just a string. The schema said JSON string.
        const parsed = JSON.parse(recipe.instructions);
        if (Array.isArray(parsed)) {
            description = parsed.join('\n');
        } else if (typeof parsed === 'string') {
            description = parsed;
        }
    } catch (e) {
        // Not JSON, keep as string
    }

    const step = await prisma.recipeStep.create({
      data: {
        recipeId: recipe.id,
        description: description || "Follow instructions.",
        sortOrder: 0
      }
    });

    // Link Ingredients to this Step
    // Update stepId for all ingredients of this recipe
    await prisma.recipeIngredient.updateMany({
      where: { recipeId: recipe.id },
      data: { stepId: step.id }
    });

    // Migrate Tools
    if (recipe.tools) {
      try {
        const tools = JSON.parse(recipe.tools);
        if (Array.isArray(tools)) {
          for (const toolName of tools) {
            // Find or create tool
            let tool = await prisma.tool.findUnique({ where: { name: toolName } });
            if (!tool) {
                tool = await prisma.tool.create({ data: { name: toolName } });
            }
            
            // Link to Step
            await prisma.stepTool.create({
              data: {
                stepId: step.id,
                toolId: tool.id
              }
            });
          }
        }
      } catch (e) {
        console.warn(`Failed to parse tools for recipe ${recipe.name}:`, e);
      }
    }
  }

  console.log("Migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
