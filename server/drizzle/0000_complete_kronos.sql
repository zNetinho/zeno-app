CREATE TABLE `gastos` (
	`id` integer PRIMARY KEY NOT NULL,
	`tipo` text DEFAULT 'gasto' NOT NULL,
	`valor` real NOT NULL,
	`item` text NOT NULL,
	`quantidade` integer DEFAULT 1,
	`estabelecimento` text NOT NULL,
	`data` text NOT NULL,
	`categoria` text NOT NULL,
	`forma_pagamento` text NOT NULL,
	`tags` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
CREATE TABLE `todos` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text,
	`completed` integer DEFAULT 0
);
