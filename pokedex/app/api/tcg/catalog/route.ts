import {getLocalUser} from "@/app/local-user";
import {tcgSets,cardsFor,setMap,updatedAt} from "@/lib/tcg-catalog";
import {pokemonIds} from "@/lib/pokemon";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 if(!await getLocalUser())return Response.json({error:"Logg inn for å se kortene."},{status:401});
 const query=new URL(request.url).searchParams;const id=query.get("pokemonId");const setId=query.get("setId");
 if((id&&!pokemonIds.has(Number(id)))||(setId&&!setMap.has(setId))||(id&&setId))return Response.json({error:"Ukjent Pokémon eller sett."},{status:400});
 return Response.json({sets:tcgSets,cards:cardsFor(id?Number(id):undefined,setId||undefined),updatedAt},{headers:{"Cache-Control":"private, max-age=300"}});
}
