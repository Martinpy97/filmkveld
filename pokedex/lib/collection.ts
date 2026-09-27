import { database } from "./database";
import type { Collection } from "./pokemon";


export async function readCollection(userId: string): Promise<Collection> {
  const { results } = await database().prepare("SELECT pokemon_id, owned_at, wanted_at FROM pokemon_collection WHERE user_id = ?").bind(userId).all<{pokemon_id:number;owned_at:string|null;wanted_at:string|null}>();
  return {
    owned: Object.fromEntries(results.filter(r=>r.owned_at).map(r=>[r.pokemon_id,r.owned_at!])),
    wanted: Object.fromEntries(results.filter(r=>r.wanted_at).map(r=>[r.pokemon_id,r.wanted_at!])),
  };
}
export async function saveStatus(userId: string, id: number, field: "owned"|"wanted", value: boolean) {
  const db=database();
  if (field === "owned") {
    if(value) await db.prepare("INSERT INTO pokemon_collection (user_id, pokemon_id, owned_at, wanted_at) VALUES (?, ?, ?, NULL) ON CONFLICT(user_id, pokemon_id) DO UPDATE SET owned_at = COALESCE(pokemon_collection.owned_at, excluded.owned_at), wanted_at = NULL").bind(userId,id,new Date().toISOString()).run();
    else await db.prepare("UPDATE pokemon_collection SET owned_at = NULL WHERE user_id = ? AND pokemon_id = ?").bind(userId,id).run();
  } else {
    if(value) await db.prepare("INSERT INTO pokemon_collection (user_id, pokemon_id, owned_at, wanted_at) VALUES (?, ?, NULL, ?) ON CONFLICT(user_id, pokemon_id) DO UPDATE SET wanted_at = COALESCE(pokemon_collection.wanted_at, excluded.wanted_at) WHERE pokemon_collection.owned_at IS NULL").bind(userId,id,new Date().toISOString()).run();
    else await db.prepare("UPDATE pokemon_collection SET wanted_at = NULL WHERE user_id = ? AND pokemon_id = ?").bind(userId,id).run();
  }
  return readCollection(userId);
}
