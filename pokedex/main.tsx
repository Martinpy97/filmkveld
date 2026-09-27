import { createRoot } from "react-dom/client";
import Pokedex from "./app/pokedex";
import TcgBrowser from "./app/tcg-browser";
import { pokemon } from "./lib/pokemon";
import "./app/globals.css";

const path=decodeURIComponent(location.pathname).replace(/\/$/,"")||"/";
const species=path.match(/^\/pokemon\/(\d+)$/);
const set=path.match(/^\/mastersett\/([\w.-]+)$/);
const p=species?pokemon.find(p=>String(p.id)===species[1]):undefined;
const screen=path==="/"?<Pokedex/>:path==="/mastersett"?<TcgBrowser/>:p?<TcgBrowser pokemon={p}/>:set?<TcgBrowser setId={set[1]}/>:<main className="page"><h1>Fant ikke siden</h1><a href="/">Til Pokédexen</a></main>;
createRoot(document.getElementById("root")!).render(screen);
