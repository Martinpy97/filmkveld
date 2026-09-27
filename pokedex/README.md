# Min Pokédex — Docker

Lokal Pokédex med 1 025 Pokémon i nasjonal rekkefølge, Har/Mangler/Ønsker meg, engelske samlekort og mastersett. Trykk på en Pokémon for å se kortene, eller velg **Mastersett** for å samle et helt sett. Avkryssingene deles mellom kortvisningene og lagres automatisk.

## Start på egen PC

1. Installer og start [Docker Desktop](https://www.docker.com/products/docker-desktop/). Linux kan bruke Docker Engine med Compose.
2. Last ned [denne grenen som ZIP](https://github.com/Martinpy97/filmkveld/archive/refs/heads/codex/pokedex-docker.zip), pakk ut og åpne **pokedex**-mappen.
3. Mac: åpne **start.command**. Windows: åpne **start.bat**. Linux: kjør `sh start.sh`.
4. Åpne **http://localhost:8784**. Første start bygger appen og krever internett. Vent til startfilen sier at appen er klar.

Alternativt, fra en terminal inne i `pokedex`:

```sh
docker compose up -d --build --wait
```

Hvis Mac ikke lar deg åpne startfilen direkte, kjør `sh start.command` i Terminal fra mappen. Du trenger ikke Node.js, npm, ChatGPT eller en API-nøkkel på PC-en. Docker håndterer byggingen.

## Lagring og oppdateringer

Installasjonen har **én felles lokal samling** i SQLite på Docker-volumet **pokedex-data**. Ingen konto velges fra nettleseren. Volumnavnet er fast, så en ny programmappe på samme maskin og i samme Docker-miljø bruker samme samling. Filmkveld har eget volum og påvirkes ikke.

Docker-utgaven starter med tom samling. Avkryssinger fra den publiserte ChatGPT-siden overføres ikke automatisk og synkroniseres ikke med Docker.

Oppdater slik:

1. Ta gjerne sikkerhetskopi først, se nedenfor.
2. Last ned den oppdaterte `codex/pokedex-docker`-grenen, pakk ut og åpne den nye `pokedex`-mappen.
3. Åpne startfilen igjen, eller kjør `docker compose up -d --build --wait`.
4. Åpne samme adresse. Kontroller at samlingen er med.

Behold `name: pokedex` og volumnavnet `pokedex-data`. **Ikke bruk `docker compose down -v`, slett volumet eller nullstill Docker** dersom samlingen skal beholdes. En ny PC eller et annet Docker-miljø trenger overføring fra sikkerhetskopi; en ny mappe alene er ikke en sikkerhetskopi av samlingen.

Stopp appen uten å slette data: `docker compose stop`. Start igjen: `docker compose start`.

## Sikkerhetskopi

Kjør fra `pokedex`-mappen. Stopp sikrer at SQLite skriver ferdig før kopieringen:

```sh
docker compose stop
docker compose cp pokedex:/data/pokedex.sqlite ./pokedex-backup.sqlite
docker compose start
```

Gi sikkerhetskopien et datert navn og oppbevar den utenfor programmappe/Docker. Den inneholder samlingen din og skal ikke lastes opp til GitHub. Ved gjenoppretting: stopp appen, ta kopi av nåværende data først, erstatt databasen i volumet med sikkerhetskopien og behold skriveadgang for UID 1000. Ikke kopier tilbake mens appen kjører.

## NAS eller andre enheter i hjemmenettverket

PC-oppsettet er tilgjengelig bare på egen maskin. For NAS kopierer du `compose.nas.yaml` til `compose.yaml` i `pokedex`-mappen og bytter eksempel-IP **192.168.1.50** til NAS-ens IP på begge linjene. Kjør deretter samme startkommando på NAS-en. Åpne `http://DIN-NAS-IP:8784`.

Innstillingene ligger direkte i Compose. Ingen `.env`-fil kreves. Alle som får tilgang til denne adressen bruker samme samling. Oppsettet er for eget hjemmenettverk og har ingen innlogging. En internettpublisering må få egen tilgangskontroll først.

## Katalog og bilder

Katalogkopi 27.09.2026: 201 engelske, fysiske sett, 21 290 kort og 34 042 registrerte kortvarianter fra [TCGdex](https://tcgdex.net). Ingen automatisk katalogoppdatering, priser eller bakgrunnsjobber. Standardvarianter og alle registrerte varianter er separate valg for hvert mastersett. Variantlisten kan være ufullstendig; bildet viser ikke alltid den valgte folien. Pocket og jumbo er utelatt.

Alle 1 025 Pokémon-bildene ligger i mappen. Kortbilder og settlogoer hentes fra TCGdex og krever internett; 1 621 kort mangler bilde i kilden og får tydelig reservevisning. Avkryssing, søk og lagring bruker den lokale katalogen. Se [bilder og rettighetshavere](ARTWORK-NOTICES.md).

## Utvikling og kontroll

Node 24, React/Vite og Nodes SQLite. Dockerfile bygger klient/server i et separat byggesteg, og sluttcontaineren kjører uten root med read-only rotfilsystem. Bare `/data` er skrivbart. API validerer kort-ID, variant, metode, body og tillatt HTTP-origin. Sites-ID-er, nøkler og personlige samlinger er ikke inkludert.

```sh
npm ci
npm run check
npm run build
npm test
npm start
```

Lokal utvikling bruker `data-local/pokedex.sqlite`. Testene bruker en egen midlertidig database. [Testbevis](VERIFICATION.json) skiller lokale tester, containerkontroller og gjenhenting fra GitHub. Egen PC, Windows og faktisk NAS-installasjon må ikke forveksles med de dokumenterte testene.

Tekniske referanser: [Docker-volumers levetid](https://docs.docker.com/engine/storage/volumes/), [Node SQLite](https://nodejs.org/api/sqlite.html).
