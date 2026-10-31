# Retro Ski & Après — Alto Adige

Radar in continuo aggiornamento per feste retro, vintage ski e après-ski in Alto Adige. La stagione segue la data locale di Roma: da maggio viene mostrata la prossima stagione invernale, fino ad aprile quella in corso.

Il periodo invernale di riferimento, ottobre–aprile, è mostrato con gli anni in cima alla pagina. È solo un'indicazione: la raccolta e la pubblicazione degli eventi pertinenti funzionano tutto l'anno, senza escludere altri mesi.

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

Prima di ogni nuova scansione il radar legge piano e consumo mensile tramite l’API Apify. Avvia lo scraper solo con piano Free a costo base zero e credito verificabile: massimo 4 USD di consumo mensile totale dell’account, una riserva di almeno 0,50 USD sul credito incluso e massimo 0,20 USD per esecuzione. Piano a pagamento, saldo sconosciuto o credito insufficiente fermano soltanto Instagram; i siti continuano. Nessun upgrade o acquisto viene eseguito.

### Eventi provenienti da Instagram

- Si accettano soltanto autori esattamente presenti nella lista ufficiale. L’URL del profilo richiesto non sostituisce mai l’identità dell’autore. Se è configurato un `ownerId`, deve corrispondere anche quello. I post di terzi vengono scartati; collaborazioni e ricondivisioni vengono trattenute per verifica.
- La data è obbligatoria. Il parser riconosce date numeriche, ISO, mesi italiani/tedeschi/inglesi, intervalli, numeri decorativi e riferimenti relativi alla pubblicazione nel fuso di Roma. Date impossibili, formati ambigui, anni incerti, più date distinte o incoerenze con il giorno della settimana richiedono verifica.
- L’orario è facoltativo. Un annuncio successivo può aggiungerlo alla stessa scheda; date o orari in conflitto non sovrascrivono i dati pubblicati. Le ore dopo mezzanotte sono indicate come giorno successivo. Programmi indoor/outdoor distinti non vengono appiattiti in un singolo orario.
- La pubblicazione automatica è abilitata per i locali con sede verificata nel registro (attualmente Gassl, K1, Hexenkessel e Luislkeller). La sede deve essere corroborata dal luogo del post o dal testo. I profili turistici regionali, senza sede evento verificata, producono soltanto segnalazioni.
- Gli eventi social entrano nell’agenda solo se attuali/futuri e nella finestra sciistica novembre–aprile, come gli altri eventi rilevati. Stesso titolo/data in locali diversi non significa stesso evento. Gli annunci dello stesso evento sono uniti e conservano la provenienza (autore, ID restituito, testo, data di pubblicazione e link).
- Il testo dei flyer e Facebook non vengono ancora letti. Le vecchie segnalazioni prive di prova dell’autore restano da verificare.

Per verificare senza avviare un Actor, il workflow manuale offre `instagram_mode: replay`: rilegge il dataset dell’ultima esecuzione Instagram già conclusa. Se il dataset non è disponibile, termina senza avviare una scansione alternativa. I test locali non richiedono token né connessioni: `node --test scripts/social-events.test.mjs scripts/social-pipeline.test.mjs`.

## Verifica dati

Ultimo controllo delle fonti: 30 ottobre 2026. Date e programmi possono cambiare: consultare sempre i link ufficiali prima di partire.
