-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "calorieTarget" INTEGER NOT NULL DEFAULT 2000,
    "proteinTarget" INTEGER NOT NULL DEFAULT 150,
    "carbsTarget" INTEGER NOT NULL DEFAULT 200,
    "fatTarget" INTEGER NOT NULL DEFAULT 60,
    "fiberTarget" INTEGER NOT NULL DEFAULT 30
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Meal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "slotName" TEXT NOT NULL DEFAULT 'Meal',
    CONSTRAINT "Meal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DayPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Meal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Meal" ("id", "planId", "recipeId", "servings", "sortOrder") SELECT "id", "planId", "recipeId", "servings", "sortOrder" FROM "Meal";
DROP TABLE "Meal";
ALTER TABLE "new_Meal" RENAME TO "Meal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
