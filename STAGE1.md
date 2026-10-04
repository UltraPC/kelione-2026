# 1 etapas: kelionių atskyrimas

Įgyvendinta:
- Tiesioginis vienodas v6 įkėlimas pirmą ir vėlesnius kartus; atsisakyta HTML transformavimo service worker viduje.
- Kelionių pasirinkimas, `?trip=europe-2026` ir `?trip=alanya-2026`.
- 9 Europos dienos / 65 sustojimai išsaugoti, visi adresai, aprašymai ir navigacijos URL patikrinti su ankstesniu Git variantu.
- Pastovūs sustojimų ID ir atskiras progresas; vienkartinis seno progreso kopijavimas, nešalinant originalo.
- Atsarginės kopijos eksportas. Importas ir redagavimas numatyti kitame etape.
- Preliminarus Alanijos planas: 10:30–19:00, Syedra/Sapadere ir atskira Dim diena. Tikslūs privažiavimo taškai, kainos, darbo laikas ir orai dar nepatvirtinti.
- 18 unikalių nuotraukų atskiruose failuose. Nuotraukos ir žemėlapis nėra garantuojami be interneto.
- Offline talpykloje programos kodas ir abiejų kelionių tekstiniai planai; worker atnaujinimas laukia uždarant senus langus.

Patikra:
- Node sintaksė: app-v6.js, trip-bootstrap.js, sw.js.
- `JSDOM_PATH=/path/to/jsdom node scripts/test-stage1.cjs`: migracija, originalo kopija, pakartotinis atidarymas, dienų perrikiavimas, atskiros kelionės, paspaudimo išsaugojimas, 65 navigacijos URL.
- Palyginimas su Git originalu: visų 65 pavadinimų, laikų, aprašymų, adresų ir nuorodų lygybė.
- Tikros naršyklės ir Android vizualinė/offline patikra neatlikta: Chromium atsisiuntimas šiame vykdymo aplinkoje nepavyko. DOM testai nepakeičia šios patikros.

Kitas etapas:
1. Tikra telefono naršyklės patikra, įskaitant seno service worker atnaujinimą.
2. Keliauti / Planuoti rodiniai, norimų vietų sąrašas, pridėjimas ir praleidimas.
3. Struktūrinis vietų/lankymų modelis vietoj šio pereinamojo etapo HTML dienų šablonų.
4. Likusios dienos skaičiavimas, importas/atkūrimas, konkrečios kelionės offline būsenos patvirtinimas.

Nesujungti su main prieš naršyklės patikrą. Pirminį turinį galima atkurti iš ankstesnio Git commit; localStorage originalas išlaikytas.
