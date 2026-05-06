import { useEffect, useState } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonSearchbar,
  IonButton,
} from "@ionic/react";
import { Pokedex } from "../api/client";
import Card from "../components/Card";
import "./Home.css";

type Pokemon = {
  name: string;
  url: string;
};

const PAGE_SIZE = 20;

const Home: React.FC = () => {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.ceil(filteredPokemons.length / PAGE_SIZE);
  const paginatedPokemons = filteredPokemons.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="ion-toolbar-dark">
          <IonSearchbar
            value={searchTerm}
            onIonInput={(e) => {
              setSearchTerm(e.detail.value!);
              setCurrentPage(1);
            }}
            placeholder="Search a Pokémon..."
            className="search-bar"
          />
        </IonToolbar>
      </IonHeader>

      <IonContent className="home-content">
        <div className="pokemon-grid">
          {paginatedPokemons.map((poke) => {
            const id = getIdFromUrl(poke.url);
            const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
            return <Card key={poke.name} name={poke.name} image={imageUrl} />;
          })}
        </div>

        <div className="pagination-controls">
          <IonButton
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ◀ Prev
          </IonButton>
          <span className="page-info">
            Page {currentPage} / {totalPages}
          </span>
          <IonButton
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next ▶
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
