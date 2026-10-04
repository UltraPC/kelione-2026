# 3 etapas: laiko suvestinė ir atsarginių kopijų importas

## Elgsena

- JSON schema v2: stabilūs stotelių ID, išvykimas, lankymo trukmės, atkarpos, galutinis tikslas, grįžimo terminas, atsarga ir papildomos pertraukos. Originalūs tekstai ir navigacijos nuorodos išsaugoti.
- Alanijos pirmos dienos bazinis planas: 10:30–18:00, terminas 19:00, 60 min. atsarga. Tai pirminio plano įverčiai, ne patvirtinta gyvo eismo prognozė.
- Grįžimo suvestinė: telpa su atsarga, sumažėjusi atsarga, vėlavimas arba trūkstami duomenys. Atsarga nepridedama prie kelionės trukmės antrą kartą.
- Atkarpos identifikuojamos pagal pradžią, pabaigą ir transporto būdą. Pakeitus seką, pridėjus ar praleidus vietą nežinomos atkarpos nestatomos į nulį. Trukmę galima įrašyti be interneto.
- „Tęsti nuo čia“ leidžia pasirinkti vietą ir dar joje praleidžiamą laiką; naudoja dabartinį kelionės laiko juostos laiką. Ankstesnės ir aplankytos vietos neįtraukiamos. Pakeitus progresą arba seką prašoma pasirinkti pradžią iš naujo. Tai nėra GPS sekimas.
- Dienos galutinis tikslas išlieka paskutinis; jo negalima perkelti arba praleisti. „Aplankyta“ nereiškia, kad iš vietos jau išvykta.
- Importuojamos v1 ir v2 kopijos: formato, ID, koordinačių, laikų, sekos ir laukų patikra. Peržiūroje pasirenkamos keičiamos kelionės. Importas pakeičia pasirinktų kelionių būseną, o ne sujungia sąrašus. Nepalaikomi laukai ignoruojami su pranešimu.
- Prieš rašant išsaugomas atkūrimo žurnalas; klaidos atveju grąžinama ankstesnė būsena, o po nutrūkimo atkūrimas vyksta prieš programos inicializavimą. Paskutinį importą galima atšaukti. Eksportas neįtraukia vidinių atkūrimo žurnalų.
- Service worker stage3 atominiu diegimu talpina naujus modulius ir abiejų kelionių duomenis.

## Patikros

- `scripts/test-stage1.cjs`: senų duomenų migracija ir 65 nepakeistos navigacijos nuorodos.
- `scripts/test-stage2.cjs`: planavimo, progreso ir duomenų išsaugojimo regresija.
- `scripts/test-stage3.cjs`: laiko ribos, atsarga, nežinomos atkarpos, dienos pabaiga, v1 kopijų patikra, izoliuotas importas, kartojimas, atšaukimas, rašymo klaidų grąžinimas ir nutrūkusio importo atkūrimas.
- `scripts/test-browser.cjs`: Chromium 390 px, asmeninės vietos, perrikiavimas, progresas ir veikimas be interneto.
- `scripts/test-stage3-browser.cjs`: reali naršyklė, laikų keitimas, rankiniai atkarpų įverčiai, tęstinumas, v2 eksportas, importo peržiūra be duomenų keitimo, importas ir atšaukimas be interneto.
- `scripts/test-upgrade.cjs`: v5 → stage3 migracijos simuliacija (ankstesnės testo izoliavimo išimtys aprašytos STAGE2.md).

## Ribos

Fizinis Android įrenginys netestuotas. Trukmės, vietų darbo laikai ir Google įvertinimai iš naujo netikrinti; automatinė maršrutų API neintegruota. Žemėlapio sluoksniams bei navigacijai gali reikėti interneto. Tęsiant dieną papildomose pertraukose reikia palikti tik likusį laiką. Dabartinis tęsimo režimas skirtas tai pačiai kalendorinei dienai; kelių dienų tęsimą per vidurnaktį reikia planuoti atskirai. Vienu metu redaguokite viename skirtuke. Pakeitimai ruošiami esamame draft PR, `main` ir vieša svetainė automatiškai nekeičiami.
