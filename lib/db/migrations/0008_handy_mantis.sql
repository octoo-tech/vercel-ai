ALTER TABLE "Stream" ADD COLUMN "chunks" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "Stream" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "Stream" ADD COLUMN "expiresAt" timestamp;--> statement-breakpoint
UPDATE "Stream" SET "expiresAt" = "createdAt" + INTERVAL '24 hours' WHERE "expiresAt" IS NULL;--> statement-breakpoint
ALTER TABLE "Stream" ALTER COLUMN "expiresAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Stream" ADD COLUMN "lastChunkAt" timestamp;--> statement-breakpoint
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "lastContext";