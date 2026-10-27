-- CreateTable
CREATE TABLE "RestaurantCsvFile" (
    "restaurantId" UUID NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "relativePath" VARCHAR(512) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantCsvFile_pkey" PRIMARY KEY ("restaurantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantCsvFile_relativePath_key" ON "RestaurantCsvFile"("relativePath");

-- AddForeignKey
ALTER TABLE "RestaurantCsvFile" ADD CONSTRAINT "RestaurantCsvFile_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
