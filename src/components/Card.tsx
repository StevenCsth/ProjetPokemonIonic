import { IonCard, IonCardContent } from "@ionic/react";
import "./Card.css";

type CardProps = {
    name: string;
    image: string;
};

export default function Card({ name, image }: CardProps) {
    return (
        <IonCard className="pokemon-card">
            <img src={image} alt={name} className="card-image" />
            <IonCardContent className="card-content">
                <h2 className="card-title">{name}</h2>
            </IonCardContent>
        </IonCard>
    );
}
