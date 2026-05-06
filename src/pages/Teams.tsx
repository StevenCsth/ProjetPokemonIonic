import { useEffect, useState } from "react";
import {
    IonPage,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
} from "@ionic/react";
import { Link } from "react-router-dom";
import "./Teams.css";

type Pokemon = {
    name: string;
    id: number;
    image: string;
};

type Team = {
    id: string;
    name: string;
    pokemons: Pokemon[];
};

export default function Teams() {
    const [teams, setTeams] = useState<Team[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("pokemonTeams");
        if (stored) {
            setTeams(JSON.parse(stored));
        }
    }, []);

    const deleteTeam = (id: string) => {
        if (!confirm("Are you sure you want to remove this team ?")) return;
        const updatedTeams = teams.filter((team) => team.id !== id);
        setTeams(updatedTeams);
        localStorage.setItem("pokemonTeams", JSON.stringify(updatedTeams));
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar className="ion-toolbar-dark">
                    <IonTitle>My Teams</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="teams-content">
                <div className="add-button-container">
                    <Link to="/teams/add">
                        <IonButton expand="block" color="danger">
                            Add New Team
                        </IonButton>
                    </Link>
                </div>

                {teams.length === 0 ? (
                    <div className="empty-message">No teams yet. Create one!</div>
                ) : (
                    <div className="teams-grid">
                        {teams.map((team) => (
                            <div key={team.id} className="team-card">
                                <h2>{team.name}</h2>
                                <p>{team.pokemons.length} Pokémon</p>
                                <div className="team-actions">
                                    <Link to={`/teams/edit/${team.id}`}>
                                        <IonButton>Edit</IonButton>
                                    </Link>
                                    <IonButton
                                        color="danger"
                                        onClick={() => deleteTeam(team.id)}
                                    >
                                        Delete
                                    </IonButton>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </IonContent>
        </IonPage>
    );
}
