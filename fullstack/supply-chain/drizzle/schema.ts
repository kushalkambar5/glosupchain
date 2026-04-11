import { pgTable, uuid, text, json, timestamp, index, foreignKey, doublePrecision, boolean, jsonb, serial, varchar, check, integer, date, unique, bigserial, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const locationTypeEnum = pgEnum("location_type_enum", ['port', 'city', 'chokepoint', 'region'])


export const roads = pgTable("roads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	origin: json().notNull(),
	destination: json().notNull(),
	originalRoute: json("original_route"),
	bestRoute: json("best_route"),
	reasons: json(),
	weatherData: json("weather_data"),
	newsData: json("news_data"),
	status: text().default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	refreshedAt: timestamp("refreshed_at", { mode: 'string' }),
});

export const ships = pgTable("ships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	origin: json().notNull(),
	destination: json().notNull(),
	originalRoute: json("original_route"),
	bestRoute: json("best_route"),
	reasons: json(),
	weatherData: json("weather_data"),
	newsData: json("news_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	refreshedAt: timestamp("refreshed_at", { mode: 'string' }),
});

export const routes = pgTable("routes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	managerId: uuid("manager_id").notNull(),
	srcLat: doublePrecision("src_lat").notNull(),
	srcLon: doublePrecision("src_lon").notNull(),
	destLat: doublePrecision("dest_lat").notNull(),
	destLon: doublePrecision("dest_lon").notNull(),
	goodsAmount: doublePrecision("goods_amount").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_routes_manager_id").using("btree", table.managerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [users.id],
			name: "routes_manager_id_users_id_fk"
		}),
]);

export const assignments = pgTable("assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	managerId: uuid("manager_id").notNull(),
	driverId: uuid("driver_id").notNull(),
	routeId: uuid("route_id").notNull(),
	routeType: text("route_type").notNull(),
	assignedQuantity: doublePrecision("assigned_quantity").default(0).notNull(),
	workDone: boolean("work_done").default(false),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	bestRoute: jsonb("best_route"),
}, (table) => [
	index("idx_assignment_driver_id").using("btree", table.driverId.asc().nullsLast().op("uuid_ops")),
	index("idx_assignment_route_id").using("btree", table.routeId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [users.id],
			name: "assignments_manager_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.driverId],
			foreignColumns: [users.id],
			name: "assignments_driver_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.routeId],
			foreignColumns: [routes.id],
			name: "fk_assignment_route"
		}).onDelete("cascade"),
]);

export const drivers = pgTable("drivers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	lat: doublePrecision().notNull(),
	lon: doublePrecision().notNull(),
	capacity: doublePrecision().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	onWork: boolean().default(false),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "drivers_user_id_users_id_fk"
		}),
]);

export const keywords = pgTable("keywords", {
	id: serial().primaryKey().notNull(),
	word: varchar({ length: 120 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const keywordRules = pgTable("keyword_rules", {
	id: serial().primaryKey().notNull(),
	keywordId: integer("keyword_id").notNull(),
	type: varchar({ length: 10 }).notNull(),
	date: date(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_keyword_rules_type_active").using("btree", table.type.asc().nullsLast().op("text_ops"), table.isActive.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.keywordId],
			foreignColumns: [keywords.id],
			name: "fk_keyword"
		}).onDelete("cascade"),
	check("check_type_date_consistency", sql`(((type)::text = 'daily'::text) AND (date IS NULL)) OR (((type)::text = 'oneday'::text) AND (date IS NOT NULL))`),
]);

export const messages = pgTable("messages", {
	id: uuid().primaryKey().notNull(),
	threadId: varchar("thread_id", { length: 255 }).notNull(),
	messages: json(),
}, (table) => [
	index("ix_messages_thread_id").using("btree", table.threadId.asc().nullsLast().op("text_ops")),
]);

export const roadReroute = pgTable("road_reroute", {
	id: serial().primaryKey().notNull(),
	requestPayload: jsonb("request_payload").notNull(),
	responsePayload: jsonb("response_payload").notNull(),
	done: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const shipReroutes = pgTable("ship_reroutes", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	shipId: integer("ship_id").notNull(),
	affectedByNews: json("affected_by_news").notNull(),
	affectedByWeather: json("affected_by_weather").notNull(),
	suggestion: text().notNull(),
	bestRoute: json("best_route").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ship_reroutes_user_id_fkey"
		}),
]);

export const news = pgTable("news", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	articleId: varchar("article_id", { length: 255 }).notNull(),
	link: text(),
	title: text().notNull(),
	description: text(),
	content: text(),
	keywords: text(),
	creator: text(),
	language: varchar({ length: 50 }),
	country: text(),
	category: text(),
	datatype: varchar({ length: 50 }),
	pubDate: varchar({ length: 50 }),
	pubDateTz: varchar({ length: 10 }),
	fetchedAt: varchar("fetched_at", { length: 50 }),
	imageUrl: text("image_url"),
	videoUrl: text("video_url"),
	sourceId: varchar("source_id", { length: 255 }),
	sourceName: varchar("source_name", { length: 255 }),
	sourcePriority: integer("source_priority"),
	sourceUrl: text("source_url"),
	sourceIcon: text("source_icon"),
	sentiment: text(),
	sentimentStats: text("sentiment_stats"),
	aiTag: text("ai_tag"),
	aiRegion: text("ai_region"),
	aiOrg: text("ai_org"),
	aiSummary: text("ai_summary"),
	duplicate: boolean(),
	consequence: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	unique("news_article_id_key").on(table.articleId),
]);

export const weather = pgTable("weather", {
	id: serial().primaryKey().notNull(),
	locationName: varchar("location_name", { length: 100 }).notNull(),
	country: varchar({ length: 100 }).notNull(),
	latitude: doublePrecision().notNull(),
	longitude: doublePrecision().notNull(),
	recordedAt: timestamp("recorded_at", { mode: 'string' }).notNull(),
	temperatureC: doublePrecision("temperature_c").notNull(),
	feelsLikeC: doublePrecision("feels_like_c"),
	condition: varchar({ length: 100 }),
	windKph: doublePrecision("wind_kph"),
	windDegree: integer("wind_degree"),
	windDirection: varchar("wind_direction", { length: 10 }),
	gustKph: doublePrecision("gust_kph"),
	precipitationMm: doublePrecision("precipitation_mm"),
	visibilityKm: doublePrecision("visibility_km"),
	humidity: integer(),
	pressureMb: doublePrecision("pressure_mb"),
	windChillC: doublePrecision("wind_chill_c"),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const weatherResults = pgTable("weather_results", {
	id: serial().primaryKey().notNull(),
	weatherId: integer("weather_id"),
	aiSummary: text("ai_summary").notNull(),
	consequence: text().notNull(),
	radiusKm: doublePrecision("radius_km").notNull(),
	severity: integer().notNull(),
	confidence: doublePrecision().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.weatherId],
			foreignColumns: [weather.id],
			name: "weather_results_weather_id_fkey"
		}),
]);

export const alembicVersion = pgTable("alembic_version", {
	versionNum: varchar("version_num", { length: 32 }).primaryKey().notNull(),
});

export const shipwayResults = pgTable("shipway_results", {
	id: serial().primaryKey().notNull(),
	newsId: integer("news_id"),
	weatherId: integer("weather_id"),
	aiSummary: text("ai_summary").notNull(),
	consequence: text().notNull(),
	centerLat: doublePrecision("center_lat").notNull(),
	centerLong: doublePrecision("center_long").notNull(),
	radiusKm: doublePrecision("radius_km").notNull(),
	severity: integer().notNull(),
	confidence: doublePrecision().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.newsId],
			foreignColumns: [news.id],
			name: "shipway_results_news_id_fkey"
		}),
	foreignKey({
			columns: [table.weatherId],
			foreignColumns: [weather.id],
			name: "shipway_results_weather_id_fkey"
		}),
]);

export const locations = pgTable("locations", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 50 }).notNull(),
	country: varchar({ length: 100 }).notNull(),
	continent: varchar({ length: 100 }),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
	priority: varchar({ length: 6 }).notNull(),
	isActive: boolean("is_active"),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	index("idx_location_priority").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("idx_location_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("uq_location_name_country").on(table.name, table.country),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 50 }).default('driver'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	isVerified: boolean("is_verified").default(false),
	workDone: boolean("work_done").default(false),
	longtermMemory: text("longterm_memory"),
	threads: json().default([]),
	location: varchar({ length: 255 }),
	ownedShips: json("owned_ships"),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);
