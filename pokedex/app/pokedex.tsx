"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Search, ShieldCheck, Check, Star, X, ChevronLeft, ChevronRight, LoaderCircle, Layers } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { pokemon, pokemonIds, typeNames, generations, matchesPokemon, emptyCollection, type Collection, type Pokemon } from "@/lib/pokemon";

type View = "all" | "owned" | "missing" | "wanted";
const views: {id:View;name:string}[]=[{id:"all",name:"Alle"},{id:"owned",name:"Har"},{id:"missing",name:"Mangler"},{id:"wanted",name:"Ønsker meg"}];
const PAGE_SIZE=48;
type ModelContext = {registerTool(tool:{name:string;title:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown},options:{signal:AbortSignal}):void|Promise<void>};

function PokemonCard({p,owned,wanted,disabled,onChange}:{p:Pokemon;owned:boolean;wanted:boolean;disabled:boolean;onChange:(id:number,field:"owned"|"wanted",value:boolean)=>void}){
  const [imageFailed,setImageFailed]=useState(false);
  return <article className={`pokemon-card${owned?" owned":""}`} data-pokemon-id={p.id}>
    <a className="art-panel" data-type={p.types[0]} href={`/pokemon/${p.id}`} aria-label={`Se kort for ${p.name}`}><span className="dex-number">#{String(p.id).padStart(4,"0")}</span>{owned&&<span className="owned-marker" aria-label="I samlingen"><Check/></span>}
      {imageFailed?<span className="art-missing">Bildet er utilgjengelig</span>:<img src={p.image} alt={p.name} width={384} height={384} loading={p.id<=12?"eager":"lazy"} decoding="async" onError={()=>setImageFailed(true)}/>}
    </a>
    <div className="card-body"><h2><a href={`/pokemon/${p.id}`}>{p.name}</a></h2><div className="types">{p.types.map(t=><span className="type-pill" data-type={t} key={t}>{typeNames[t]}</span>)}</div>
      <div className="card-actions"><label className="own-label" htmlFor={`own-${p.id}`}><Checkbox id={`own-${p.id}`} className="own-checkbox" aria-label={`Har ${p.name}`} checked={owned} disabled={disabled} onCheckedChange={value=>onChange(p.id,"owned",value===true)}/>{owned?"Har denne":"Har"}</label>
        <button className="wish-button" aria-label={`${wanted?"Fjern":"Legg til"} ${p.name} ${wanted?"fra":"i"} ønskelisten`} title={owned?"Allerede i samlingen":wanted?"Fjern fra ønskelisten":"Ønsker meg"} aria-pressed={wanted} disabled={disabled||owned} onClick={()=>onChange(p.id,"wanted",!wanted)}><Star fill={wanted?"currentColor":"none"}/></button></div>
    </div>
  </article>;
}

export default function Pokedex(){
  const [collection,setCollection]=useState<Collection>(emptyCollection);
  const collectionRef=useRef(collection);
  const [ready,setReady]=useState(false);
  const readyRef=useRef(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const savingRef=useRef(false);
  const [error,setError]=useState("");
  const [needsLogin,setNeedsLogin]=useState(false);
  const [query,setQuery]=useState("");
  const [view,setView]=useState<View>("all");
  const [generation,setGeneration]=useState("all");
  const [type,setType]=useState("all");
  const [page,setPage]=useState(1);
  const resultHeading=useRef<HTMLDivElement>(null);

  const load=useCallback(async(signal?:AbortSignal)=>{
    if(savingRef.current)return;
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/collection",{cache:"no-store",signal});
      const data=await response.json() as Collection & {error?:string};
      if(!response.ok){setNeedsLogin(response.status===401);throw new Error(data.error||"Kunne ikke hente samlingen.");}
      collectionRef.current=data;setCollection(data);readyRef.current=true;setReady(true);setNeedsLogin(false);
    }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"Kunne ikke hente samlingen. Prøv igjen.");}
    finally{if(!signal?.aborted)setLoading(false);}
  },[]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);

  const save=useCallback(async(id:number,field:"owned"|"wanted",value:boolean)=>{
    if(!readyRef.current)throw new Error("Vent til samlingen er hentet.");
    if(savingRef.current)throw new Error("En endring lagres allerede. Prøv igjen.");
    savingRef.current=true;setSaving(true);setError("");
    try{
      const response=await fetch("/api/collection",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({pokemonId:id,field,value})});
      const data=await response.json() as Collection & {error?:string};
      if(!response.ok){if(response.status===401)setNeedsLogin(true);throw new Error(data.error||"Endringen ble ikke lagret.");}
      collectionRef.current=data;
      flushSync(()=>setCollection(data));
      return {pokemonId:id,owned:!!data.owned[id],wanted:!!data.wanted[id]};
    }catch(e){const message=e instanceof Error?e.message:"Endringen ble ikke lagret. Prøv igjen.";setError(message);throw new Error(message);}
    finally{savingRef.current=false;setSaving(false);}
  },[]);
  const change=(id:number,field:"owned"|"wanted",value:boolean)=>{void save(id,field,value).catch(()=>{});};

  useEffect(()=>{
    const context=(document as Document&{modelContext?:ModelContext}).modelContext;
    if(!context)return;
    const lifecycle=new AbortController();
    const register=(tool:Parameters<ModelContext["registerTool"]>[0])=>{try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(e=>console.warn("Pokédex tool unavailable",e));}catch(e){console.warn("Pokédex tool unavailable",e);}};
    register({name:"list_pokemon",title:"Finn Pokémon i samlingen",description:"List National Pokédex species in numeric order with saved owned/wanted status. Supports name/number search and pagination; does not change data.",inputSchema:{type:"object",properties:{query:{type:"string"},status:{enum:["all","owned","missing","wanted"]},offset:{type:"integer",minimum:0},limit:{type:"integer",minimum:1,maximum:100}},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){
      if(!readyRef.current)throw new Error("Samlingen er ikke hentet ennå.");
      if(!input||typeof input!=="object")throw new Error("Ugyldige filtre.");
      const a=input as Record<string,unknown>;const q=a.query??"";const status=a.status??"all";const offset=a.offset??0;const limit=a.limit??48;
      if(typeof q!=="string"||!["all","owned","missing","wanted"].includes(String(status))||!Number.isInteger(offset)||Number(offset)<0||!Number.isInteger(limit)||Number(limit)<1||Number(limit)>100)throw new Error("Ugyldige filtre.");
      const c=collectionRef.current;const result=pokemon.filter(p=>matchesPokemon(p,q)&&(status==="all"||(status==="owned"&&!!c.owned[p.id])||(status==="missing"&&!c.owned[p.id])||(status==="wanted"&&!!c.wanted[p.id])));
      return {total:result.length,ownedTotal:Object.keys(c.owned).length,wantedTotal:Object.keys(c.wanted).length,pokemon:result.slice(Number(offset),Number(offset)+Number(limit)).map(p=>({id:p.id,name:p.name,generation:p.generation,types:p.types,owned:!!c.owned[p.id],wanted:!!c.wanted[p.id]}))};
    }});
    register({name:"set_pokemon_status",title:"Oppdater Pokémon-status",description:"Save owned or wanted status for one National Pokédex species. Marking owned removes it from the wish list; owned species cannot be wished for. Updates the visible collection.",inputSchema:{type:"object",properties:{pokemonId:{type:"integer",minimum:1,maximum:pokemon.length},field:{enum:["owned","wanted"]},value:{type:"boolean"}},required:["pokemonId","field","value"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input){
      if(!input||typeof input!=="object")throw new Error("Ugyldig status.");
      const a=input as Record<string,unknown>;
      if(typeof a.pokemonId!=="number"||!pokemonIds.has(a.pokemonId)||(a.field!=="owned"&&a.field!=="wanted")||typeof a.value!=="boolean")throw new Error("Ukjent Pokémon eller ugyldig status.");
      return save(a.pokemonId,a.field,a.value);
    }});
    return()=>lifecycle.abort();
  },[save]);

  const ownedCount=Object.keys(collection.owned).length;
  const wantedCount=Object.keys(collection.wanted).length;
  const counts={all:pokemon.length,owned:ownedCount,missing:pokemon.length-ownedCount,wanted:wantedCount};
  const filtered=useMemo(()=>pokemon.filter(p=>matchesPokemon(p,query)&&(generation==="all"||p.generation===Number(generation))&&(type==="all"||p.types.includes(type))&&(view==="all"||(view==="owned"&&!!collection.owned[p.id])||(view==="missing"&&!collection.owned[p.id])||(view==="wanted"&&!!collection.wanted[p.id]))),[query,generation,type,view,collection]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage=Math.min(page,pageCount);
  const visible=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  const setFilter=(setter:(value:string)=>void,value:string)=>{setter(value);setPage(1);};
  const reset=()=>{setQuery("");setGeneration("all");setType("all");setView("all");setPage(1);};
  const movePage=(next:number)=>{setPage(next);resultHeading.current?.scrollIntoView({behavior:"instant",block:"start"});resultHeading.current?.focus({preventScroll:true});};
  const filteredStatusReady=view==="all"||ready;

  return <main className="dex-shell"><a className="skip-link" href="#pokemon-results">Hopp til Pokémon</a>
    <header className="topbar"><div className="brand"><img src="/favicon.svg" alt=""/>POKÉDEX</div><nav className="main-nav" aria-label="Hovedmeny"><a aria-current="page" href="/">Pokédex</a><a href="/mastersett"><Layers size={17}/>Mastersett</a></nav></header>
    <section className="intro"><div><div className="eyebrow">Nasjonal Pokédex</div><h1>Min Pokédex</h1><p>Kryss av dem du har. Trykk på en Pokémon for å se kortene.</p></div><div className="collection-summary"><div className="summary-label"><span>Samlingen din</span><strong>{ready?ownedCount:"—"} <small>/ {pokemon.length.toLocaleString("nb-NO")}</small></strong></div><Progress className="summary-progress" value={ready?ownedCount/pokemon.length*100:0} aria-label={`${ownedCount} av ${pokemon.length} Pokémon i samlingen`}/></div></section>
    <Tabs value={view} onValueChange={v=>setFilter(value=>setView(value as View),v)}>
      <TabsList className="view-tabs" aria-label="Vis Pokémon">{views.map(v=><TabsTrigger key={v.id} className="view-tab" value={v.id}>{v.name}<span className="tab-count">{v.id==="all"||ready?counts[v.id].toLocaleString("nb-NO"):"—"}</span></TabsTrigger>)}</TabsList>
      <div className="toolbar"><div className="searchbox"><Search/><input type="search" value={query} onChange={e=>setFilter(setQuery,e.target.value)} placeholder="Navn eller Pokédex-nummer" aria-label="Søk i Pokédex"/>{query&&<button aria-label="Tøm søk" onClick={()=>setFilter(setQuery,"")}><X size={18}/></button>}</div>
        <Select value={generation} onValueChange={v=>setFilter(setGeneration,v)}><SelectTrigger className="filter-select" aria-label="Generasjon"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Alle generasjoner</SelectItem>{generations.map((g,i)=><SelectItem key={g} value={String(i+1)}>Gen. {i+1} · {g}</SelectItem>)}</SelectContent></Select>
        <Select value={type} onValueChange={v=>setFilter(setType,v)}><SelectTrigger className="filter-select" aria-label="Pokémon-type"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Alle typer</SelectItem>{Object.entries(typeNames).sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=><SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>
      </div>
      {error&&<div className="notice" role="alert"><span>{error} Tidligere lagrede valg beholdes.</span>{<button onClick={()=>void load()}>Prøv igjen</button>}</div>}
      <div className="results-bar" id="pokemon-results" tabIndex={-1} ref={resultHeading}><span aria-live="polite">{filteredStatusReady?`${filtered.length.toLocaleString("nb-NO")} Pokémon · Nasjonal rekkefølge`:"Henter samlingen …"}</span><span className="save-state" role="status">{saving?<><LoaderCircle className="animate-spin"/>Lagrer …</>:loading?"Henter samlingen …":error?"Lagring må kontrolleres":<><Check/>Endringer lagres automatisk</>}</span></div>
      <TabsContent value={view}>
        {filteredStatusReady&&visible.length>0?<section className="dex-grid" aria-label="Pokémon">{visible.map(p=><PokemonCard key={p.id} p={p} owned={!!collection.owned[p.id]} wanted={!!collection.wanted[p.id]} disabled={!ready||saving||loading||needsLogin} onChange={change}/>)}</section>:<Empty className="empty-panel"><EmptyHeader><EmptyTitle>{!filteredStatusReady?"Samlingen er ikke klar":view==="wanted"&&!query&&generation==="all"&&type==="all"?"Hvem står på ønskelisten?":view==="owned"&&!query&&generation==="all"&&type==="all"?"Her begynner samlingen din":"Ingen Pokémon matcher"}</EmptyTitle><EmptyDescription>{!filteredStatusReady?"Prøv å hente samlingen igjen.":view==="wanted"?"Bruk stjernen på en Pokémon du ønsker deg.":view==="owned"?"Kryss av «Har» på dem du har i samlingen.":"Prøv et annet navn, nummer eller filter."}</EmptyDescription></EmptyHeader>{filteredStatusReady&&<button className="reset-filter" onClick={reset}>Vis alle Pokémon</button>}</Empty>}
        {filteredStatusReady&&filtered.length>PAGE_SIZE&&<Pagination className="pager" aria-label="Pokédex-sider"><PaginationContent><PaginationItem><button onClick={()=>movePage(currentPage-1)} disabled={currentPage===1}><ChevronLeft size={17}/>Forrige</button></PaginationItem></PaginationContent><p>Side {currentPage} av {pageCount}</p><PaginationContent><PaginationItem><button onClick={()=>movePage(currentPage+1)} disabled={currentPage===pageCount}>Neste<ChevronRight size={17}/></button></PaginationItem></PaginationContent></Pagination>}
      </TabsContent>
    </Tabs>
    <footer className="footer"><span>{pokemon.length.toLocaleString("nb-NO")} arter · Én art per nasjonalt nummer<br/>Alternative former og shiny-varianter vises ikke som egne arter.</span><span>Data og bilder via <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">PokéAPI</a>.<br/>Uoffisiell samlingsoversikt. Pokémon tilhører sine rettighetshavere.</span></footer>
  </main>;
}
