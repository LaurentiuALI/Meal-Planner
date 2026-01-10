-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "calories" REAL NOT NULL,
    "fiber" REAL NOT NULL,
    "purchaseUnitName" TEXT NOT NULL,
    "purchaseUnitAmount" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "tools" TEXT NOT NULL,
    "method" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Meal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DayPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Meal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_date_key" ON "DayPlan"("date");
