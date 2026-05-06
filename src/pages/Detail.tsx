import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    IonPage,
    IonContent,
    IonSpinner,
    IonChip,
    IonItem,
    IonLabel,
    IonList,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonSearchbar,
    IonAccordion,
    IonAccordionGroup,
} from "@ionic/react";
import "./Detail.css";
import { POKEMON_TYPE_COLORS } from "../constants/pokemonTypeColors";

type NamedAPIResource = { name: string; url: string };

type VersionGroupDetail = {
    level_learned_at: number;
    move_learn_method: NamedAPIResource;
    version_group: NamedAPIResource;
};

type PokemonDetail = {
    id: number;
    name: string;
    height: number;
    weight: number;
    base_experience: number | null;
    sprites: { front_default: string | null };
    cries?: { latest?: string; legacy?: string };
    types: Array<{ slot: number; type: NamedAPIResource }>;
    stats: Array<{ base_stat: number; effort: number; stat: NamedAPIResource }>;
    abilities: Array<{
        is_hidden: boolean;
        slot: number;
        ability: NamedAPIResource;
    }>;
    held_items: Array<{
        item: NamedAPIResource;
    }>;
    moves: Array<{
        move: NamedAPIResource;
        version_group_details: VersionGroupDetail[];
    }>;
    location_area_encounters?: string;
};

type VersionGroupResponse = {
    name: string;
    generation: NamedAPIResource;
};

type Tab = "stats" | "moves";

function getReadableTextColor(hexColor: string) {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // Relative luminance (sRGB)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.65 ? "#242423" : "#FFFFFF";
}

type MoveDetail = {
    name: string;
    type: NamedAPIResource;
    power: number | null;
    accuracy: number | null;
    pp: number | null;
    priority: number;
    damage_class: NamedAPIResource;
    effect_entries: Array<{
        effect: string;
        short_effect: string;
        language: NamedAPIResource;
    }>;
};

export default function Detail() {
    const { name } = useParams<{ name: string }>();
    const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>("stats");
    const [moveSearch, setMoveSearch] = useState("");
    const [versionGroupToGen, setVersionGroupToGen] = useState<Record<string, string>>({});
    const [openMove, setOpenMove] = useState<string | null>(null);
    const [moveDetails, setMoveDetails] = useState<Record<string, MoveDetail>>({});
    const [moveLoading, setMoveLoading] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (name) {
            setPokemon(null);
            setError(null);
            fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`)
                .then(async (res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return (await res.json()) as PokemonDetail;
                })
                .then((data) => setPokemon(data))
                .catch(() => setError("Unable to load this Pokémon."));
        }
    }, [name]);

    useEffect(() => {
        if (!pokemon) return;
        const versionGroups = new Map<string, string>();

        for (const move of pokemon.moves) {
            for (const d of move.version_group_details ?? []) {
                if (d?.version_group?.url) versionGroups.set(d.version_group.url, d.version_group.name);
            }
        }

        const urls = Array.from(versionGroups.keys());
        if (urls.length === 0) return;

        let cancelled = false;
        Promise.all(
            urls.map((url) =>
                fetch(url)
                    .then(async (r) => {
                        if (!r.ok) throw new Error("bad version group");
                        return (await r.json()) as VersionGroupResponse;
                    })
                    .then((vg) => ({ url, generation: vg.generation?.name ?? "unknown" }))
                    .catch(() => ({ url, generation: "unknown" }))
            )
        ).then((rows) => {
            if (cancelled) return;
            const map: Record<string, string> = {};
            for (const r of rows) map[r.url] = r.generation;
            setVersionGroupToGen(map);
        });

        return () => {
            cancelled = true;
        };
    }, [pokemon]);

    if (error) {
        return (
            <IonPage>
                <IonContent className="ion-padding">
                    <p>{error}</p>
                </IonContent>
            </IonPage>
        );
    }

    if (!pokemon) {
        return (
            <IonPage>
                <IonContent className="ion-padding detail-content">
                    <IonSpinner />
                </IonContent>
            </IonPage>
        );
    }

    const mainImage =
        pokemon.sprites.front_default ??
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;

    const normalizedMoveSearch = moveSearch.trim().toLowerCase();
    const filteredMoves = pokemon.moves
        .filter((m) => m.move.name.toLowerCase().includes(normalizedMoveSearch))
        .sort((a, b) => a.move.name.localeCompare(b.move.name));

    const ensureMoveDetail = async (moveName: string, moveUrl: string) => {
        if (moveDetails[moveName] || moveLoading[moveName]) return;
        setMoveLoading((prev) => ({ ...prev, [moveName]: true }));
        try {
            const res = await fetch(moveUrl);
            if (!res.ok) throw new Error("bad move");
            const data = (await res.json()) as MoveDetail;
            setMoveDetails((prev) => ({ ...prev, [moveName]: data }));
        } catch {
            // ignore; we'll just render minimal info
        } finally {
            setMoveLoading((prev) => ({ ...prev, [moveName]: false }));
        }
    };

    return (
        <IonPage className="detail-page">
            <IonContent className="detail-content">
                <div className="detail-shell">
                    <div className="detail-topbar">
                        <IonButton routerLink="/" fill="clear">
                            ← Back
                        </IonButton>
                    </div>

                    <div className="bento-grid">
                        <div className="bento-tile bento-hero">
                            <img
                                src={mainImage}
                                alt={pokemon.name}
                                className="detail-image"
                            />
                            <div className="hero-right">
                                <h1 className="hero-title">{pokemon.name}</h1>
                                <div className="types">
                                    {pokemon.types
                                        .slice()
                                        .sort((a, b) => a.slot - b.slot)
                                        .map(({ type }) => (
                                            <span
                                                key={type.name}
                                                className="type-badge"
                                                style={{
                                                    background: POKEMON_TYPE_COLORS[type.name.toLowerCase()] ?? "#94a3b8",
                                                    color: getReadableTextColor(
                                                        POKEMON_TYPE_COLORS[type.name.toLowerCase()] ?? "#94a3b8"
                                                    ),
                                                }}
                                            >
                                                {type.name}
                                            </span>
                                        ))}
                                </div>

                                <div className="hero-metrics">
                                    <div className="metric">
                                        <div className="metric-label">ID</div>
                                        <div className="metric-value">#{pokemon.id}</div>
                                    </div>
                                    <div className="metric">
                                        <div className="metric-label">Height</div>
                                        <div className="metric-value">{pokemon.height} dm</div>
                                    </div>
                                    <div className="metric">
                                        <div className="metric-label">Weight</div>
                                        <div className="metric-value">{pokemon.weight} hg</div>
                                    </div>
                                    <div className="metric">
                                        <div className="metric-label">Base exp</div>
                                        <div className="metric-value">{pokemon.base_experience ?? "—"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bento-tile">
                            <div className="tile-title">Abilities</div>
                            <div className="chips-wrap">
                                {pokemon.abilities
                                    .slice()
                                    .sort((a, b) => a.slot - b.slot)
                                    .map((a) => (
                                        <IonChip className="chip-static" key={`${a.ability.name}-${a.slot}`}>
                                            {a.ability.name}
                                            {a.is_hidden ? " (hidden)" : ""}
                                        </IonChip>
                                    ))}
                            </div>
                        </div>

                        {pokemon.held_items.length > 0 && (
                            <div className="bento-tile">
                                <div className="tile-title">Held items</div>
                                <div className="chips-wrap">
                                    {pokemon.held_items.map((h) => (
                                        <IonChip className="chip-static" key={h.item.name}>
                                            {h.item.name}
                                        </IonChip>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(pokemon.cries?.latest || pokemon.cries?.legacy) && (
                            <div className="bento-tile">
                                <div className="tile-title">Cry</div>
                                {pokemon.cries?.latest && (
                                    <audio controls preload="none" src={pokemon.cries.latest} />
                                )}
                                {!pokemon.cries?.latest && pokemon.cries?.legacy && (
                                    <audio controls preload="none" src={pokemon.cries.legacy} />
                                )}
                            </div>
                        )}

                        <div className="bento-tile bento-wide">
                            <div className="detail-tabs">
                                <IonSegment
                                    value={tab}
                                    onIonChange={(e) => setTab(e.detail.value as Tab)}
                                >
                                    <IonSegmentButton value="stats">
                                        <IonLabel>Stats</IonLabel>
                                    </IonSegmentButton>
                                    <IonSegmentButton value="moves">
                                        <IonLabel>Moves</IonLabel>
                                    </IonSegmentButton>
                                </IonSegment>
                            </div>

                            {tab === "stats" && (
                                <div className="stats">
                                    <div className="tile-title">Stats</div>
                                    {pokemon.stats.map(({ stat, base_stat }) => (
                                        <div key={stat.name} className="stat-row">
                                            <span className="stat-name">{stat.name}</span>
                                            <span className="stat-value">{base_stat}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {tab === "moves" && (
                                <div className="stats">
                                    <div className="tile-title">Moves</div>
                                    <IonSearchbar
                                        value={moveSearch}
                                        onIonInput={(e) => setMoveSearch(e.detail.value ?? "")}
                                        placeholder="Search a move…"
                                        className="search-bar"
                                    />

                                    <div className="moves-meta">
                                        {filteredMoves.length} move(s)
                                    </div>

                                    <IonAccordionGroup
                                        value={openMove ?? undefined}
                                        onIonChange={(e) => {
                                            const value = (e.detail.value ?? null) as string | null;
                                            setOpenMove(value);
                                            if (!value) return;
                                            const move = filteredMoves.find((x) => x.move.name === value);
                                            if (move) void ensureMoveDetail(move.move.name, move.move.url);
                                        }}
                                    >
                                        {filteredMoves.map((m) => (
                                            <IonAccordion key={m.move.name} value={m.move.name}>
                                                <IonItem slot="header">
                                                    <IonLabel className="move-title">
                                                        {m.move.name}
                                                    </IonLabel>
                                                </IonItem>
                                                <div className="ion-padding" slot="content">
                                                    {(() => {
                                                        const detail = moveDetails[m.move.name];
                                                        const typeName = detail?.type?.name?.toLowerCase();
                                                        const typeColor =
                                                            (typeName && POKEMON_TYPE_COLORS[typeName]) ?? "#94a3b8";
                                                        const effectEn = detail?.effect_entries?.find(
                                                            (x) => x.language?.name === "en"
                                                        );
                                                        const effectFallback = detail?.effect_entries?.[0];

                                                        return (
                                                            <>
                                                                <div className="move-top">
                                                                    <span className="move-type-label">Type</span>
                                                                    <span
                                                                        className="type-badge"
                                                                        style={{
                                                                            background: typeColor,
                                                                            color: getReadableTextColor(typeColor),
                                                                        }}
                                                                    >
                                                                        {detail?.type?.name ?? "—"}
                                                                    </span>
                                                                    {moveLoading[m.move.name] && (
                                                                        <span className="move-loading">Loading…</span>
                                                                    )}
                                                                </div>

                                                                {detail && (
                                                                    <div className="move-stats-grid">
                                                                        <div>
                                                                            <strong>Category</strong>:{" "}
                                                                            {detail.damage_class?.name ?? "—"}
                                                                        </div>
                                                                        <div>
                                                                            <strong>Power</strong>:{" "}
                                                                            {detail.power ?? "—"}
                                                                        </div>
                                                                        <div>
                                                                            <strong>Accuracy</strong>:{" "}
                                                                            {detail.accuracy ?? "—"}
                                                                        </div>
                                                                        <div>
                                                                            <strong>PP</strong>: {detail.pp ?? "—"}
                                                                        </div>
                                                                        <div>
                                                                            <strong>Priority</strong>: {detail.priority}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {(effectEn?.short_effect || effectFallback?.short_effect) && (
                                                                    <div className="move-effect">
                                                                        <strong>Effect</strong>:{" "}
                                                                        {effectEn?.short_effect ??
                                                                            effectFallback?.short_effect}
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}

                                                    {(m.version_group_details ?? [])
                                                        .slice()
                                                        .sort((a, b) =>
                                                            a.version_group.name.localeCompare(b.version_group.name)
                                                        )
                                                        .map((d, idx) => {
                                                            const gen = versionGroupToGen[d.version_group.url] ?? "…";
                                                            const level =
                                                                d.level_learned_at && d.level_learned_at > 0
                                                                    ? `lvl ${d.level_learned_at}`
                                                                    : "—";
                                                            return (
                                                                <div className="move-line" key={`${d.version_group.name}-${d.move_learn_method.name}-${idx}`}>
                                                                    <div>
                                                                        <strong>Generation</strong>: {gen}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Version group</strong>: {d.version_group.name}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Method</strong>: {d.move_learn_method.name}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Level</strong>: {level}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </IonAccordion>
                                        ))}
                                    </IonAccordionGroup>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
}
