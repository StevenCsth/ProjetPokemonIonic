import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import {
    IonPage,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonInput,
    IonSearchbar,
    IonBackButton,
    IonCard,
    IonCardContent,
} from "@ionic/react";
import { Pokedex } from "../api/client";
import "./AddTeam.css";

type Pokemon = {
    name: string;
    url: string;
};

type SelectedPokemon = {
    name: string;
    id: number;
    image: string;
};

export default function AddTeam() {
    const history = useHistory();
    const [pokemons, setPokemons] = useState<Pokemon[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPokemons, setSelectedPokemons] = useState<SelectedPokemon[]>([]);
    const [teamName, setTeamName] = useState("");

    useEffect(() => {
        const pokedex = Pokedex.pokemon;
        pokedex.listPokemons(0, 1008).then((data) => {
            setPokemons(data.results);
        });
    }, []);

    const getIdFromUrl = (url: string) => {
        const parts = url.split("/");
        return parts[parts.length - 2];
    };

    const filteredPokemons = pokemons.filter((poke) =>
        poke.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectPokemon = (poke: Pokemon) => {
        if (selectedPokemons.length >= 6) {
            alert("Maximum 6 Pokémon per team!");
            return;
        }

        const id = getIdFromUrl(poke.url);
        const newPoke: SelectedPokemon = {
            name: poke.name,
            id: parseInt(id),
            image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        };

        setSelectedPokemons([...selectedPokemons, newPoke]);
    };

    const removePokemon = (name: string) => {
        setSelectedPokemons(selectedPokemons.filter((p) => p.name !== name));
    };

    const saveTeam = () => {
        if (!teamName) {
            alert("Please enter a team name!");
            return;
        }

        if (selectedPokemons.length === 0) {
            alert("Please select at least one Pokémon!");
            return;
        }

        const stored = localStorage.getItem("pokemonTeams");
        const teams = stored ? JSON.parse(stored) : [];
        teams.push({
            id: Date.now().toString(),
            name: teamName,
            pokemons: selectedPokemons,
        });

        localStorage.setItem("pokemonTeams", JSON.stringify(teams));
        history.push("/teams");
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar className="ion-toolbar-dark">
                    <IonBackButton defaultHref="/teams" />
                    <IonTitle>Create New Team</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="add-team-content">
                <div className="add-team-container">
                    <div className="team-name-section">
                        <IonInput
                            placeholder="Enter team name..."
                            value={teamName}
                            onIonChange={(e) => setTeamName(e.detail.value!)}
                        />
                    </div>

                    <IonSearchbar
                        value={searchTerm}
                        onIonInput={(e) => setSearchTerm(e.detail.value!)}
                        placeholder="Search Pokémon..."
                        className="search-bar"
                    />

                    <div className="search-results">
                        {filteredPokemons.slice(0, 10).map((poke) => (
                            <div
                                key={poke.name}
                                className="search-item"
                                onClick={() => handleSelectPokemon(poke)}
                            >
                                <span>{poke.name}</span>
                                <IonButton size="small">Add</IonButton>
                            </div>
                        ))}
                    </div>

                    <div className="selected-pokemon">
                        <h3>Selected Pokémon ({selectedPokemons.length}/6)</h3>
                        <div className="pokemon-list">
                            {selectedPokemons.map((poke) => (
                                <IonCard key={poke.name} className="selected-card">
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
                    </div>

                    <IonButton expand="block" color="success" onClick={saveTeam}>
                        Save Team
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
}
