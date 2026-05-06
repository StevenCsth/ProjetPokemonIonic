import {
    IonIcon,
    IonRouterLink,
} from "@ionic/react";
import { home, list } from "ionicons/icons";
import { useLocation } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="navbar-shell">
            <div className="navbar-header">
                <div className="navbar-toolbar">
                    <h1 className="navbar-title">Pokédex</h1>
                </div>
                <div className="navbar-nav">
                    <IonRouterLink
                        routerLink="/"
                        className={`nav-link ${isActive("/") ? "active" : ""}`}
                    >
                        <IonIcon icon={home} />
                        <span>Home</span>
                    </IonRouterLink>
                    <IonRouterLink
                        routerLink="/teams"
                        className={`nav-link ${isActive("/teams") ? "active" : ""}`}
                    >
                        <IonIcon icon={list} />
                        <span>Teams</span>
                    </IonRouterLink>
                </div>
            </div>
        </div>
    );
}
