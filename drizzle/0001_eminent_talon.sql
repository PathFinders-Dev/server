CREATE TABLE "analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
