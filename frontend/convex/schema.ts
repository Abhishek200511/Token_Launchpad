import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    projects: defineTable({
        saleAddress: v.string(), // Ethereum address of the deployed sale
        name: v.string(),
        symbol: v.string(),
        description: v.string(),
        twitter: v.optional(v.string()),
        website: v.optional(v.string()),
        telegram: v.optional(v.string()),
        logoUrl: v.optional(v.string()), // URL for token logo
        createdAt: v.number(),
    }).index("by_saleAddress", ["saleAddress"]),
});
