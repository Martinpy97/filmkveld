CREATE TABLE `tcg_mastersets` (
	`user_id` text NOT NULL,
	`set_id` text NOT NULL,
	`scope` text DEFAULT 'standard' NOT NULL,
	PRIMARY KEY(`user_id`, `set_id`)
);
--> statement-breakpoint
CREATE TABLE `tcg_owned` (
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`owned_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `card_id`, `variant_id`)
);
