# Retro Ski & Après — Alto Adige

Radar in continuo aggiornamento per feste retro, vintage ski e après-ski in Alto Adige nella stagione 2026/27.

## Contenuti

- 6 eventi con data, luogo e fonte ufficiale
- radar social generato dinamicamente dagli eventi correnti
- filtri per atmosfera: retro, après-ski e dress code
- interfaccia in italiano, tedesco e inglese, con rilevamento della lingua del browser e scelta manuale persistente
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

Un workflow GitHub Actions controlla ogni lunedì mattina le fonti ufficiali configurate. Quando trova cambiamenti verificabili, aggiorna l'agenda, pubblica `main` e rigenera il branch `gh-pages`. Le fonti non raggiungibili vengono conservate senza sovrascrivere dati già verificati.

## Verifica dati

Ultimo controllo delle fonti: 30 ottobre 2026. Date e programmi possono cambiare: consultare sempre i link ufficiali prima di partire.
