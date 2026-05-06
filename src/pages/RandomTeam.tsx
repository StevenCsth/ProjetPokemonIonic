import { useEffect, useState } from "react";
import {
    IonPage,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonBackButton,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { Pokedex } from "../api/client";
import "./RandomTeam.css";

type Pokemon = {
    name: string;
    id: number;
    image: string;
};

export default function RandomTeam() {
    const history = useHistory();
    const [team, setTeam] = useState<Pokemon[]>([]);

    const generateRandomTeam = async () => {
        const pokedex = Pokedex.pokemon;
        const data = await pokedex.listPokemons(0, 1008);
        const shuffled = data.results.sort(() => Math.random() - 0.5);
        const selectedPokemons: Pokemon[] = [];

        for (let i = 0; i < 6 && i < shuffled.length; i++) {
            const parts = shuffled[i].url.split("/");
            const id = parts[parts.length - 2];
            selectedPokemons.push({
                name: shuffled[i].name,
                id: parseInt(id),
                image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
            });
        }

        setTeam(selectedPokemons);
    };

    useEffect(() => {
        generateRandomTeam();
    }, []);

    const saveTeam = () => {
        const teamName = prompt("Enter team name:");
        if (!teamName) return;

        const stored = localStorage.getItem("pokemonTeams");
        const teams = stored ? JSON.parse(stored) : [];
        teams.push({
            id: Date.now().toString(),
            name: teamName,
            pokemons: team,
        });

        localStorage.setItem("pokemonTeams", JSON.stringify(teams));
        history.push("/teams");
    };

    return (
        <IonPage className="random-team-page">
            <IonHeader>
                <IonToolbar className="ion-toolbar-dark">
                    <IonBackButton defaultHref="/" />
                    <IonTitle>Random Team</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="random-team-content">
                <div className="random-team-container">
                    <h2>Your Random Team</h2>
                    <div className="team-pokemons">
                        {team.map((poke) => (
                            <div key={poke.name} className="team-pokemon">
                                <img src={poke.image} alt={poke.name} />
                                <p>{poke.name}</p>
                            </div>
                        ))}
                    </div>

                    <div className="random-team-actions">
                        <IonButton onClick={generateRandomTeam} expand="block">
                            Generate New Team
                        </IonButton>
                        <IonButton onClick={saveTeam} color="success" expand="block">
                            Save Team
                        </IonButton>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
}
