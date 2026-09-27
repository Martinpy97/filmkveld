import catalog from "./catalog.json";
export type Pokemon = { id: number; name: string; slug: string; generation: number; types: string[]; image: string };
export const pokemon: Pokemon[] = catalog;
export const pokemonIds = new Set(pokemon.map(p => p.id));
export const generations = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar / Hisui", "Paldea"];
export const typeNames: Record<string,string> = {normal:"Normal",fire:"Fire",water:"Water",electric:"Electric",grass:"Grass",ice:"Ice",fighting:"Fighting",poison:"Poison",ground:"Ground",flying:"Flying",psychic:"Psychic",bug:"Bug",rock:"Rock",ghost:"Ghost",dragon:"Dragon",dark:"Dark",steel:"Steel",fairy:"Fairy"};
export type Collection = { owned: Record<string,string>; wanted: Record<string,string> };
export const emptyCollection: Collection = { owned: {}, wanted: {} };
export function matchesPokemon(p: Pokemon, query: string) {
  const q = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!q) return true;
  if (/^#?\d+$/.test(q)) return p.id === Number(q.replace("#", ""));
  return [p.name, p.slug].some(n => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
}
