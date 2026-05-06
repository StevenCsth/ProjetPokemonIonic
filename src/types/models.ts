export type PokemonListItem = {
  name: string;
  url: string;
};

export type Pokemon = {
  name: string;
  id: number;
  image: string;
  moves?: string[];
  abilities?: string[];
};

export type SelectedPokemon = Pokemon;

export type Team = {
  id: string;
  name: string;
  pokemons: Pokemon[];
};

export type CustomPokemon = {
  id: number;
  name: string;
  image: string;
  moves: string[];
  abilities: string[];
  selectedMoves: string[];
  selectedAbility: string | null;
};

