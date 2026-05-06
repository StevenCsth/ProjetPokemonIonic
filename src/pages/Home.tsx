import { useEffect, useState } from "react";
import {
  IonPage,
  IonContent,
  IonSearchbar,
  IonButton,
} from "@ionic/react";
import { Pokedex } from "../api/client";
import Card from "../components/Card";
import { PokemonListItem } from "../types/models";
import { useHistory } from "react-router-dom";
import "./Home.css";

const PAGE_SIZE = 20;

const Home: React.FC = () => {
  const history = useHistory();
  const [pokemons, setPokemons] = useState<PokemonListItem[]>([]);
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
    <IonPage className="home-page">
      <IonContent className="home-content">
        <div className="home-search-wrap">
          <IonSearchbar
            value={searchTerm}
            onIonInput={(e) => {
              setSearchTerm(e.detail.value!);
              setCurrentPage(1);
            }}
            placeholder="Search a Pokémon..."
            className="search-bar"
          />
        </div>

        <div className="pokemon-grid">
          {paginatedPokemons.map((poke) => {
            const id = getIdFromUrl(poke.url);
            const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
            return (
              <Card
                key={poke.name}
                name={poke.name}
                image={imageUrl}
                onClick={() => history.push(`/pokemon/${poke.name}`)}
              />
            );
          })}
        </div>

        <div className="pagination-controls">
          <IonButton
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ◀
          </IonButton>
          <span className="page-info">
            Page {currentPage} / {totalPages}
          </span>
          <IonButton
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            ▶
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
