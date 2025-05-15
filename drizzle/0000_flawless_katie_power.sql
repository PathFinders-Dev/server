CREATE TABLE "objectsCoordinates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"property" real NOT NULL,
	"screen_width" integer NOT NULL,
	"screen_height" integer NOT NULL,
	"x1" integer NOT NULL,
	"y1" integer NOT NULL,
	"x2" integer NOT NULL,
	"y2" integer NOT NULL,
	"time" timestamp NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"age" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
