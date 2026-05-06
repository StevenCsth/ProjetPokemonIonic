import { IonCard, IonCardContent } from "@ionic/react";
import "./Card.css";

type CardProps = {
    name: string;
    image: string;
    onClick?: () => void;
};

export default function Card({ name, image, onClick }: CardProps) {
    return (
        <IonCard className="pokemon-card" button={Boolean(onClick)} onClick={onClick}>
            <img src={image} alt={name} className="card-image" />
            <IonCardContent className="card-content">
                <h2 className="card-title">{name}</h2>
            </IonCardContent>
        </IonCard>
    );
}
