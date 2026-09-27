# Filmkveld i Portainer – steg for steg

**Image 1.2.1, port 8783.** Innstillingene står direkte i Compose under `environment:` og `ports:`. Ingen `.env`-fil eller separate Portainer-variabler trengs.

 Denne oppskriften er for en Synology med Docker/Container Manager og Portainer som allerede virker. PC-en og NAS-en må være på samme hjemmenettverk. Velg NAS-ens vanlige Docker-miljø i Portainer; oppskriften gjelder Docker Standalone.

**Har du allerede Filmkveld?** Gå rett til [Oppdater en eksisterende installasjon](#oppdater-en-eksisterende-installasjon). Du skal bruke den eksisterende stacken og beholde filmsamlingen.

## 1. Finn NAS-adressen og riktig image

Noter NAS-ens lokale IP-adresse. Eksempel: `192.168.1.50`. Hvis du åpner DSM på `https://192.168.1.50:5001`, er IP-adressen `192.168.1.50`. Bruk NAS-ens egen lokale IP, ikke PC-ens IP, en QuickConnect-adresse eller adressen til en ekstern Portainer-server.

Velg fil ut fra NAS-ens prosessor:

| Prosessor | Fil du skal laste ned |
|---|---|
| Intel eller AMD, 64-bit | [filmkveld-1.2.1-linux-amd64.tar.gz](https://github.com/Martinpy97/filmkveld/releases/download/v1.2.1/filmkveld-1.2.1-linux-amd64.tar.gz) |
| ARM, 64-bit | [filmkveld-1.2.1-linux-arm64.tar.gz](https://github.com/Martinpy97/filmkveld/releases/download/v1.2.1/filmkveld-1.2.1-linux-arm64.tar.gz) |

`amd64` er riktig også for Intel. Er du usikker, finn prosessoren i spesifikasjonene for den nøyaktige Synology-modellen før du velger. Eldre 32-bit ARM støttes ikke. En NAS uten Docker-støtte kan ikke bruke denne pakken.

Last ned **én** av filene til PC-en din. Ikke pakk den ut. De automatiske «Source code»-filene på GitHub er ikke Docker-images. [Alle nedlastinger finnes her](https://github.com/Martinpy97/filmkveld/releases/tag/v1.2.1).

## 2. Importer imaget

1. Logg inn i Portainer.
2. Velg miljøet som kjører Docker på NAS-en.
3. Åpne **Images → Import → Select file**.
4. Velg `.tar.gz`-filen du nettopp lastet ned.
5. Hvis du skal angi image-navn, bruk **Advanced mode** og skriv nøyaktig `filmkveld:1.2.1`, uten registry foran.
6. Trykk **Upload** og vent til importen er ferdig.

**Sjekk før du går videre:** Under **Images** skal du se `filmkveld:1.2.1`. Hvis den mangler, er importen ikke ferdig eller du har valgt et annet Docker-miljø. [Portainers importveiledning](https://docs.portainer.io/user/docker/images/import).

## 3. Opprett stacken

En stack er det lagrede oppsettet som starter Filmkveld.

1. Åpne **Stacks → Add stack** i det samme miljøet.
2. Skriv `filmkveld` i **Name**.
3. Velg **Web editor**.
4. Lim inn hele kodeblokken nedenfor. Bruk kopierknappen ved kodeblokken.

```yaml
name: filmkveld
services:
  filmkveld:
    image: filmkveld:1.2.1
    pull_policy: never
    environment:
      # Bytt 192.168.1.50 til din NAS-IP her og under ports.
      FILMKVELD_ALLOWED_ORIGINS: "http://192.168.1.50:8783"
    ports:
      - "192.168.1.50:8783:8787"
    volumes:
      - filmkveld-data:/data
    restart: unless-stopped
    init: true
    read_only: true
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    stop_grace_period: 20s
volumes:
  filmkveld-data:
    name: filmkveld-data
```

## 4. Bytt eksempel-IP-en to steder

Bytt `192.168.1.50` til NAS-ens faktiske IP på disse **to linjene** i Compose-editoren:

```yaml
      FILMKVELD_ALLOWED_ORIGINS: "http://192.168.1.50:8783"
```

```yaml
      - "192.168.1.50:8783:8787"
```

Behold port **8783** begge steder. Siste tall, **8787**, er containerens interne port og skal beholdes.

`FILMKVELD_ALLOWED_ORIGINS` ligger under `environment:` i selve Compose-filen. La Portainers separate **Environment variables** være tom. Du trenger ikke `NAS_IP`, `FILMKVELD_PORT` eller `.env` med dette oppsettet.

## 5. Start Filmkveld

Trykk **Deploy the stack**. La eventuell innstilling for **Re-pull image / Pull latest image** være avslått: imaget er allerede importert lokalt.

Åpne stacken når opprettingen er ferdig. Filmkveld-containeren skal bli **running** og deretter **healthy**. Containerens navn kan ha et nummer etter `filmkveld`.

**Sjekk:** Containeren skal bruke `filmkveld:1.2.1`, og porten skal vise NAS-IP-en din med `8783` på utsiden og `8787` i containeren. «Healthy» betyr at serveren svarer internt; neste steg kontrollerer hele nettsiden.

## 6. Åpne nettsiden

Åpne en ny nettleserfane på PC-en og skriv dette i adressefeltet, med **din** NAS-IP:

```text
http://192.168.1.50:8783
```

Skriv uttrykkelig `http://`. Port 5000/5001 er vanligvis DSM; Filmkveld bruker porten du valgte over. Du skal nå se Filmkveld med filmsamlinger og plakater.

## 7. Kontroller at lagring virker

1. Trykk **Legg til film**.
2. Skriv `Min testfilm`, velg **Andre filmer** og lagre. Bildelenke er valgfri.
3. Åpne **Andre filmer** og kontroller at filmen vises.
4. Last nettsiden på nytt. Filmen skal fortsatt være der.
5. Du kan senere bruke blyanten og **Slett film** for å fjerne testfilmen fra samlingen.

Når dette virker, er både nettsiden og lagringen kontrollert. Hver NAS-installasjon har sin egen samling; alle som åpner samme installasjon deler den. Det endrer ikke filmene i en annen installasjon eller filene på GitHub. Data lagres i volumet **`filmkveld-data`**.

## Oppdater en eksisterende installasjon

Versjon 1.2.0 kunne vise blank side etter **Legg til film** over HTTP, selv med healthy container. Dette er rettet i 1.2.1.

1. Ta vare på eksisterende Compose-tekst, miljøvariabler og en sikkerhetskopi av data. [Backup med Compose](README.md#lagring-og-oppdatering) krever NAS-terminal og Compose-mappen; ikke lim terminalkommandoer inn i stack-editoren.
2. Last ned og importer riktig 1.2.1-image som i steg 1–2.
3. Åpne **Stacks → din eksisterende stack → Editor**.
4. Bruk `image: filmkveld:1.2.1`. For det nye oppsettet: erstatt Filmkvelds `environment:` og `ports:` med linjene i steg 3–4, og sett din NAS-IP begge steder. Porten blir **8783**. Behold hele volumoppsettet.
5. Trykk **Update the stack**. Hvis du får valget **Re-pull image**, la det være avslått.
6. Åpne `http://DIN-NAS-IP:8783`. Kontroller at containeren bruker riktig versjon. Last nettsiden helt på nytt (`Ctrl+Shift+R` på Windows/Linux, `Cmd+Shift+R` på Mac), og prøv **Legg til film**.

**Ikke slett `filmkveld-data`, ikke opprett en ny tom datamappe, og ikke bruk `docker compose down -v`.** Oppdateringen trenger ingen databaseendring. Du trenger ikke importere imaget igjen hvis du allerede har 1.2.1; dette er bare endring av Compose. Hvis Filmkveld ligger sammen med andre tjenester, endrer du bare Filmkvelds innstillinger. Gamle `NAS_IP`-/`FILMKVELD_PORT`-variabler brukes ikke av dette oppsettet. Behold dem hvis andre tjenester trenger dem. [Portainers oppdateringsveiledning](https://docs.portainer.io/user/docker/stacks/edit).

Mangler **Editor** fordi stacken hentes fra Git, må innstillingene endres i den Compose-filen stacken faktisk følger, og deretter hentes inn via stackens Git-oppdatering. Manuell image-import må fortsatt gjøres først.

## Hvis det stopper opp

| Det du ser | Gjør dette |
|---|---|
| `NAS_IP` mangler / «Sett NAS_IP i .env» | Du bruker den eldre Compose-teksten. Bruk kodeblokken i steg 3 og sett NAS-IP direkte de to stedene i steg 4. |
| `image not found`, `pull access denied` eller forsøk på Docker Hub | Kontroller at `filmkveld:1.2.1` er importert i **samme miljø**, at image-linjen er riktig, at `pull_policy: never` er beholdt og at Re-pull er avslått. |
| `exec format error` | Du har trolig valgt feil prosessorutgave. Kontroller NAS-modellen og importer riktig fil. |
| `port is already allocated` / `address already in use` | En annen tjeneste bruker porten. Endre `8783` til for eksempel `8788` både i URL-en under `environment:` og i den midterste delen av portlinjen; behold siste `8787`. Oppdater deretter stacken og åpne `http://DIN-NAS-IP:8788`. |
| `cannot assign requested address` | IP-en først i portlinjen er ikke en adresse på maskinen som kjører Docker. Bruk NAS-ens lokale IP og riktig Portainer-miljø. |
| «Adressen er ikke tillatt» | Åpne nøyaktig IP og port fra Compose-teksten. Start med IP-adressen, ikke `nas.local`, QuickConnect eller et annet domenenavn. |
| Nettleseren får ikke kontakt | Kontroller running/healthy, korrekt `http://IP:PORT`, at PC og NAS er på samme nett og at NAS-brannmuren tillater den valgte TCP-porten fra hjemmenettverket. Ikke slå av hele brannmuren. |
| Blank side etter **Legg til film** | Kontroller at containeren faktisk bruker **1.2.1**, og last nettsiden helt på nytt. |
| Blank side med en gang, selv på 1.2.1 | Noter adressen. Åpne nettleserens utviklerverktøy (F12 på Windows/Linux, Cmd+Option+J i Chrome på Mac), velg **Console**, last siden på nytt og ta vare på den første røde feilmeldingen. |
| Siden virker, men tidligere filmer er borte | Kontroller at containeren fortsatt har det opprinnelige volumet montert på `/data`. Ikke slett gamle volumer for å «rydde opp». |

For serverfeil: åpne **Containers → Filmkveld-containeren → Logs** i Portainer. Ved behov for hjelp, oppgi NAS-modell, image-versjon, adressen du åpner og feilmeldingen. Fjern eventuelle passord/nøkler fra logger før deling.

## Legge Filmkveld sammen med andre tjenester

Du kan bruke en egen `filmkveld`-stack på samme NAS selv om andre apper allerede ligger i Portainer. Det er den enkleste oppskriften over. Hvis du vil ha tjenestene i samme Compose-fil, se [legg sammen med en eksisterende Compose](README.md#legg-sammen-med-en-eksisterende-compose). Ikke erstatt hele oppsettet til de andre appene med Filmkvelds kodeblokk.

## Oppsett som nedlastbar fil

[Last ned Compose for port 8783](https://github.com/Martinpy97/filmkveld/releases/download/v1.2.1/compose-port8783.yaml) eller [hele oppsettspakken med denne guiden](https://github.com/Martinpy97/filmkveld/releases/download/v1.2.1/filmkveld-nas-1.2.1-port8783.zip). De eldre oppsettsfilene i samme release bruker port 8787 og separate variabler; bruk filene merket `port8783`. Docker-imagene er de samme.

## Om denne oppskriften

Filmkveld er en filmoversikt, ikke filmavspilling. Oppsettet er for hjemmenettverket og har ikke innlogging. Det krever ingen registry-konto og ingen bygging på NAS-en.

Kontrollert 27.09.2026 mot Portainers offisielle dokumentasjon. Begge images er importert og testet på Docker Desktop, inkludert nettleser over vanlig HTTP og bevart data. Selve importen på din Synology/Portainer er ikke fjernkontrollert. [Testresultater](VERIFICATION.json).
