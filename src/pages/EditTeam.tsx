import { useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
    IonPage,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonBackButton,
    IonCard,
    IonCardContent,
} from "@ionic/react";
import { Pokemon, Team } from "../types/models";
import "./EditTeam.css";

export default function EditTeam() {
    const { teamId } = useParams<{ teamId: string }>();
    const history = useHistory();
    const [team, setTeam] = useState<Team | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("pokemonTeams");
        if (stored) {
            const teams = JSON.parse(stored);
            const currentTeam = teams.find((t: Team) => t.id === teamId);
            setTeam(currentTeam);
        }
    }, [teamId]);

    const removePokemon = (name: string) => {
        if (!team) return;
        const updated = {
            ...team,
            pokemons: team.pokemons.filter((p) => p.name !== name),
        };
        setTeam(updated);
    };

    const saveTeam = () => {
        if (!team) return;

        const stored = localStorage.getItem("pokemonTeams");
        if (stored) {
            const teams = JSON.parse(stored);
            const index = teams.findIndex((t: Team) => t.id === teamId);
            teams[index] = team;
            localStorage.setItem("pokemonTeams", JSON.stringify(teams));
        }

        history.push("/teams");
    };

    if (!team) {
        return (
            <IonPage>
                <IonContent>
                    <p>Loading...</p>
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage className="edit-team-page">
            <IonHeader>
                <IonToolbar className="ion-toolbar-dark">
                    <IonBackButton defaultHref="/teams" />
                    <IonTitle>Edit {team.name}</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="edit-team-content">
                <div className="edit-team-container">
                    <h2>{team.name}</h2>
                    <div className="pokemon-list">
                        {team.pokemons.map((poke) => (
                            <IonCard key={poke.name} className="pokemon-item">
                                <img src={poke.image} alt={poke.name} />
                                <IonCardContent>
                                    <p>{poke.name}</p>
                                    <IonButton
                                        size="small"
                                        color="danger"
                                        onClick={() => removePokemon(poke.name)}
                                    >
                                        Remove
                                    </IonButton>
                                </IonCardContent>
                            </IonCard>
                        ))}
                    </div>

                    <IonButton expand="block" color="success" onClick={saveTeam}>
                        Save Changes
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
}
