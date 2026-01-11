-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "Slot_name_key" ON "Slot"("name");
