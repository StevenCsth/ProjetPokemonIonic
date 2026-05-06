import { useEffect, useState } from "react";
import {
    IonPage,
    IonContent,
    IonButton,
    IonInput,
    IonSearchbar,
    IonCard,
    IonCardContent,
    IonModal,
    IonAlert,
} from "@ionic/react";
import { Pokedex } from "../api/client";
import { Pokemon, PokemonListItem, Team } from "../types/models";
import "./Teams.css";

type View = "list" | "create" | "edit" | "random" | "detail";

export default function Teams() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentView, setCurrentView] = useState<View>("list");
    const [allPokemons, setAllPokemons] = useState<PokemonListItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPokemons, setSelectedPokemons] = useState<Pokemon[]>([]);
    const [teamName, setTeamName] = useState("");
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [randomTeam, setRandomTeam] = useState<Pokemon[]>([]);
    const [detailPokemon, setDetailPokemon] = useState<Pokemon | null>(null);

    const [infoAlertOpen, setInfoAlertOpen] = useState(false);
    const [infoAlertMessage, setInfoAlertMessage] = useState("");

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const [randomNamePromptOpen, setRandomNamePromptOpen] = useState(false);

    // Load teams and pokemons
    useEffect(() => {
        const stored = localStorage.getItem("pokemonTeams");
        if (stored) {
            setTeams(JSON.parse(stored));
        }

        const pokedex = Pokedex.pokemon;
        pokedex.listPokemons(0, 1008).then((data) => {
            setAllPokemons(data.results);
        });
    }, []);

    const getIdFromUrl = (url: string) => {
        const parts = url.split("/");
        return parts[parts.length - 2];
    };

    // ===== CREATE TEAM =====
    const filteredPokemons = allPokemons.filter((poke) =>
        poke.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectPokemon = (poke: PokemonListItem) => {
        if (selectedPokemons.length >= 6) {
            setInfoAlertMessage("Maximum 6 Pokémon per team!");
            setInfoAlertOpen(true);
            return;
        }

        if (selectedPokemons.find((p) => p.name === poke.name)) {
            setInfoAlertMessage("This Pokémon is already selected!");
            setInfoAlertOpen(true);
            return;
        }

        const id = getIdFromUrl(poke.url);
        const newPoke: Pokemon = {
            name: poke.name,
            id: parseInt(id),
            image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        };

        setSelectedPokemons([...selectedPokemons, newPoke]);
    };

    const removePokemonFromSelection = (name: string) => {
        setSelectedPokemons(selectedPokemons.filter((p) => p.name !== name));
    };

    const saveTeam = () => {
        if (!teamName.trim()) {
            setInfoAlertMessage("Please enter a team name.");
            setInfoAlertOpen(true);
            return;
        }

        if (selectedPokemons.length === 0) {
            setInfoAlertMessage("Please select at least one Pokémon.");
            setInfoAlertOpen(true);
            return;
        }

        if (editingTeamId) {
            // Update existing team
            const updatedTeams = teams.map((team) =>
                team.id === editingTeamId
                    ? { ...team, name: teamName, pokemons: selectedPokemons }
                    : team
            );
            setTeams(updatedTeams);
            localStorage.setItem("pokemonTeams", JSON.stringify(updatedTeams));
        } else {
            // Create new team
            const newTeam: Team = {
                id: Date.now().toString(),
                name: teamName,
                pokemons: selectedPokemons,
            };
            const newTeams = [...teams, newTeam];
            setTeams(newTeams);
            localStorage.setItem("pokemonTeams", JSON.stringify(newTeams));
        }

        resetForm();
        setCurrentView("list");
    };

    const resetForm = () => {
        setTeamName("");
        setSelectedPokemons([]);
        setSearchTerm("");
        setEditingTeamId(null);
    };

    const startCreateTeam = () => {
        resetForm();
        setCurrentView("create");
    };

    const startEditTeam = (team: Team) => {
        setEditingTeamId(team.id);
        setTeamName(team.name);
        setSelectedPokemons([...team.pokemons]);
        setCurrentView("edit");
    };

    // ===== RANDOM TEAM =====
    const generateRandomTeam = async () => {
        const pokedex = Pokedex.pokemon;
        const data = await pokedex.listPokemons(0, 1008);
        const shuffled = data.results.sort(() => Math.random() - 0.5);
        const selectedPokes: Pokemon[] = [];

        for (let i = 0; i < 6 && i < shuffled.length; i++) {
            const parts = shuffled[i].url.split("/");
            const id = parts[parts.length - 2];
            selectedPokes.push({
                name: shuffled[i].name,
                id: parseInt(id),
                image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
            });
        }

        setRandomTeam(selectedPokes);
    };

    const saveRandomTeam = () => {
        setRandomNamePromptOpen(true);
    };

    const persistRandomTeam = (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        const newTeam: Team = {
            id: Date.now().toString(),
            name: trimmed,
            pokemons: randomTeam,
        };
        const newTeams = [...teams, newTeam];
        setTeams(newTeams);
        localStorage.setItem("pokemonTeams", JSON.stringify(newTeams));

        setCurrentView("list");
    };

    // ===== DELETE TEAM =====
    const deleteTeam = (id: string) => {
        setPendingDeleteId(id);
        setConfirmDeleteOpen(true);
    };

    // ===== RENDER VIEWS =====
    const renderListView = () => (
        <>
            <div className="teams-header">
                <h1>My Teams</h1>
                <IonButton className="teams-header-btn" color="danger" onClick={startCreateTeam}>
                    Create New Team
                </IonButton>
                <IonButton className="teams-header-btn" color="secondary" onClick={() => setCurrentView("random")}>
                    Generate Random Team
                </IonButton>
            </div>

            {teams.length === 0 ? (
                <div className="empty-message">No teams yet. Create one!</div>
            ) : (
                <div className="teams-grid">
                    {teams.map((team) => (
                        <div key={team.id} className="team-card">
                            <h2>{team.name}</h2>
                            <p>{team.pokemons.length} Pokémon</p>
                            <div className="team-pokemon-list">
                                {team.pokemons.map((poke) => (
                                    <div
                                        key={poke.name}
                                        className="team-pokemon-mini"
                                        onClick={() => {
                                            setDetailPokemon(poke);
                                        }}
                                    >
                                        <img src={poke.image} alt={poke.name} />
                                    </div>
                                ))}
                            </div>
                            <div className="team-actions">
                                <IonButton
                                    className="teams-mini-btn"
                                    size="small"
                                    onClick={() => startEditTeam(team)}
                                >
                                    Edit
                                </IonButton>
                                <IonButton
                                    className="teams-mini-btn"
                                    size="small"
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
        </>
    );

    const renderCreateEditView = () => (
        <>
            <div className="form-header">
                <h2>{editingTeamId ? "Edit Team" : "Create New Team"}</h2>
                <IonButton className="teams-link-btn" fill="clear" onClick={() => (resetForm(), setCurrentView("list"))}>
                    ✕ Back
                </IonButton>
            </div>

            <div className="form-container">
                <div className="form-section">
                    <label>Team Name</label>
                    <IonInput
                        placeholder="Enter team name..."
                        value={teamName}
                        onIonChange={(e) => setTeamName(e.detail.value!)}
                    />
                </div>

                <div className="form-section">
                    <label>Search & Add Pokémon</label>
                    <IonSearchbar
                        value={searchTerm}
                        onIonInput={(e) => setSearchTerm(e.detail.value!)}
                        placeholder="Search Pokémon..."
                        className="search-bar"
                    />

                    <div className="search-results">
                        {filteredPokemons.slice(0, 15).map((poke) => (
                            <div
                                key={poke.name}
                                className="search-item"
                                onClick={() => handleSelectPokemon(poke)}
                            >
                                <span>{poke.name}</span>
                                <IonButton className="teams-mini-btn" size="small">Add</IonButton>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-section">
                    <h3>Selected Pokémon ({selectedPokemons.length}/6)</h3>
                    <div className="pokemon-list">
                        {selectedPokemons.map((poke) => (
                            <IonCard key={poke.name} className="selected-card">
                                <img src={poke.image} alt={poke.name} />
                                <IonCardContent>
                                    <p>{poke.name}</p>
                                    <IonButton
                                        className="teams-mini-btn"
                                        size="small"
                                        color="danger"
                                        onClick={() => removePokemonFromSelection(poke.name)}
                                    >
                                        Remove
                                    </IonButton>
                                </IonCardContent>
                            </IonCard>
                        ))}
                    </div>
                </div>

                <div className="form-actions">
                    <IonButton
                        className="teams-action-btn"
                        expand="block"
                        color="success"
                        onClick={saveTeam}
                    >
                        Save Team
                    </IonButton>
                    <IonButton
                        className="teams-action-btn"
                        expand="block"
                        fill="outline"
                        onClick={() => (resetForm(), setCurrentView("list"))}
                    >
                        Cancel
                    </IonButton>
                </div>
            </div>
        </>
    );

    const renderRandomView = () => (
        <>
            <div className="form-header">
                <h2>Generate Random Team</h2>
                <IonButton className="teams-link-btn" fill="clear" onClick={() => setCurrentView("list")}>
                    ✕ Back
                </IonButton>
            </div>

            <div className="random-container">
                <h3>Your Random Team</h3>
                <div className="team-pokemons">
                    {randomTeam.map((poke) => (
                        <div
                            key={poke.name}
                            className="team-pokemon"
                            onClick={() => setDetailPokemon(poke)}
                        >
                            <img src={poke.image} alt={poke.name} />
                            <p>{poke.name}</p>
                        </div>
                    ))}
                </div>

                <div className="random-actions">
                    <IonButton className="teams-action-btn" onClick={generateRandomTeam} expand="block">
                        Generate New Team
                    </IonButton>
                    <IonButton
                        className="teams-action-btn"
                        onClick={saveRandomTeam}
                        color="success"
                        expand="block"
                    >
                        Save Team
                    </IonButton>
                </div>
            </div>
        </>
    );

    return (
        <IonPage className="teams-page">
            <IonContent className="teams-content">
                {currentView === "list" && renderListView()}
                {(currentView === "create" || currentView === "edit") &&
                    renderCreateEditView()}
                {currentView === "random" && renderRandomView()}

                <IonModal
                    isOpen={detailPokemon !== null}
                    onDidDismiss={() => setDetailPokemon(null)}
                >
                    {detailPokemon && (
                        <IonContent>
                            <div className="detail-modal">
                                <IonButton
                                    fill="clear"
                                    onClick={() => setDetailPokemon(null)}
                                >
                                    ✕ Close
                                </IonButton>
                                <img
                                    src={detailPokemon.image}
                                    alt={detailPokemon.name}
                                    className="detail-image"
                                />
                                <h2>{detailPokemon.name}</h2>
                                <p>#{detailPokemon.id}</p>
                            </div>
                        </IonContent>
                    )}
                </IonModal>

                <IonAlert
                    isOpen={infoAlertOpen}
                    header="Info"
                    message={infoAlertMessage}
                    buttons={[
                        {
                            text: "OK",
                            role: "cancel",
                            handler: () => setInfoAlertOpen(false),
                        },
                    ]}
                    onDidDismiss={() => setInfoAlertOpen(false)}
                />

                <IonAlert
                    isOpen={confirmDeleteOpen}
                    header="Delete this team?"
                    message="This action cannot be undone."
                    buttons={[
                        {
                            text: "Cancel",
                            role: "cancel",
                            handler: () => {
                                setConfirmDeleteOpen(false);
                                setPendingDeleteId(null);
                            },
                        },
                        {
                            text: "Delete",
                            role: "destructive",
                            handler: () => {
                                if (pendingDeleteId) {
                                    const updatedTeams = teams.filter((team) => team.id !== pendingDeleteId);
                                    setTeams(updatedTeams);
                                    localStorage.setItem("pokemonTeams", JSON.stringify(updatedTeams));
                                }
                                setConfirmDeleteOpen(false);
                                setPendingDeleteId(null);
                            },
                        },
                    ]}
                    onDidDismiss={() => {
                        setConfirmDeleteOpen(false);
                        setPendingDeleteId(null);
                    }}
                />

                <IonAlert
                    isOpen={randomNamePromptOpen}
                    header="Team name"
                    inputs={[
                        {
                            name: "teamName",
                            type: "text",
                            placeholder: "e.g. Kanto Team",
                        },
                    ]}
                    buttons={[
                        {
                            text: "Cancel",
                            role: "cancel",
                            handler: () => setRandomNamePromptOpen(false),
                        },
                        {
                            text: "Save",
                            handler: (data) => {
                                persistRandomTeam(String((data as any)?.teamName ?? ""));
                                setRandomNamePromptOpen(false);
                            },
                        },
                    ]}
                    onDidDismiss={() => setRandomNamePromptOpen(false)}
                />
            </IonContent>
        </IonPage>
    );
}
