import { relations } from "drizzle-orm/relations";
import { users, routes, assignments, drivers, keywords, keywordRules, shipReroutes, weather, weatherResults, news, shipwayResults } from "./schema";

export const routesRelations = relations(routes, ({one, many}) => ({
	user: one(users, {
		fields: [routes.managerId],
		references: [users.id]
	}),
	assignments: many(assignments),
}));

export const usersRelations = relations(users, ({many}) => ({
	routes: many(routes),
	assignments_managerId: many(assignments, {
		relationName: "assignments_managerId_users_id"
	}),
	assignments_driverId: many(assignments, {
		relationName: "assignments_driverId_users_id"
	}),
	drivers: many(drivers),
	shipReroutes: many(shipReroutes),
}));

export const assignmentsRelations = relations(assignments, ({one}) => ({
	user_managerId: one(users, {
		fields: [assignments.managerId],
		references: [users.id],
		relationName: "assignments_managerId_users_id"
	}),
	user_driverId: one(users, {
		fields: [assignments.driverId],
		references: [users.id],
		relationName: "assignments_driverId_users_id"
	}),
	route: one(routes, {
		fields: [assignments.routeId],
		references: [routes.id]
	}),
}));

export const driversRelations = relations(drivers, ({one}) => ({
	user: one(users, {
		fields: [drivers.userId],
		references: [users.id]
	}),
}));

export const keywordRulesRelations = relations(keywordRules, ({one}) => ({
	keyword: one(keywords, {
		fields: [keywordRules.keywordId],
		references: [keywords.id]
	}),
}));

export const keywordsRelations = relations(keywords, ({many}) => ({
	keywordRules: many(keywordRules),
}));

export const shipReroutesRelations = relations(shipReroutes, ({one}) => ({
	user: one(users, {
		fields: [shipReroutes.userId],
		references: [users.id]
	}),
}));

export const weatherResultsRelations = relations(weatherResults, ({one}) => ({
	weather: one(weather, {
		fields: [weatherResults.weatherId],
		references: [weather.id]
	}),
}));

export const weatherRelations = relations(weather, ({many}) => ({
	weatherResults: many(weatherResults),
	shipwayResults: many(shipwayResults),
}));

export const shipwayResultsRelations = relations(shipwayResults, ({one}) => ({
	news: one(news, {
		fields: [shipwayResults.newsId],
		references: [news.id]
	}),
	weather: one(weather, {
		fields: [shipwayResults.weatherId],
		references: [weather.id]
	}),
}));

export const newsRelations = relations(news, ({many}) => ({
	shipwayResults: many(shipwayResults),
}));