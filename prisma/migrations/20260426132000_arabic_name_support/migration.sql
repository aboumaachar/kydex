ALTER TABLE "WatchlistRecord"
ADD COLUMN "arabicNormalizedName" TEXT,
ADD COLUMN "latinTransliteratedName" TEXT,
ADD COLUMN "normalizedAliases" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
ADD COLUMN "arabicNormalizedAliases" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;