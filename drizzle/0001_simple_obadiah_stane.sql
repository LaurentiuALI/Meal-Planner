CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`recipe_id` text,
	`ingredient_id` text,
	`grams` real,
	`servings` real DEFAULT 1 NOT NULL,
	`pinned` text DEFAULT '{}' NOT NULL,
	`solved` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meals_date_idx` ON `meals` (`date`);