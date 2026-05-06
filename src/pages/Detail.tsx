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
} from "@ionic/react";
import "./Detail.css";

export default function Detail() {
    const { name } = useParams<{ name: string }>();
    const history = useHistory();
    const [pokemon, setPokemon] = useState<any>(null);

    useEffect(() => {
        if (name) {
            fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)
                .then((res) => res.json())
                .then((data) => setPokemon(data));
        }
    }, [name]);

    if (!pokemon) {
        return (
            <IonPage>
                <IonContent className="ion-padding">
                    <p>Loading...</p>
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar className="ion-toolbar-dark">
                    <IonBackButton defaultHref="/" />
                    <IonTitle>{pokemon.name}</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="detail-content">
                <div className="detail-card">
                    <img
                        src={pokemon.sprites.front_default}
                        alt={pokemon.name}
                        className="detail-image"
                    />
                    <h1>{pokemon.name}</h1>
                    <p>Height: {pokemon.height} dm</p>
                    <p>Weight: {pokemon.weight} hg</p>

                    <div className="types">
                        {pokemon.types.map(({ type }: any) => (
                            <span
                                key={type.name}
                                className={`type-badge type-${type.name.toLowerCase()}`}
                            >
                                {type.name}
                            </span>
                        ))}
                    </div>

                    <div className="stats">
                        <h2>Stats</h2>
                        {pokemon.stats.map(({ stat, base_stat }: any) => (
                            <div key={stat.name} className="stat-row">
                                <span className="stat-name">{stat.name}</span>
                                <span className="stat-value">{base_stat}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
}
