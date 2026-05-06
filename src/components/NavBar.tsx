import {
    IonIcon,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonNav,
} from "@ionic/react";
import { home, list, add, shuffle } from "ionicons/icons";
import { useLocation } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <>
            <IonHeader className="navbar-header">
                <IonToolbar className="navbar-toolbar">
                    <IonTitle className="navbar-title">Pokédex</IonTitle>
                </IonToolbar>
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
                        <span>My Teams</span>
                    </IonRouterLink>
                    <IonRouterLink
                        routerLink="/teams/add"
                        className={`nav-link ${isActive("/teams/add") ? "active" : ""}`}
                    >
                        <IonIcon icon={add} />
                        <span>Create Team</span>
                    </IonRouterLink>
                    <IonRouterLink
                        routerLink="/random-team"
                        className={`nav-link ${isActive("/random-team") ? "active" : ""}`}
                    >
                        <IonIcon icon={shuffle} />
                        <span>Random Team</span>
                    </IonRouterLink>
                </div>
            </IonHeader>
        </>
    );
}
