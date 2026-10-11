CREATE TABLE `lidl_prices` (
	`ref` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`size` text NOT NULL,
	`category` text NOT NULL,
	`price` real NOT NULL,
	`grams` real,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `ingredients` ADD `price_ron` real;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `price_grams` real;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `price_source` text;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `price_ref` text;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `price_at` integer;