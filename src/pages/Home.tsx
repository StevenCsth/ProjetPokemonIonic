import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IonPage,
  IonContent,
  IonSearchbar,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from "@ionic/react";
import { Pokedex } from "../api/client";
import Card from "../components/Card";
import { PokemonListItem } from "../types/models";
import { useHistory } from "react-router-dom";
import "./Home.css";
import { POKEMON_TYPE_COLORS } from "../constants/pokemonTypeColors";

const PAGE_SIZE = 20;

type PokemonTypeSlot = { slot: number; type: { name: string } };
type PokemonTypesResponse = { types: PokemonTypeSlot[] };

type SpeciesResponse = {
  generation: { name: string };
  evolution_chain: { url: string };
  evolves_from_species: { name: string } | null;
};

type EvolutionChainLink = { species: { name: string }; evolves_to: EvolutionChainLink[] };
type EvolutionChainResponse = { chain: EvolutionChainLink };

type EvoFilter = "all" | "stage1" | "no_evo";
type TypeMode = "all" | "mono" | "multi";

function collectSpeciesNames(link: EvolutionChainLink, out: Set<string>) {
  out.add(link.species.name);
  for (const next of link.evolves_to ?? []) collectSpeciesNames(next, out);
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  const queue = items.slice();
  const runners: Promise<void>[] = [];
  const runOne = async () => {
    while (queue.length) {
      const item = queue.shift()!;
      await worker(item);
    }
  };
  for (let i = 0; i < Math.max(1, concurrency); i++) runners.push(runOne());
  await Promise.all(runners);
}

const Home: React.FC = () => {
  const history = useHistory();
  const contentRef = useRef<HTMLIonContentElement | null>(null);
  const [pokemons, setPokemons] = useState<PokemonListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [typesByName, setTypesByName] = useState<Record<string, string[]>>({});
  const [speciesByName, setSpeciesByName] = useState<
    Record<string, { generation: string; chainUrl: string; isBase: boolean }>
  >({});
  const [chainSizeByUrl, setChainSizeByUrl] = useState<Record<string, number>>({});

  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterGeneration, setFilterGeneration] = useState<string>("all");
  const [filterTypeMode, setFilterTypeMode] = useState<TypeMode>("all");
  const [filterEvo, setFilterEvo] = useState<EvoFilter>("all");
  const [filterDataLoading, setFilterDataLoading] = useState(false);

  const scrollToTop = useCallback(() => {
    // Ensure it runs after DOM updates
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          await contentRef.current?.scrollToTop(250);
          const el = await contentRef.current?.getScrollElement();
          el?.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          // Fallback in case scrolling is delegated to window
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });
  }, []);

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

  const nameMatches = useMemo(
    () =>
      pokemons.filter((poke) =>
        poke.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [pokemons, searchTerm]
  );

  const needsTypes = filterTypes.length > 0 || filterTypeMode !== "all";
  const needsSpecies = filterGeneration !== "all" || filterEvo !== "all";
  const needsChainSize = filterEvo === "no_evo";

  const isFilterDataReady = useMemo(() => {
    if (!needsTypes && !needsSpecies) return true;
    const names = nameMatches.map((p) => p.name);
    if (needsTypes) {
      if (names.some((n) => !typesByName[n])) return false;
    }
    if (needsSpecies) {
      if (names.some((n) => !speciesByName[n])) return false;
    }
    if (needsChainSize) {
      const urls = names.map((n) => speciesByName[n]?.chainUrl).filter(Boolean);
      if (urls.some((u) => !chainSizeByUrl[u!])) return false;
    }
    return true;
  }, [chainSizeByUrl, nameMatches, needsChainSize, needsSpecies, needsTypes, speciesByName, typesByName]);

  const filteredPokemons = useMemo(() => {
    if (!isFilterDataReady && (needsTypes || needsSpecies)) return [];

    return nameMatches.filter((poke) => {
      const types = typesByName[poke.name];
      const species = speciesByName[poke.name];

      if (filterTypes.length > 0) {
        for (const t of filterTypes) if (!types?.includes(t)) return false;
      }

      if (filterTypeMode !== "all") {
        if (filterTypeMode === "mono" && (types?.length ?? 0) !== 1) return false;
        if (filterTypeMode === "multi" && (types?.length ?? 0) <= 1) return false;
      }

      if (filterGeneration !== "all") {
        if (species?.generation !== filterGeneration) return false;
      }

      if (filterEvo !== "all") {
        if (filterEvo === "stage1" && !species?.isBase) return false;
        if (filterEvo === "no_evo") {
          const chainSize = species?.chainUrl ? chainSizeByUrl[species.chainUrl] : undefined;
          if (chainSize !== 1) return false;
        }
      }

      return true;
    });
  }, [
    chainSizeByUrl,
    filterEvo,
    filterGeneration,
    filterTypeMode,
    filterTypes,
    isFilterDataReady,
    nameMatches,
    needsSpecies,
    needsTypes,
    speciesByName,
    typesByName,
  ]);

  const totalPages = Math.ceil(filteredPokemons.length / PAGE_SIZE);
  const paginatedPokemons = filteredPokemons.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Prefetch types/species data required by active filters (for all search matches)
  useEffect(() => {
    let cancelled = false;
    const names = nameMatches.map((p) => p.name);
    const load = async () => {
      if (!needsTypes && !needsSpecies) return;
      setFilterDataLoading(true);

      try {
        if (needsTypes) {
          const missingTypes = names.filter((n) => !typesByName[n]);
          await runWithConcurrency(missingTypes, 10, async (n) => {
            if (cancelled) return;
            try {
              const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(n)}`);
              if (!r.ok) throw new Error("bad pokemon");
              const data = (await r.json()) as PokemonTypesResponse;
              const types: string[] = (data.types ?? [])
                .slice()
                .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
                .map((t) => String(t.type?.name ?? "").toLowerCase())
                .filter(Boolean);
              if (cancelled) return;
              setTypesByName((prev) => (prev[n] ? prev : { ...prev, [n]: types }));
            } catch {
              if (cancelled) return;
              setTypesByName((prev) => (prev[n] ? prev : { ...prev, [n]: [] }));
            }
          });
        }

        if (needsSpecies) {
          const missingSpecies = names.filter((n) => !speciesByName[n]);
          await runWithConcurrency(missingSpecies, 10, async (n) => {
            if (cancelled) return;
            try {
              const r = await fetch(
                `https://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(n)}`
              );
              if (!r.ok) throw new Error("bad species");
              const data = (await r.json()) as SpeciesResponse;
              const row = {
                generation: data.generation?.name ?? "unknown",
                chainUrl: data.evolution_chain?.url ?? "",
                isBase: data.evolves_from_species == null,
              };
              if (!row.chainUrl) return;
              if (cancelled) return;
              setSpeciesByName((prev) => (prev[n] ? prev : { ...prev, [n]: row }));
            } catch {
              // ignore
            }
          });
        }

        if (needsChainSize) {
          const urls = Array.from(
            new Set(
              names
                .map((n) => speciesByName[n]?.chainUrl)
                .filter((u): u is string => Boolean(u))
            )
          ).filter((u) => !chainSizeByUrl[u]);

          await runWithConcurrency(urls, 6, async (url) => {
            if (cancelled) return;
            try {
              const r = await fetch(url);
              if (!r.ok) throw new Error("bad chain");
              const data = (await r.json()) as EvolutionChainResponse;
              const s = new Set<string>();
              collectSpeciesNames(data.chain, s);
              if (cancelled) return;
              if (s.size > 0) {
                setChainSizeByUrl((prev) => (prev[url] ? prev : { ...prev, [url]: s.size }));
              }
            } catch {
              // ignore
            }
          });
        }
      } finally {
        if (!cancelled) setFilterDataLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [chainSizeByUrl, nameMatches, needsChainSize, needsSpecies, needsTypes, speciesByName, typesByName]);

  useEffect(() => {
    let cancelled = false;
    const missing = paginatedPokemons
      .map((p) => p.name)
      .filter((n) => !typesByName[n]);

    if (missing.length === 0) return;

    Promise.all(
      missing.map((n) =>
        fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(n)}`)
          .then(async (r) => {
            if (!r.ok) throw new Error("bad pokemon");
            const data = (await r.json()) as PokemonTypesResponse;
            const types: string[] = (data.types ?? [])
              .slice()
              .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
              .map((t) => String(t.type?.name ?? "").toLowerCase())
              .filter(Boolean);
            return { name: n, types };
          })
          .catch(() => ({ name: n, types: [] as string[] }))
      )
    ).then((rows) => {
      if (cancelled) return;
      setTypesByName((prev) => {
        const next = { ...prev };
        for (const r of rows) next[r.name] = r.types;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [paginatedPokemons, typesByName]);

  useEffect(() => {
    let cancelled = false;
    const missing = paginatedPokemons
      .map((p) => p.name)
      .filter((n) => !speciesByName[n]);

    if (missing.length === 0) return;

    Promise.all(
      missing.map((n) =>
        fetch(`https://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(n)}`)
          .then(async (r) => {
            if (!r.ok) throw new Error("bad species");
            const data = (await r.json()) as SpeciesResponse;
            return {
              name: n,
              generation: data.generation?.name ?? "unknown",
              chainUrl: data.evolution_chain?.url ?? "",
              isBase: data.evolves_from_species == null,
            };
          })
          .catch(() => ({ name: n, generation: "unknown", chainUrl: "", isBase: false }))
      )
    ).then((rows) => {
      if (cancelled) return;
      setSpeciesByName((prev) => {
        const next = { ...prev };
        for (const r of rows) {
          if (!r.chainUrl) continue;
          next[r.name] = { generation: r.generation, chainUrl: r.chainUrl, isBase: r.isBase };
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [paginatedPokemons, speciesByName]);

  useEffect(() => {
    let cancelled = false;
    const chainUrls = Array.from(
      new Set(
        paginatedPokemons
          .map((p) => speciesByName[p.name]?.chainUrl)
          .filter((u): u is string => Boolean(u))
          .filter((u) => !chainSizeByUrl[u])
      )
    );

    if (chainUrls.length === 0) return;

    Promise.all(
      chainUrls.map((url) =>
        fetch(url)
          .then(async (r) => {
            if (!r.ok) throw new Error("bad chain");
            const data = (await r.json()) as EvolutionChainResponse;
            const names = new Set<string>();
            collectSpeciesNames(data.chain, names);
            return { url, size: names.size };
          })
          .catch(() => ({ url, size: 0 }))
      )
    ).then((rows) => {
      if (cancelled) return;
      setChainSizeByUrl((prev) => {
        const next = { ...prev };
        for (const r of rows) if (r.size > 0) next[r.url] = r.size;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [paginatedPokemons, speciesByName, chainSizeByUrl]);

  useEffect(() => {
    // Scroll to top when changing page (or after resetting page from search)
    scrollToTop();
  }, [currentPage, scrollToTop]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
    scrollToTop();
  }, [filterTypes, filterGeneration, filterTypeMode, filterEvo, scrollToTop]);

  const generationOptions = Array.from(
    new Set(Object.values(speciesByName).map((s) => s.generation).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <IonPage className="home-page">
      <IonContent ref={contentRef} className="home-content">
        <div className="home-search-wrap">
          <IonSearchbar
            value={searchTerm}
            onIonInput={(e) => {
              setSearchTerm(e.detail.value!);
              setCurrentPage(1);
              scrollToTop();
            }}
            placeholder="Search a Pokémon..."
            className="search-bar"
          />
        </div>

        <div className="home-filters">
          <IonItem lines="none" className="filter-item">
            <IonLabel>Types</IonLabel>
            <IonSelect
              multiple
              value={filterTypes}
              placeholder="All"
              onIonChange={(e) => setFilterTypes(e.detail.value ?? [])}
            >
              {Object.keys(POKEMON_TYPE_COLORS)
                .slice()
                .sort((a, b) => a.localeCompare(b))
                .map((t) => (
                  <IonSelectOption key={t} value={t}>
                    {t}
                  </IonSelectOption>
                ))}
            </IonSelect>
          </IonItem>

          <IonItem lines="none" className="filter-item">
            <IonLabel>Generation</IonLabel>
            <IonSelect
              value={filterGeneration}
              placeholder="All"
              onIonChange={(e) => setFilterGeneration(e.detail.value)}
            >
              <IonSelectOption value="all">All</IonSelectOption>
              {generationOptions.map((g) => (
                <IonSelectOption key={g} value={g}>
                  {g}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          <div className="filter-segments">
            <div className="filter-segment">
              <div className="filter-segment-label">Type mode</div>
              <IonSegment value={filterTypeMode} onIonChange={(e) => setFilterTypeMode(e.detail.value as TypeMode)}>
                <IonSegmentButton value="all">
                  <IonLabel>All</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="mono">
                  <IonLabel>Monotype</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="multi">
                  <IonLabel>Multitype</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>

            <div className="filter-segment">
              <div className="filter-segment-label">Evolution</div>
              <IonSegment value={filterEvo} onIonChange={(e) => setFilterEvo(e.detail.value as EvoFilter)}>
                <IonSegmentButton value="all">
                  <IonLabel>All</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="stage1">
                  <IonLabel>Stage 1</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="no_evo">
                  <IonLabel>No evo</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>
          </div>

          <div className="filters-actions">
            <IonButton
              fill="outline"
              className="pagination-btn"
              onClick={() => {
                setFilterTypes([]);
                setFilterGeneration("all");
                setFilterTypeMode("all");
                setFilterEvo("all");
              }}
            >
              Reset filters
            </IonButton>
          </div>
        </div>

        {filterDataLoading && (needsTypes || needsSpecies) && (
          <div className="filters-loading">
            Loading filter data… ({nameMatches.length} Pokémon)
          </div>
        )}

        <div className="pokemon-grid">
          {paginatedPokemons.map((poke) => {
            const id = getIdFromUrl(poke.url);
            const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
            const types = typesByName[poke.name] ?? [];
            const primaryType = types[0];
            const tintColor = primaryType ? (POKEMON_TYPE_COLORS[primaryType] ?? undefined) : undefined;
            return (
              <Card
                key={poke.name}
                name={poke.name}
                image={imageUrl}
                types={types}
                tintColor={tintColor}
                onClick={() => history.push(`/pokemon/${poke.name}`)}
              />
            );
          })}
        </div>

        <div className="pagination-controls">
          <IonButton
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ⏮
          </IonButton>
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
          <IonButton
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            ⏭
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
