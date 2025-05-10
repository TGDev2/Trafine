import { io, Socket } from "socket.io-client";
import { API_URL } from "@/constants/API";
import { getAccessToken } from "@/utils/auth";

/**
 * Retourne un socket WebSocket authentifié (Bearer) ;
 * singleton pour éviter de multiples connexions concurrentes.
 */
let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
    if (socket) return socket;

    const token = await getAccessToken();
    socket = io(API_URL, {
        transports: ["websocket"],
        auth: token ? { token: `Bearer ${token}` } : undefined,
    });

    /* Re-auth automatique si le token expire puis est rafraîchi */
    socket.on("disconnect", async (reason) => {
        if (reason === "io server disconnect") {
            socket?.connect();
        }
    });

    return socket;
}
