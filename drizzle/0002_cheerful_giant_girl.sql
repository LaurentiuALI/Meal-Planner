CREATE TABLE `shopping_checks` (
	`list_key` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`checked` integer NOT NULL,
	`at` integer NOT NULL,
	PRIMARY KEY(`list_key`, `ingredient_id`)
);
