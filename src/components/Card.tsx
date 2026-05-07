import { IonCard, IonCardContent } from "@ionic/react";
import "./Card.css";
import { POKEMON_TYPE_COLORS } from "../constants/pokemonTypeColors";

type CardProps = {
    name: string;
    image: string;
    types?: string[];
    tintColor?: string;
    onClick?: () => void;
};

function readableTextColor(hexColor: string) {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.65 ? "#242423" : "#FFFFFF";
}

export default function Card({ name, image, types, tintColor, onClick }: CardProps) {
    return (
        <IonCard
            className="pokemon-card"
            button={Boolean(onClick)}
            onClick={onClick}
            style={
                tintColor
                    ? ({
                          ["--card-tint" as any]: tintColor,
                      } as React.CSSProperties)
                    : undefined
            }
        >
            <img src={image} alt={name} className="card-image" />
            <IonCardContent className="card-content">
                <h2 className="card-title">{name}</h2>
                {types && types.length > 0 && (
                    <div className="card-types">
                        {types.map((t) => (
                            <span
                                key={t}
                                className="card-type"
                                style={{
                                    background: POKEMON_TYPE_COLORS[t.toLowerCase()] ?? "#94a3b8",
                                    color: readableTextColor(
                                        POKEMON_TYPE_COLORS[t.toLowerCase()] ?? "#94a3b8"
                                    ),
                                }}
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </IonCardContent>
        </IonCard>
    );
}
