import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveProjectMetadata = mutation({
    args: {
        saleAddress: v.string(),
        name: v.string(),
        symbol: v.string(),
        description: v.string(),
        twitter: v.optional(v.string()),
        website: v.optional(v.string()),
        telegram: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("projects")
            .withIndex("by_saleAddress", (q) => q.eq("saleAddress", args.saleAddress))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { ...args });
            return existing._id;
        }

        return await ctx.db.insert("projects", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

export const getProjectMetadata = query({
    args: { saleAddress: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("projects")
            .withIndex("by_saleAddress", (q) => q.eq("saleAddress", args.saleAddress))
            .first();
    },
});
