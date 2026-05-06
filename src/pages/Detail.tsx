import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
    IonPage,
    IonContent,
    IonSpinner,
    IonChip,
    IonItem,
    IonLabel,
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
    sprites: {
        front_default: string | null;
        back_default?: string | null;
        front_shiny?: string | null;
        back_shiny?: string | null;
        other?: {
            ["official-artwork"]?: { front_default?: string | null };
        };
    };
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

type PokemonSpeciesResponse = {
    evolution_chain: { url: string };
    varieties: Array<{
        is_default: boolean;
        pokemon: NamedAPIResource;
    }>;
};

type EvolutionChainLink = {
    species: NamedAPIResource;
    evolves_to: EvolutionChainLink[];
};

type EvolutionChainResponse = {
    chain: EvolutionChainLink;
};

type BattleTab = "stats" | "moves";
type SpeciesTab = "evolution" | "forms";

function getReadableTextColor(hexColor: string) {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // Relative luminance (sRGB)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.65 ? "#242423" : "#FFFFFF";
}

function buildEvolutionPaths(link: EvolutionChainLink): string[][] {
    if (!link.evolves_to || link.evolves_to.length === 0) return [[link.species.name]];
    const paths: string[][] = [];
    for (const next of link.evolves_to) {
        for (const p of buildEvolutionPaths(next)) {
            paths.push([link.species.name, ...p]);
        }
    }
    return paths;
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

type PokemonMini = {
    id: number;
    name: string;
    image: string;
};

type SpriteItem = { label: string; url: string };

function buildSprites(p: PokemonDetail): SpriteItem[] {
    const candidates: Array<SpriteItem | null> = [
        p.sprites?.other?.["official-artwork"]?.front_default
            ? { label: "Official artwork", url: p.sprites.other["official-artwork"].front_default }
            : null,
        p.sprites?.front_default ? { label: "Front", url: p.sprites.front_default } : null,
        p.sprites?.back_default ? { label: "Back", url: p.sprites.back_default } : null,
        p.sprites?.front_shiny ? { label: "Front shiny", url: p.sprites.front_shiny } : null,
        p.sprites?.back_shiny ? { label: "Back shiny", url: p.sprites.back_shiny } : null,
    ];

    const uniq = new Set<string>();
    const sprites: SpriteItem[] = [];
    for (const c of candidates) {
        if (!c?.url) continue;
        if (uniq.has(c.url)) continue;
        uniq.add(c.url);
        sprites.push(c);
    }
    return sprites;
}

export default function Detail() {
    const { name } = useParams<{ name: string }>();
    const history = useHistory();
    const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [battleTab, setBattleTab] = useState<BattleTab>("stats");
    const [speciesTab, setSpeciesTab] = useState<SpeciesTab>("evolution");
    const [moveSearch, setMoveSearch] = useState("");
    const [versionGroupToGen, setVersionGroupToGen] = useState<Record<string, string>>({});
    const [openMove, setOpenMove] = useState<string | null>(null);
    const [moveDetails, setMoveDetails] = useState<Record<string, MoveDetail>>({});
    const [moveLoading, setMoveLoading] = useState<Record<string, boolean>>({});
    const [evolutionPaths, setEvolutionPaths] = useState<string[][]>([]);
    const [varieties, setVarieties] = useState<Array<{ name: string; isDefault: boolean }>>([]);
    const [pokemonMini, setPokemonMini] = useState<Record<string, PokemonMini>>({});
    const [pokemonMiniLoading, setPokemonMiniLoading] = useState<Record<string, boolean>>({});
    const [spriteIndex, setSpriteIndex] = useState(0);

    useEffect(() => {
        if (name) {
            setPokemon(null);
            setError(null);
            setEvolutionPaths([]);
            setVarieties([]);
            setSpriteIndex(0);
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
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`);
                if (!res.ok) throw new Error("bad species");
                const species = (await res.json()) as PokemonSpeciesResponse;

                if (cancelled) return;
                setVarieties(
                    (species.varieties ?? [])
                        .map((v) => ({ name: v.pokemon.name, isDefault: v.is_default }))
                        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name))
                );

                if (!species.evolution_chain?.url) return;
                const evoRes = await fetch(species.evolution_chain.url);
                if (!evoRes.ok) throw new Error("bad evo chain");
                const evo = (await evoRes.json()) as EvolutionChainResponse;
                if (cancelled) return;
                setEvolutionPaths(buildEvolutionPaths(evo.chain));
            } catch {
                // ignore: optional UI
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [pokemon]);

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

    useEffect(() => {
        if (speciesTab !== "evolution") return;
        const names = Array.from(new Set(evolutionPaths.flat()));
        for (const n of names) void ensurePokemonMini(n);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [speciesTab, evolutionPaths]);

    useEffect(() => {
        if (speciesTab !== "forms") return;
        const names = varieties.filter((v) => !v.isDefault).map((v) => v.name);
        for (const n of names) void ensurePokemonMini(n);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [speciesTab, varieties]);

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

    const sprites = buildSprites(pokemon);
    const fallbackSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
    const safeIndex = sprites.length === 0 ? 0 : Math.min(spriteIndex, sprites.length - 1);
    const activeSprite = sprites[safeIndex] ?? { label: "Sprite", url: fallbackSprite };

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

    const ensurePokemonMini = async (pokeName: string) => {
        if (pokemonMini[pokeName] || pokemonMiniLoading[pokeName]) return;
        setPokemonMiniLoading((prev) => ({ ...prev, [pokeName]: true }));
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokeName)}`);
            if (!res.ok) throw new Error("bad pokemon mini");
            const data = await res.json();
            const id = Number(data.id);
            const image =
                data?.sprites?.other?.["official-artwork"]?.front_default ??
                data?.sprites?.front_default ??
                `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
            setPokemonMini((prev) => ({ ...prev, [pokeName]: { id, name: pokeName, image } }));
        } catch {
            // ignore
        } finally {
            setPokemonMiniLoading((prev) => ({ ...prev, [pokeName]: false }));
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
                            <div className="sprite-carousel">
                                <img
                                    src={activeSprite.url}
                                    alt={`${pokemon.name} sprite`}
                                    className="detail-image"
                                />
                                <div className="sprite-controls">
                                    <IonButton
                                        fill="outline"
                                        size="small"
                                        disabled={sprites.length <= 1}
                                        onClick={() =>
                                            setSpriteIndex((i) =>
                                                sprites.length === 0 ? 0 : (i - 1 + sprites.length) % sprites.length
                                            )
                                        }
                                    >
                                        ◀
                                    </IonButton>
                                    <div className="sprite-meta">
                                        <div className="sprite-label">{activeSprite.label}</div>
                                        {sprites.length > 0 && (
                                            <div className="sprite-count">
                                                {safeIndex + 1}/{sprites.length}
                                            </div>
                                        )}
                                    </div>
                                    <IonButton
                                        fill="outline"
                                        size="small"
                                        disabled={sprites.length <= 1}
                                        onClick={() =>
                                            setSpriteIndex((i) =>
                                                sprites.length === 0 ? 0 : (i + 1) % sprites.length
                                            )
                                        }
                                    >
                                        ▶
                                    </IonButton>
                                </div>
                            </div>
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
                                <div className="tile-title">Make it speak !</div>
                                {pokemon.cries?.latest && (
                                    <audio controls preload="none" src={pokemon.cries.latest} />
                                )}
                                {!pokemon.cries?.latest && pokemon.cries?.legacy && (
                                    <audio controls preload="none" src={pokemon.cries.legacy} />
                                )}
                            </div>
                        )}

                        <div className="bento-tile bento-wide">
                            <div className="tile-title">Battle</div>
                            <div className="detail-tabs">
                                <IonSegment
                                    value={battleTab}
                                    onIonChange={(e) => setBattleTab(e.detail.value as BattleTab)}
                                >
                                    <IonSegmentButton value="stats">
                                        <IonLabel>Stats</IonLabel>
                                    </IonSegmentButton>
                                    <IonSegmentButton value="moves">
                                        <IonLabel>Moves</IonLabel>
                                    </IonSegmentButton>
                                </IonSegment>
                            </div>

                            {battleTab === "stats" && (
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

                            {battleTab === "moves" && (
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

                        <div className="bento-tile bento-wide">
                            <div className="tile-title">Species</div>
                            <div className="detail-tabs">
                                <IonSegment
                                    value={speciesTab}
                                    onIonChange={(e) => setSpeciesTab(e.detail.value as SpeciesTab)}
                                >
                                    <IonSegmentButton value="evolution">
                                        <IonLabel>Evolution</IonLabel>
                                    </IonSegmentButton>
                                    <IonSegmentButton value="forms">
                                        <IonLabel>Forms</IonLabel>
                                    </IonSegmentButton>
                                </IonSegment>
                            </div>

                            {speciesTab === "evolution" && (
                                <div className="stats">
                                    <div className="tile-title">Evolution line</div>
                                    {evolutionPaths.length === 0 ? (
                                        <div className="empty-tile">No evolution data.</div>
                                    ) : (
                                        <div className="evo-list">
                                            {evolutionPaths.map((path, idx) => (
                                                <div className="evo-path" key={idx}>
                                                    {path.map((n, i) => {
                                                        const mini = pokemonMini[n];
                                                        return (
                                                            <span key={`${n}-${i}`} className="evo-node">
                                                                <button
                                                                    type="button"
                                                                    className="poke-mini"
                                                                    onClick={() => history.push(`/pokemon/${n}`)}
                                                                >
                                                                    <img
                                                                        src={mini?.image}
                                                                        alt={n}
                                                                        className="poke-mini-img"
                                                                        loading="lazy"
                                                                    />
                                                                    <span className="poke-mini-name">{n}</span>
                                                                </button>
                                                                {i < path.length - 1 && (
                                                                    <span className="evo-arrow">→</span>
                                                                )}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {speciesTab === "forms" && (
                                <div className="stats">
                                    <div className="tile-title">Alternate forms</div>
                                    {varieties.filter((v) => !v.isDefault).length === 0 ? (
                                        <div className="empty-tile">No alternate forms.</div>
                                    ) : (
                                        <div className="forms-grid">
                                            {varieties
                                                .filter((v) => !v.isDefault)
                                                .map((v) => {
                                                    const mini = pokemonMini[v.name];
                                                    return (
                                                        <button
                                                            key={v.name}
                                                            type="button"
                                                            className="form-card"
                                                            onClick={() => history.push(`/pokemon/${v.name}`)}
                                                        >
                                                            <img
                                                                src={mini?.image}
                                                                alt={v.name}
                                                                className="form-img"
                                                                loading="lazy"
                                                            />
                                                            <div className="form-name">{v.name}</div>
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
}
