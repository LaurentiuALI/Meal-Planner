ALTER TABLE `ingredients` ADD `to_taste` text;--> statement-breakpoint
UPDATE `ingredients` SET `to_taste` = 'ulei' WHERE `aisle` = 'condimente' AND `staple` = 1 AND `name` LIKE 'Ulei%';
--> statement-breakpoint
UPDATE `ingredients` SET `to_taste` = 'condiment' WHERE `aisle` = 'condimente' AND `staple` = 1 AND `to_taste` IS NULL
  AND `name` NOT LIKE 'Praf de copt%' AND `name` NOT LIKE 'Esen% vanilie%' AND `name` NOT LIKE 'O_et%' AND `name` NOT LIKE 'Sos %';
