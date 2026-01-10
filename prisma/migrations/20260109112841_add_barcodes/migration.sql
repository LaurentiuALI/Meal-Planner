-- CreateTable
CREATE TABLE "Barcode" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "ingredientId" TEXT NOT NULL,
    CONSTRAINT "Barcode_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
