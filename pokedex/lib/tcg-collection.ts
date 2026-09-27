import {cardMap,setMap} from "./tcg-catalog";
import {database} from "./database";
import {cardKey,type TcgCollection} from "./tcg-types";
const db=database;
export async function readTcg(userId:string):Promise<TcgCollection>{
 const [cards,sets]=await db().batch<Record<string,unknown>>([
  db().prepare("SELECT card_id, variant_id, owned_at FROM tcg_owned WHERE user_id = ?").bind(userId),
  db().prepare("SELECT set_id, scope FROM tcg_mastersets WHERE user_id = ?").bind(userId),
 ]);
 const result:TcgCollection={progress:{},owned:Object.fromEntries(cards.results.map(r=>[cardKey(String(r.card_id),String(r.variant_id)),String(r.owned_at)])),sets:Object.fromEntries(sets.results.map(r=>[String(r.set_id),r.scope==="all"?"all":"standard"]))};
 for(const [id,scope] of Object.entries(result.sets))result.progress[id]={owned:0,total:scope==="all"?(setMap.get(id)?.variantCount||0):(setMap.get(id)?.standardCount||0)};
 for(const key of Object.keys(result.owned)){
  const split=key.lastIndexOf(":");const card=cardMap.get(key.slice(0,split));const v=card?.variants.find(v=>v.id===key.slice(split+1));
  if(card&&v&&result.progress[card.setId]&&(result.sets[card.setId]==="all"||!v.special))result.progress[card.setId].owned++;
 }
 return result;
}
export async function saveCard(userId:string,cardId:string,variantId:string,value:boolean){
 if(value)await db().prepare("INSERT INTO tcg_owned (user_id, card_id, variant_id, owned_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, card_id, variant_id) DO NOTHING").bind(userId,cardId,variantId,new Date().toISOString()).run();
 else await db().prepare("DELETE FROM tcg_owned WHERE user_id = ? AND card_id = ? AND variant_id = ?").bind(userId,cardId,variantId).run();
 return readTcg(userId);
}
export async function saveSet(userId:string,setId:string,value:boolean,scope:"standard"|"all"){
 if(value)await db().prepare("INSERT INTO tcg_mastersets (user_id, set_id, scope) VALUES (?, ?, ?) ON CONFLICT(user_id, set_id) DO UPDATE SET scope = excluded.scope").bind(userId,setId,scope).run();
 else await db().prepare("DELETE FROM tcg_mastersets WHERE user_id = ? AND set_id = ?").bind(userId,setId).run();
 return readTcg(userId);
}
