import { integer, pgTable, serial, text, varchar, timestamp, real, } from "drizzle-orm/pg-core";
export const usersTable = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    age: integer().notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
});
export const objectsCoordinatesTable = pgTable("objectsCoordinates", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    probability: real("property").notNull(),
    screenWidth: integer("screen_width").notNull(),
    screenHeight: integer("screen_height").notNull(),
    x1: integer("x1").notNull(),
    y1: integer("y1").notNull(),
    x2: integer("x2").notNull(),
    y2: integer("y2").notNull(),
    time: timestamp("time").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});
