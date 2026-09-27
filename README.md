# Filmkveld 1.2.1 — ferdig Docker-image for NAS

**Bruker du Portainer? Start her: [stegvis oppsett med kopierbar Compose og feilsøking](PORTAINER.md).**

Imaget heter **`filmkveld:1.2.1`**. Last ned og importer én imagefil; Compose skal ikke bygge noe eller hente Filmkveld fra et registry.

- [Last ned image og oppsett](https://github.com/Martinpy97/filmkveld/releases/tag/v1.2.1)
- [Compose](compose.yaml), [kontrollresultater](VERIFICATION.json)

Dette repositoryet er offentlig. Imagefilene kan lastes ned uten GitHub-innlogging. Repositoryet inneholder Compose og veiledning; ferdige Docker-images ligger under Releases. GitHubs automatiske «Source code»-arkiver inneholder dette oppsettet, ikke Docker-images.

## Oppsett med port 8783

Compose og Portainer-guiden bruker nå direkte innstillinger under `environment:` og port **8783**. Du trenger ingen ekstra Portainer-variabler. Har du allerede `filmkveld:1.2.1`, holder det å oppdatere stackens Compose; behold volumet `filmkveld-data`.

## Rettelse i 1.2.1

Denne utgaven retter en feil der «Legg til film» ga helt blank side ved vanlig HTTP til NAS-en. Containeren kunne samtidig være «healthy»: helsesjekken tester serveren, ikke nettleserens JavaScript. Egne filmer og eksisterende film-ID-er beholdes.

Har du 1.2.0 fra før: ta backup som beskrevet nedenfor, importer riktig 1.2.1-image og endre bare `image:` til `filmkveld:1.2.1` i din eksisterende stack. Behold NAS-IP, port og volumet `filmkveld-data`. Oppdater stacken uten tvungen image-nedlasting, og last nettsiden på nytt. Det er ingen databasemigrering i denne rettelsen.

## 1. Velg riktig image

NAS-en må støtte Docker/Container Manager. Kjør eventuelt `uname -m` i NAS-ens terminal:

| Resultat / CPU | Last ned |
|---|---|
| `x86_64`, Intel eller AMD 64-bit | `filmkveld-1.2.1-linux-amd64.tar.gz` |
| `aarch64`, ARM 64-bit | `filmkveld-1.2.1-linux-arm64.tar.gz` |

Eldre 32-bit ARM-utgaver støttes ikke av disse imagene. Begge arkitekturene bruker samme image-navn, så importer bare den som passer din NAS.

Last også ned [filmkveld-nas-1.2.1-port8783.zip](https://github.com/Martinpy97/filmkveld/releases/download/v1.2.1/filmkveld-nas-1.2.1-port8783.zip) med Compose og veiledning. Bruk filene merket `port8783`; de eldre oppsettsfilene i samme release er bevart som historikk. `SHA256SUMS-port8783.txt` gir kontrollsummer for dette oppsettet og de uendrede imagene.

## 2. Importer i Portainer

1. Velg Docker-miljøet som kjører på NAS-en.
2. Åpne **Images → Import → Select file**, velg riktig `.tar.gz` og trykk **Upload**.
3. Bekreft at image-listen viser **`filmkveld:1.2.1`**. Hvis Portainer ber om en tag, velg **Advanced mode** og skriv dette navnet.

Alternativt, last opp imagefilen til NAS-en med File Station og kjør på NAS-en (eksempel for Intel/AMD):

```sh
sudo docker load --input /volume1/docker/filmkveld/filmkveld-1.2.1-linux-amd64.tar.gz
```

Bruk `docker load`, ikke `docker import`: Docker-arkivet inneholder startkommando, bruker, helsesjekk og andre imageinnstillinger som skal beholdes.

## 3. Start med Compose

Pakk ut oppsettspakken i for eksempel `/volume1/docker/filmkveld`. Sett NAS-ens faktiske IP direkte i `compose.yaml`: bytt `192.168.1.50` både i `FILMKVELD_ALLOWED_ORIGINS` under `environment:` og først på linjen under `ports:`. Standardporten er **8783**, og ingen `.env`-fil trengs.

```yaml
environment:
  FILMKVELD_ALLOWED_ORIGINS: "http://192.168.1.50:8783"
ports:
  - "192.168.1.50:8783:8787"
```

Kjør i mappen med `compose.yaml`:

```sh
sudo docker compose config --quiet
sudo docker compose up -d
sudo docker compose ps
```

Åpne **http://192.168.1.50:8783** fra PC eller mobil på samme nettverk. Bruk din faktiske NAS-IP. Hvis du velger en annen utvendig port, endrer du `8783` både i URL-en under `environment:` og midt i portlinjen; containeren bruker fortsatt siste `8787` internt.

### Start som Portainer-stack

Bruk **Stacks → Add stack → Web editor**. Lim inn `compose.yaml` og bytt eksempel-IP-en på de to linjene. La Portainers separate miljøvariabler være tom; innstillingene står direkte under `environment:` i Compose. Trykk **Deploy the stack**. Velg samme Docker-miljø som imaget ble importert til. Ikke slå på tvungen nedlasting av image.

### Legg sammen med en eksisterende Compose

Flytt `filmkveld:` inn under eksisterende `services:` og `filmkveld-data:` inn under eksisterende `volumes:`. Behold det eksisterende prosjektnavnet; ikke kopier `name: filmkveld` inn i et annet prosjekt. Sett NAS-IP direkte i Filmkvelds `environment:` og `ports:`. Start bare denne tjenesten:

```sh
sudo docker compose up -d --no-deps filmkveld
```

## Lagring og oppdatering

Alle nettlesere deler én filmsamling uten innlogging. Bruk NAS-ens private IP; oppsettet oppretter ingen offentlig tilgang eller portvideresending. Hver installasjon har sin egen samling; installasjoner synkroniseres ikke med hverandre.

Historikk, egne filmer og kø lagres i Docker-volumet **`filmkveld-data`**. Det er ikke en vanlig mappe ved siden av Compose-filen. Data overlever omstart og ny container. **Ikke slett volumet eller bruk `docker compose down -v`.** Stopp en eventuell eldre Filmkveld-container før samme volum brukes av den nye.

Sikkerhetskopi fra denne Compose-mappen:

```sh
sudo docker compose stop filmkveld
sudo docker compose cp filmkveld:/data/filmkveld.sqlite ./filmkveld-backup.sqlite
sudo docker compose start filmkveld
```

Oppdatering: ta backup, importer et nytt image, endre taggen under `image:` og kjør `docker compose up -d filmkveld`. Ikke slett datavolumet. Denne utgaven endrer ikke databasemigreringene fra 1.1.0.

## Hvis noe feiler

- Blank side etter «Legg til film» i 1.2.0: oppdater til 1.2.1 som beskrevet over.
- Blank side allerede ved åpning: åpne `http://DIN-NAS-IP:PORT`, kontroller NAS-IP/port i stacken og se etter feilmeldinger i nettleserens konsoll (F12 → Console). «Healthy» alene bekrefter ikke at nettleseren har lastet siden.
- `image ... not found`: importer riktig image i samme Docker-miljø først; navnet må være `filmkveld:1.2.1`.
- `exec format error`: imagearkitekturen passer ikke NAS-en.
- `cannot assign requested address`: IP-en i portlinjen må faktisk tilhøre NAS-en.
- «Adressen er ikke tillatt»: åpne nøyaktig adressen som står i Compose. Et annet vertsnavn må legges eksplisitt til i `FILMKVELD_ALLOWED_ORIGINS`, for eksempel `http://192.168.1.50:8783,http://nas.local:8783`. Behold listen over tillatte adresser; ikke bruk jokertegn.
- Se **Containers → Filmkveld → Logs** i Portainer, eller `sudo docker compose logs --tail=60 filmkveld`.

HTTPS via reverse proxy er ikke del av standardoppsettet. Serveren støtter eksplisitte HTTPS-origins; proxyen må bevare Host og ha egen tilgangskontroll dersom den brukes utenfor hjemmenettverket. Forwarded-headere gir ikke automatisk nye tillatte adresser.

## Kontroller og kilder

Se `VERIFICATION.json` for faktisk imagebygg, eksport/import, arkitektur, HTTP-kontroller og databevaring. Test på Docker Desktop er ikke en installasjon på en Synology eller bevis på en bestemt DSM-/Portainer-versjon. Filmkveld inneholder filmoversikt og bilder, ikke filmavspilling. Bilder beholder sine opprinnelige rettigheter og får ingen ny eller åpen lisens gjennom denne distribusjonen. Filmvise kilder står i `ASSET-SOURCES.json`; programavhengighetenes lisensnotiser står i `THIRD-PARTY-NOTICES.txt`.

- [Portainer: Import an image](https://docs.portainer.io/user/docker/images/import)
- [Docker: image load](https://docs.docker.com/reference/cli/docker/image/load/)
- [Portainer: Add a stack](https://docs.portainer.io/user/docker/stacks/add)


## Ikoner som PNG

Begge ikonene er 512 × 512 piksler med gjennomsiktig bakgrunn, eksportert fra ikonene som allerede brukes på Filmkveld-siden.

| Ikon | Last ned PNG |
|---|---|
| Grønn filmklapper ved Filmkveld-navnet | [filmkveld-icon.png](https://raw.githubusercontent.com/Martinpy97/filmkveld/codex/public-release/assets/filmkveld-icon.png) |
| Grønn hake fra nettleserfanen | [filmkveld-favicon.png](https://raw.githubusercontent.com/Martinpy97/filmkveld/codex/public-release/assets/filmkveld-favicon.png) |

![Filmkveld-ikon](assets/filmkveld-icon.png)

Filmklapperen bruker Lucide-ikonet fra appen; lisensnotiser finnes i [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
