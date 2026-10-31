# Retro Ski & Après — Alto Adige

Radar in continuo aggiornamento per feste retro, vintage ski e après-ski in Alto Adige nella stagione 2026/27.

## Contenuti

- 6 eventi con data, luogo e fonte ufficiale
- radar social generato dinamicamente dagli eventi correnti
- filtri per atmosfera: retro, après-ski e dress code
- interfaccia in italiano, tedesco e inglese, con rilevamento della lingua del browser e scelta manuale persistente
- icona dedicata e manifest per il salvataggio sulla schermata Home di iPhone e Android
- design responsive e accessibile

## Avvio locale

```bash
python3 -m http.server 8000 --directory dist
```

Poi apri `http://localhost:8000`.

## Sito pubblicato

La versione pubblica è disponibile su [GitHub Pages](https://dizzle0987.github.io/alto-adige-retro-ski-events/).

Il sito è buildless. Il branch `gh-pages` contiene il contenuto pubblicabile di `dist/`.

## Aggiornamenti automatici

Un workflow GitHub Actions controlla le fonti ufficiali ogni lunedì, mercoledì e giovedì alle 08:00 (Europe/Rome). Quando trova cambiamenti verificabili, aggiorna l'agenda, pubblica `main` e rigenera il branch `gh-pages`. Le fonti non raggiungibili vengono conservate senza sovrascrivere dati già verificati.

Oltre alle pagine dei singoli eventi, il radar controlla un registro di portali turistici, comprensori e Skihütten in `data/discovery-sources.json`. Tra le fonti ci sono Winklparade/myTix, Skiworld Ahrntal/Speikboden, Ganischger Alm, Obereggen, Kronplatz e Club Moritzino. Il portale ufficiale Alto Adige viene scandito su più pagine: un nuovo evento entra automaticamente nell'agenda solo quando titolo, data, luogo e pagina ufficiale sono tutti disponibili. Il rapporto completo resta in `data/event-candidates.json`.

### Radar Instagram opzionale

Il workflow è predisposto per leggere gli ultimi post pubblici delle fonti social tramite l'actor ufficiale `apify/instagram-scraper`. Per abilitarlo, crea un account Apify e salva il token nel repository GitHub come secret Actions chiamato `APIFY_TOKEN`. Senza il secret, il controllo dei siti continua normalmente e la parte Instagram viene saltata in modo sicuro.

## Verifica dati

Ultimo controllo delle fonti: 30 ottobre 2026. Date e programmi possono cambiare: consultare sempre i link ufficiali prima di partire.
