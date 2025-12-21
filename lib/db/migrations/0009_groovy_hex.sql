ALTER TABLE "Stream" ALTER COLUMN "chunks" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "Stream" ALTER COLUMN "chunks" SET DEFAULT '[]'::jsonb;