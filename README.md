# Retro Ski & Après — Alto Adige

Piccola agenda statica di feste retro, vintage ski e après-ski in Alto Adige per la stagione 2026/27.

## Contenuti

- 6 eventi con data, luogo e fonte ufficiale
- link ai canali social pubblici verificati
- filtri per atmosfera: retro, après-ski e dress code
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

Un'automazione Codex controlla ogni lunedì mattina le fonti ufficiali e i canali social pubblici. Quando trova cambiamenti verificabili, aggiorna l'agenda, esegue i controlli, pubblica `main` e rigenera il branch `gh-pages`.

## Verifica dati

Ultimo controllo delle fonti: 30 ottobre 2026. Date e programmi possono cambiare: consultare sempre i link ufficiali prima di partire.
