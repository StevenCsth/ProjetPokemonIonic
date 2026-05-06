import { IonCard, IonCardContent, IonIcon } from "@ionic/react";
import { Link } from "react-router-dom";
import "./Card.css";

type CardProps = {
    name: string;
    image: string;
};

export default function Card({ name, image }: CardProps) {
    return (
        <Link to={`/detail/${name}`} className="card-link">
            <IonCard className="pokemon-card">
                <img src={image} alt={name} className="card-image" />
                <IonCardContent className="card-content">
                    <h2 className="card-title">{name}</h2>
                </IonCardContent>
            </IonCard>
        </Link>
    );
}
