CREATE TABLE "instance_bundle_cache" (
	"instance_id" integer PRIMARY KEY NOT NULL,
	"directory_checksum" text NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"byte_size" integer NOT NULL
);--> statement-breakpoint
CREATE TABLE "instance_bundle_file" (
	"instance_id" integer NOT NULL,
	"path" text NOT NULL,
	"content" bytea NOT NULL,
	CONSTRAINT "instance_bundle_file_instance_id_path_pk" PRIMARY KEY("instance_id","path")
);--> statement-breakpoint
ALTER TABLE "instance_bundle_cache" ADD CONSTRAINT "instance_bundle_cache_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_bundle_file" ADD CONSTRAINT "instance_bundle_file_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instance_bundle_cache_last_used_at_idx" ON "instance_bundle_cache" USING btree ("last_used_at");--> statement-breakpoint
CREATE INDEX "instance_bundle_file_instance_id_idx" ON "instance_bundle_file" USING btree ("instance_id");--> statement-breakpoint
UPDATE "instances" SET "state" = 'running' WHERE "state" = 'stopped';--> statement-breakpoint
ALTER TYPE "instance_state" RENAME TO "instance_state_old";--> statement-breakpoint
CREATE TYPE "instance_state" AS ENUM('starting', 'running');--> statement-breakpoint
ALTER TABLE "instances" ALTER COLUMN "state" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "instances" ALTER COLUMN "state" TYPE "instance_state" USING ("state"::text::"instance_state");--> statement-breakpoint
ALTER TABLE "instances" ALTER COLUMN "state" SET DEFAULT 'starting';--> statement-breakpoint
DROP TYPE "instance_state_old";