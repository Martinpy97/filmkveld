import {getLocalUser} from "@/app/local-user";
import {readTcg,saveCard,saveSet} from "@/lib/tcg-collection";
import {cardMap,setMap} from "@/lib/tcg-catalog";
export const dynamic="force-dynamic";
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){
 const user=await getLocalUser();if(!user)return reply({error:"Logg inn for å hente kortsamlingen."},401);
 try{return reply(await readTcg(user.userId));}catch(e){console.error("TCG read failed",e);return reply({error:"Kunne ikke hente kortsamlingen. Prøv igjen."},503);}
}
export async function PUT(request:Request){
 const user=await getLocalUser();if(!user)return reply({error:"Logg inn for å lagre kortsamlingen."},401);
 const origin=request.headers.get("origin");
 if((origin&&origin!==new URL(request.url).origin)||request.headers.get("sec-fetch-site")==="cross-site")return reply({error:"Ugyldig forespørsel."},403);
 if(!request.headers.get("content-type")?.includes("application/json"))return reply({error:"Ugyldig format."},415);
 if(Number(request.headers.get("content-length"))>4096)return reply({error:"Forespørselen er for stor."},413);
 let b:Record<string,unknown>;
 try{const raw=await request.text();if(raw.length>4096)return reply({error:"Forespørselen er for stor."},413);b=JSON.parse(raw);if(!b||typeof b!=="object"||Array.isArray(b))throw Error();}catch{return reply({error:"Ugyldig format."},400);}
 if(typeof b.id!=="string"||typeof b.value!=="boolean")return reply({error:"Ugyldig kortstatus."},400);
 try{
  if(b.kind==="card"&&Object.keys(b).every(k=>["kind","id","variantId","value"].includes(k))&&typeof b.variantId==="string"&&cardMap.get(b.id)?.variants.some(v=>v.id===b.variantId))return reply(await saveCard(user.userId,b.id,b.variantId,b.value));
  if(b.kind==="set"&&Object.keys(b).every(k=>["kind","id","scope","value"].includes(k))&&setMap.has(b.id)&&(b.scope==="standard"||b.scope==="all"))return reply(await saveSet(user.userId,b.id,b.value,b.scope));
  return reply({error:"Ukjent kort, variant eller sett."},400);
 }catch(e){console.error("TCG save failed",e);return reply({error:"Endringen ble ikke lagret. Prøv igjen."},503);}
}
