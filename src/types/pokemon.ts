export type CustomPokemon = {
    id: number;
    name: string;
    image: string;
    moves: string[];            // Tous les noms de moves possibles
    abilities: string[];        // Tous les noms des capacités
    selectedMoves: string[];    // Max 4 moves sélectionnés
    selectedAbility: string | null;
};
