import catalog from "../data/tcg.json";
import type {TcgCard,TcgSet} from "./tcg-types";
export const tcgCards=catalog.cards as TcgCard[];
export const tcgSets=(catalog.sets as TcgSet[]).sort((a,b)=>(b.releaseDate||"").localeCompare(a.releaseDate||"")||b.id.localeCompare(a.id));
export const cardMap=new Map(tcgCards.map(c=>[c.id,c]));
export const setMap=new Map(tcgSets.map(s=>[s.id,s]));
export const updatedAt=catalog.updatedAt;
const numeric=new Intl.Collator("en",{numeric:true,sensitivity:"base"});
export function cardsFor(pokemonId?:number,setId?:string){
 return tcgCards.filter(c=>setId?c.setId===setId:pokemonId?c.dexIds.includes(pokemonId):false).sort((a,b)=>setId?numeric.compare(a.number,b.number):((setMap.get(b.setId)?.releaseDate||"").localeCompare(setMap.get(a.setId)?.releaseDate||"")||numeric.compare(a.number,b.number)));
}
