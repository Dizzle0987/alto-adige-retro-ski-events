# Retro Ski & Après — Alto Adige

Radar in continuo aggiornamento per feste retro, vintage ski e après-ski in Alto Adige. La stagione segue la data locale di Roma: da maggio viene mostrata la prossima stagione invernale, fino ad aprile quella in corso.

Il periodo invernale di riferimento, ottobre–aprile, è mostrato con gli anni in cima alla pagina. È solo un'indicazione: la raccolta e la pubblicazione degli eventi pertinenti funzionano tutto l'anno, senza escludere altri mesi.

Le schede distinguono «Oggi» da «In corso»: basta un orario di inizio confermato, confrontato con l'ora di Roma. Se la fine è nota viene rispettata, anche dopo mezzanotte. Senza fine indicata, gli eventi con inizio dalle 18:00 restano in evidenza fino alle 06:00 successive all’ultima giornata; quelli diurni fino a mezzanotte. Sono limiti interni di visualizzazione, mai pubblicati come orari reali. Senza un inizio confermato resta «Oggi». La pagina aggiorna lo stato ogni minuto, senza chiamate esterne.

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

Il registro comprende anche Gassl (Olang), K1 (Reischach), Hexenkessel (Klausberg), Luislkeller (Wolkenstein), Buss’l (Kurzras) e LOOX (Obereggen). I profili Instagram collegati dai siti ufficiali di Gassl, K1, Hexenkessel e Luislkeller sono inclusi nel radar opzionale. Per Platzl/Tipi si controlla il canale attuale del comprensorio di Obereggen: i riferimenti storici al Tipi non attestano un programma attuale.

Oltre ai metadati strutturati, `scripts/website-events.mjs` legge annunci testuali K1, schede calendario Moritzino e l'annuncio Winklparade/myTix. Gli anni devono essere espliciti nella data o nella stagione indicata dalla fonte: non si riciclano date di edizioni precedenti. Il fallback generico legge singoli `<article>` con titolo evento, data completa e sede configurata; date multiple o ambigue restano da verificare. Non è un lettore universale: flyer, iframe, programmi settimanali senza date e altri layout richiedono ulteriori adattatori. Il rapporto distingue `readable-events` da `no-readable-events`, conserva il numero di annunci HTML/strutturati e i casi da verificare.

Per le fonti con `importArchive: true` vengono importati anche eventi verificati negli ultimi 12 mesi. Restano in «Eventi passati / Vergangene Events», con anno originale e link alla singola fonte. Il calendario Moritzino viene filtrato per non attribuire alla sede in Alta Badia gli eventi esterni. L'annuncio comunale di Valle Aurina copre Krampus e afterparty Hexenkessel; l'orario della sfilata non viene usato come orario dell'afterparty.

I titoli in italiano, tedesco e inglese vengono recuperati dai collegamenti alle versioni linguistiche delle pagine ufficiali, quando disponibili.

### Flyer, PDF e feed incorporati — nessuna API OCR a pagamento

Il workflow installa Tesseract (`deu+ita+eng`) e Poppler sui runner standard gratuiti del repository pubblico. Non vengono installati programmi sul computer dell'utente. Il test `MEDIA_TOOLS_REQUIRED=1` verifica davvero l'estrazione di un PDF e l'OCR di un flyer sintetico; localmente questo test viene saltato se non richiesto.

`scripts/media-events.mjs` controlla soltanto fonti abilitate: massimo 3 documenti per fonte e 12 nuovi download per esecuzione, 5 MB per file, 3 pagine PDF. Prima si estrae il testo PDF, poi eventualmente si usa OCR. Cache settimanale per URL e impronta SHA-256 dei contenuti per evitare OCR duplicati; massimo 120 voci. File temporanei eliminati dopo la lettura; nel repository rimangono testo limitato, riferimenti e motivi di verifica, non le immagini originali. Processi limitati a 20 secondi ciascuno e, sui runner Linux, 1 GB di memoria e 20 secondi CPU. L'intero job scade dopo 10 minuti.

I documenti OCR/PDF generano normalmente casi da verificare in `data/event-candidates.json` → `sources[].needsReview`. Possono entrare automaticamente solo se il testo della pagina ufficiale ripete indipendentemente lo stesso titolo, la sede e la stessa data completa non ambigua; la sede deve comparire anche nel documento. L'anno non viene inferito dal nome del file, dal copyright o dalla data di download. Calendari e ricorrenze ICS restano in verifica e non vengono espansi. Gli iframe sono seguiti solo se l'URL esatto è configurato in `calendarFrames` e il dominio è esplicitamente approvato; YouTube, mappe, login e tracker vengono ignorati. Nessun calendario iframe verificato è attualmente configurato.

Il feed HTML di Hexenkessel viene letto con la sua data di pubblicazione originale: i post del 2024 non diventano eventi della stagione attuale. In mancanza di prova dell'autore restano in verifica. Per K1 si legge il feed pubblico Curator usato dal sito: solo autore, URL profilo e ID proprietario coerenti con l'account ufficiale possono passare ai normali controlli social su titolo, data e sede. Gli altri utenti, commenti, repost e video non vengono raccolti come fonti. Eventuali immagini del feed vengono considerate solo per post dell'autore approvato, nel percorso del feed ufficiale e sul CDN approvato; restano da verificare.

I domini media sono in lista chiusa: HTTPS senza credenziali, niente IP letterali o indirizzi DNS privati e ogni redirect viene ricontrollato. Il registro ora comprende anche La Stua, Santner's, Giggeralm, Corones Hütte, Max Alm, Sunnolm, Pulverfass e Vallis. Per Bärenhöhle si intende esclusivamente Reinswald, non Solda: la sede è registrata ma il profilo segnalato dalla directory resta `reference-needs-verification`, senza pubblicazioni automatiche. Facebook è registrato come collegamento ufficiale dove verificato; non è attivato uno scraper Facebook. Nessun account Instagram viene inventato per i locali senza profilo verificato.

Per controllare tutto questo senza usare Apify, il workflow manuale offre `instagram_mode: web`; `SKIP_APIFY=1` disattiva esplicitamente il token anche se presente nei secrets. I controlli programmati restano lunedì, mercoledì e giovedì alle 08:00 e mantengono il guardrail dei crediti gratuiti per l'eventuale scansione Apify.

Dopo il push automatico a `gh-pages`, il workflow richiede esplicitamente la ricostruzione GitHub Pages: i soli push fatti con `GITHUB_TOKEN` non devono essere considerati prova dell'avvenuta pubblicazione del sito.

### Radar Instagram opzionale

Il workflow legge fino a 6 post per profilo pubblicati negli ultimi 90 giorni tramite l'actor ufficiale `apify/instagram-scraper`: la data di pubblicazione non è la data dell’evento. Per Ganischgeralm viene usato il profilo dedicato `ganischgeralm_voliera`, indicato dall’utente e verificato pubblicamente, non il vecchio `ganischger.obereggen` né il canale generico del resort. Facebook è registrato come riferimento, non incluso in questo Actor. Per abilitarlo, salva il token nel repository GitHub come secret Actions chiamato `APIFY_TOKEN` (è accettato anche `APIFY`). Senza il secret, il controllo dei siti continua normalmente e la parte Instagram viene saltata in modo sicuro.

Prima di ogni nuova scansione il radar legge piano e consumo mensile tramite l’API Apify. Avvia lo scraper solo con piano Free a costo base zero e credito verificabile: massimo 4 USD di consumo mensile totale dell’account, una riserva di almeno 0,50 USD sul credito incluso e massimo 0,30 USD per esecuzione. Piano a pagamento, saldo sconosciuto o credito insufficiente fermano soltanto Instagram; i siti continuano. Nessun upgrade o acquisto viene eseguito.

### Eventi provenienti da Instagram

- Si accettano soltanto autori esattamente presenti nella lista ufficiale. L’URL del profilo richiesto non sostituisce mai l’identità dell’autore. Se è configurato un `ownerId`, deve corrispondere anche quello. I post di terzi vengono scartati; collaborazioni e ricondivisioni vengono trattenute per verifica.
- La data è obbligatoria. Il parser riconosce date numeriche, ISO, mesi italiani/tedeschi/inglesi, intervalli, numeri decorativi e riferimenti relativi alla pubblicazione nel fuso di Roma. Date impossibili, formati ambigui, anni incerti, più date distinte o incoerenze con il giorno della settimana richiedono verifica.
- L’orario è facoltativo. Un annuncio successivo può aggiungerlo alla stessa scheda; date o orari in conflitto non sovrascrivono i dati pubblicati. Le ore dopo mezzanotte sono indicate come giorno successivo. Programmi indoor/outdoor distinti non vengono appiattiti in un singolo orario.
- La pubblicazione automatica è abilitata per i locali con sede verificata nel registro (attualmente Gassl, K1, Hexenkessel e Luislkeller). La sede deve essere corroborata dal luogo del post o dal testo. I profili turistici regionali, senza sede evento verificata, producono soltanto segnalazioni.
- Gli eventi social entrano nell’agenda se attuali/futuri e pertinenti, in qualsiasi mese dell’anno, come gli altri eventi rilevati. Stesso titolo/data in locali diversi non significa stesso evento. Gli annunci dello stesso evento sono uniti e conservano la provenienza (autore, ID restituito, testo, data di pubblicazione e link).
- Il testo dei flyer e Facebook non vengono ancora letti. Le vecchie segnalazioni prive di prova dell’autore restano da verificare.

Per verificare senza avviare un Actor, il workflow manuale offre `instagram_mode: replay`: rilegge il dataset dell’ultima esecuzione Instagram già conclusa. Se il dataset non è disponibile, termina senza avviare una scansione alternativa. I test locali non richiedono token né connessioni: `node --test scripts/*.test.mjs`. Per aggiornare soltanto i siti senza scansioni Apify: `APIFY_TOKEN='' node scripts/discover-events.mjs`.

## Verifica dati

La data dell'ultimo controllo è in `dist/events.json` e nel rapporto `data/event-candidates.json`. Date e programmi possono cambiare: consultare sempre i link ufficiali prima di partire.
