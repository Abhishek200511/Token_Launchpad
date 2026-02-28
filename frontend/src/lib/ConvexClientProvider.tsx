"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    const convex = useMemo(() => {
        // If no URL is provided (common during static build/prerendering), 
        // we return a dummy client or handle it to prevent crash.
        // Netlify build env usually lacks these variables until explicitly set.
        if (!convexUrl) return null;
        return new ConvexReactClient(convexUrl);
    }, [convexUrl]);

    if (!convex) {
        // Skip provider if no client exists (e.g. during build)
        return <>{children}</>;
    }

    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

