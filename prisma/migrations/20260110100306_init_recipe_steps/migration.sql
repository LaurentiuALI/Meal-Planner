-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RecipeStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RecipeStep_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StepTool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    CONSTRAINT "StepTool_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "RecipeStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StepTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecipeIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT,
    "stepId" TEXT,
    "ingredientId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeIngredient_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "RecipeStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RecipeIngredient" ("amount", "id", "ingredientId", "recipeId") SELECT "amount", "id", "ingredientId", "recipeId" FROM "RecipeIngredient";
DROP TABLE "RecipeIngredient";
ALTER TABLE "new_RecipeIngredient" RENAME TO "RecipeIngredient";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Tool_name_key" ON "Tool"("name");
