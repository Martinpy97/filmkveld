import { getLocalUser } from "@/app/local-user";
import { readCollection, saveStatus } from "@/lib/collection";
import { pokemonIds } from "@/lib/pokemon";
export const dynamic = "force-dynamic";
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){
  const user=await getLocalUser();
  if(!user)return reply({error:"Logg inn for å hente samlingen din."},401);
  try{return reply(await readCollection(user.userId));}
  catch(error){console.error("Read Pokemon collection failed",error);return reply({error:"Kunne ikke hente samlingen. Prøv igjen."},503);}
}
export async function PUT(request:Request){
  const user=await getLocalUser();
  if(!user)return reply({error:"Logg inn for å lagre samlingen din."},401);
  const origin=request.headers.get("origin");
  if((origin&&origin!==new URL(request.url).origin)||request.headers.get("sec-fetch-site")==="cross-site")return reply({error:"Ugyldig forespørsel."},403);
  if(!request.headers.get("content-type")?.includes("application/json"))return reply({error:"Ugyldig format."},415);
  if(Number(request.headers.get("content-length"))>4096)return reply({error:"Forespørselen er for stor."},413);
  let body:unknown;
  try{const raw=await request.text();if(raw.length>4096)return reply({error:"Forespørselen er for stor."},413);body=JSON.parse(raw);}catch{return reply({error:"Ugyldig format."},400);}
  if(!body||typeof body!=="object"||!("pokemonId" in body)||!("field" in body)||!("value" in body)||typeof body.pokemonId!=="number"||!pokemonIds.has(body.pokemonId)||(body.field!=="owned"&&body.field!=="wanted")||typeof body.value!=="boolean")return reply({error:"Ukjent Pokémon eller ugyldig status."},400);
  try{return reply(await saveStatus(user.userId,body.pokemonId,body.field,body.value));}
  catch(error){console.error("Save Pokemon status failed",error);return reply({error:"Endringen ble ikke lagret. Prøv igjen."},503);}
}
