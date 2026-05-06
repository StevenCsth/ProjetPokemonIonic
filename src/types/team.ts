export type Pokemon = {
    name: string;
    id: number;
    image: string;
    moves?: string[];
    abilities?: string[];
};

export type Team = {
    id: string;
    name: string;
    pokemons: Pokemon[];
};
