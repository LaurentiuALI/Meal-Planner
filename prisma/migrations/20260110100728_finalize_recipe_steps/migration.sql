/*
  Warnings:

  - You are about to drop the column `instructions` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `tools` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `recipeId` on the `RecipeIngredient` table. All the data in the column will be lost.
  - Made the column `stepId` on table `RecipeIngredient` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "method" TEXT NOT NULL
);
INSERT INTO "new_Recipe" ("id", "method", "name") SELECT "id", "method", "name" FROM "Recipe";
DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";
CREATE TABLE "new_RecipeIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "RecipeIngredient_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "RecipeStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RecipeIngredient" ("amount", "id", "ingredientId", "stepId") SELECT "amount", "id", "ingredientId", "stepId" FROM "RecipeIngredient";
DROP TABLE "RecipeIngredient";
ALTER TABLE "new_RecipeIngredient" RENAME TO "RecipeIngredient";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
