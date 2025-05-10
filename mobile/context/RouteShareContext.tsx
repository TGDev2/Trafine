import React, { createContext, useState, PropsWithChildren } from "react";
import { RouteResult } from "@/types/routes";

interface ShareContextValue {
    sharedRoutes: RouteResult[] | null;
    setSharedRoutes: (routes: RouteResult[] | null) => void;
}

export const RouteShareContext = createContext<ShareContextValue>({
    sharedRoutes: null,
    setSharedRoutes: () => undefined,
});

export function RouteShareProvider({ children }: PropsWithChildren) {
    const [sharedRoutes, setSharedRoutes] = useState<RouteResult[] | null>(null);
    return (
        <RouteShareContext.Provider value={{ sharedRoutes, setSharedRoutes }}>
            {children}
        </RouteShareContext.Provider>
    );
}
