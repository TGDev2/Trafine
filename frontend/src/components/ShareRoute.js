import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import RouteMap from "./RouteMap";
import { API_BASE } from "../utils/api";
import "../style/shareRoute.css";

/**
 * Page publique affichant un itinéraire partagé.
 * Accessible sans authentification : /share/:shareId
 */
export default function ShareRoute() {
    const { shareId } = useParams();
    const [routes, setRoutes] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/navigation/share/${shareId}`);
                if (!res.ok) {
                    const msg = await res.text();
                    throw new Error(msg || "Introuvable");
                }
                const data = await res.json();
                if (isMounted) setRoutes(data.routes || []);
            } catch (e) {
                if (isMounted) setError(e.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        })();
        return () => (isMounted = false);
    }, [shareId]);

    if (loading) return <p className="share-loading">Chargement…</p>;
    if (error)
        return (
            <div className="share-error">
                <h2>Oups !</h2>
                <p>Erreur : {error}</p>
                <Link to="/">Retour à l’accueil</Link>
            </div>
        );
    if (!routes?.length)
        return (
            <div className="share-empty">
                <h2>Aucun itinéraire</h2>
                <Link to="/">Retour à l’accueil</Link>
            </div>
        );

    return (
        <div className="share-layout">
            <header className="share-header">
                <img
                    src="/traffine-icon-noBG.png"
                    alt="Traffine logo"
                    className="logo"
                />
                <h1>Itinéraire partagé</h1>
            </header>

            <main className="share-main">
                <RouteMap routes={routes} className="share-map" />

                {routes.map((rt, idx) => (
                    <section key={idx} className="share-card">
                        <h3>
                            {idx === 0 ? "Itinéraire recommandé" : `Alternative ${idx + 1}`}
                        </h3>
                        <p>
                            <strong>Distance :</strong> {rt.distance} <br />
                            <strong>Durée :</strong> {rt.duration}
                        </p>
                        <ol className="share-instr">
                            {rt.instructions.map((i, j) => (
                                <li key={j}>{i}</li>
                            ))}
                        </ol>
                    </section>
                ))}
            </main>
        </div>
    );
}
