-- CreateTable
CREATE TABLE "PlanTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TemplateDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planTemplateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "targetCalories" INTEGER,
    "targetProtein" INTEGER,
    "targetCarbs" INTEGER,
    "targetFat" INTEGER,
    "targetFiber" INTEGER,
    CONSTRAINT "TemplateDay_planTemplateId_fkey" FOREIGN KEY ("planTemplateId") REFERENCES "PlanTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TemplateMeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateDayId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "slotName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "servings" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "TemplateMeal_templateDayId_fkey" FOREIGN KEY ("templateDayId") REFERENCES "TemplateDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateMeal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
