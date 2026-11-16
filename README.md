# Topofun

Een interactieve webapp om topografie te leren, van de basisschool tot de middelbare school.
We beginnen met **groep 7 – Nederland**: provincies, provinciehoofdsteden, rivieren en wateren.

## Stand van zaken

- `tools/build-map.js`: zet ruwe kaartdata om naar compacte SVG-paden.
  `node tools/build-map.js <provincies.geojson> <rivieren-osm.json|-> data/kaart-nl.js`
- `data/kaart-nl.js`: gegenereerde kaart met de 12 provincies (PDOK/CBS 2023, vereenvoudigd, ±51 kB).
  Water (zee, IJsselmeer, Waddenzee enz.) zit níet in de provincievlakken en verschijnt dus vanzelf als water.

## Nog te doen

1. **Rivieren ophalen** uit OpenStreetMap (Overpass). Gaf 406/timeouts met een regex-query;
   volgende poging: query met exacte namen (`way["waterway"]["name"="Waal"]` enz.) via
   `overpass.private.coffee`, of een andere bron. Daarna opnieuw `build-map.js` draaien.
2. **Buurlanden** (België, Duitsland) als grijs land onder Nederland tekenen
   (Natural Earth `ne_10m_admin_0_countries`), zodat ze niet blauw (water) lijken.
3. **Topografiedata groep 7**:
   - 12 provincies + hoofdsteden (Groningen, Leeuwarden, Assen, Zwolle, Lelystad, Arnhem, Utrecht,
     Haarlem, Den Haag, Middelburg, 's-Hertogenbosch, Maastricht) en Amsterdam als hoofdstad van Nederland.
   - Rivieren: Rijn, Nederrijn, Lek, Waal, Maas, IJssel, Merwede, Amer, Vecht, Eems, Schelde,
     Nieuwe Waterweg, Noordzeekanaal, Amsterdam-Rijnkanaal.
   - Wateren: Noordzee, Waddenzee, IJsselmeer, Markermeer, Oosterschelde, Westerschelde,
     Haringvliet, Hollandsch Diep, Grevelingenmeer, Veluwemeer, Lauwersmeer, Dollard.
   - Labelposities per provincie handmatig instellen (het zwaartepunt klopt niet altijd, bv. Flevoland).
4. **De app zelf** (gewone HTML/JS, geen build-stap, werkt offline):
   - Verkennen: klik op de kaart en zie de naam.
   - "Waar ligt …?": klik het juiste gebied/stad/water aan.
   - "Wat is dit?": gemarkeerd gebied, meerkeuze.
   - Koppelen: provincie ↔ hoofdstad.
   - Punten, sterren, reeksen, geluidjes/confetti; voortgang bewaren in `localStorage`.
   - Opzet uitbreidbaar per niveau (groep 7 → groep 8 Europa → middelbare school).
5. Testen met headless Chrome-screenshots en daarna eventueel online zetten.

## Bronnen en licenties

- Provinciegrenzen: CBS / PDOK gebiedsindelingen 2023 (CC-BY 4.0).
- Rivieren (gepland): © OpenStreetMap-bijdragers (ODbL).
