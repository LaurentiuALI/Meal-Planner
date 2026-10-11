CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`equipment` text DEFAULT '[]' NOT NULL,
	`minutes` real NOT NULL,
	`active_minutes` real NOT NULL,
	`per_kg_minutes` real DEFAULT 0 NOT NULL,
	`temp_c` integer,
	`capacity_g` real,
	`per_batch` integer DEFAULT false NOT NULL,
	`mergeable` integer DEFAULT true NOT NULL,
	`hint` text,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`capacity_g` real,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`kcal` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`fiber` real,
	`density` real DEFAULT 1 NOT NULL,
	`portions` text DEFAULT '[]' NOT NULL,
	`pack_grams` real,
	`pack_label` text,
	`aisle` text DEFAULT 'altele' NOT NULL,
	`staple` integer DEFAULT false NOT NULL,
	`lidl` integer DEFAULT false NOT NULL,
	`source` text NOT NULL,
	`barcode` text,
	`in_library` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredients_barcode_unique` ON `ingredients` (`barcode`);--> statement-breakpoint
CREATE INDEX `ingredients_library_idx` ON `ingredients` (`in_library`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`servings` integer DEFAULT 1 NOT NULL,
	`freezes` integer DEFAULT false NOT NULL,
	`keeps_days` integer DEFAULT 3 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`steps` text DEFAULT '[]' NOT NULL,
	`preset` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
