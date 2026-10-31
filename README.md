# Retro Ski & Après — Alto Adige

Radar in continuo aggiornamento per feste retro, vintage ski e après-ski in Alto Adige. La stagione segue la data locale di Roma: da maggio viene mostrata la prossima stagione invernale, fino ad aprile quella in corso.

## Contenuti

- eventi con data, luogo e fonte ufficiale, aggiornati automaticamente
- radar social generato dinamicamente dagli eventi correnti
- filtri per atmosfera: retro, après-ski e dress code
- vista degli eventi in corso e futuri, con riquadro in evidenza per tutti gli appuntamenti in corso
- storico degli ultimi 12 mesi, con filtri per atmosfera e valle e ordinamento dal più recente
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

Gli eventi terminati vengono conservati per 12 mesi e non vengono più aggiornati dalle pagine degli organizzatori, che potrebbero già descrivere l’edizione successiva. Il passaggio tra evento futuro, in corso e passato avviene ogni giorno secondo il calendario di Roma, inclusa l’intera data finale. La pagina aperta ricontrolla la data ogni minuto. Lo storico si popola con gli eventi conservati da questo aggiornamento in poi.

Oltre alle pagine dei singoli eventi, il radar controlla un registro di portali turistici, comprensori e Skihütten in `data/discovery-sources.json`. Tra le fonti ci sono Winklparade/myTix, Skiworld Ahrntal/Speikboden, Ganischger Alm, Obereggen, Kronplatz e Club Moritzino. Il portale ufficiale Alto Adige viene scandito su più pagine: un nuovo evento entra automaticamente nell'agenda solo quando titolo, data, luogo e pagina ufficiale sono tutti disponibili. Il rapporto completo resta in `data/event-candidates.json`.

Il registro comprende anche Gassl (Olang), K1 (Reischach), Hexenkessel (Klausberg), Luislkeller (Wolkenstein), Buss’l (Kurzras) e LOOX (Obereggen). I profili Instagram collegati dai siti ufficiali di Gassl, K1, Hexenkessel e Luislkeller sono inclusi nel radar opzionale. Per Platzl/Tipi si controlla il canale attuale del comprensorio di Obereggen: i riferimenti storici al Tipi non attestano un programma attuale. Le pagine web vengono analizzate per eventi con metadati strutturati; flyer, calendari incorporati e programmi settimanali privi di date precise non vengono trasformati in appuntamenti.

I titoli in italiano, tedesco e inglese vengono recuperati dai collegamenti alle versioni linguistiche delle pagine ufficiali, quando disponibili.

### Radar Instagram opzionale

Il workflow è predisposto per leggere gli ultimi post pubblici delle fonti social tramite l'actor ufficiale `apify/instagram-scraper`. Per abilitarlo, crea un account Apify e salva il token nel repository GitHub come secret Actions chiamato `APIFY_TOKEN` (è accettato anche `APIFY`). Senza il secret, il controllo dei siti continua normalmente e la parte Instagram viene saltata in modo sicuro.

## Verifica dati

Ultimo controllo delle fonti: 30 ottobre 2026. Date e programmi possono cambiare: consultare sempre i link ufficiali prima di partire.
