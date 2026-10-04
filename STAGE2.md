# 2 etapas – keliauti ir planuoti

## Įgyvendinta
- „Keliauti / Planuoti“ rodiniai ir pasirinktos dienos įsiminimas.
- Norimų aplankyti vietų sąrašas, asmeninių vietų pridėjimas ir redagavimas.
- Vieta gali būti išsaugota be koordinačių; įtraukiant į dieną privalomos galiojančios koordinatės ir lankymo trukmė.
- Įterpimas po pasirinktos stotelės, perrikiavimas aukštyn / žemyn, grąžinimas į norimų vietų sąrašą redagavimo formoje.
- Atskiri kiekvienos kelionės asmeniniai duomenys ir stabilūs custom UUID.
- Praleidimas / grąžinimas į planą; praleistos vietos nelaikomos aplankytomis ir nesiūlomos kaip kita vieta.
- Dienos pabaigos navigacijos nuoroda išlieka ta pati po perrikiavimo.
- Po plano pakeitimo ankstesni laikai ir kilometrai nevaizduojami kaip perskaičiuoti; rodomas įspėjimas.
- Nepavykus išsaugoti progreso, atkuriama ankstesnė būsena. Sugadinto asmeninio plano negalima tyliai perrašyti.
- Saugi vartotojo tekstų išvestis per textContent.
- Perėjimo iš v5 offline kopijos aptikimas; mygtukas įjungia naują worker ir išvengia v5/v6 scenarijų veikimo kartu.

## Patikra
- `scripts/test-stage1.cjs`: 65 senų nuorodų invariantiškumas, migracija, kopija, ID, kelionių atskyrimas.
- `scripts/test-stage2.cjs`: rodiniai, dienos filtras, praleidimas, norimos vietos, koordinatės, įterpimas, perrikiavimas, reload, saugus tekstas, nepavykusio įrašymo atkūrimas, sugadintų duomenų išsaugojimas.
- `scripts/test-browser.cjs`: tikras Chromium, 390 × 844 mobilus langas, vietos pridėjimas, žymėjimai, perrikiavimas, dienos pasirinkimas, offline perkrovimas ir norimos vietos pridėjimas, kelionių atskyrimas. Horizontalaus persipildymo ir JavaScript klaidų nėra. Ekrano vaizdas peržiūrėtas.
- `scripts/test-upgrade.cjs`: v5 talpyklos perėjimo simuliacija, vartotojo inicijuojamas worker atnaujinimas, 65 vienetiniai mygtukai ir 2 perkeltos aplankytos vietos. Pradinės v5 aplinkos paruošime išjungtos pasirenkamos CDN užklausos ir automatinė navigate komanda aktyvavimo metu; originali fetch/HTML transformavimo logika palikta.

Vykdymas (priklausomybes įdiegti atskirame testų kataloge):
```
JSDOM_PATH=/absolute/path/to/jsdom node scripts/test-stage1.cjs
JSDOM_PATH=/absolute/path/to/jsdom node scripts/test-stage2.cjs
PLAYWRIGHT_PATH=/absolute/path/to/playwright CHROMIUM_PATH=/absolute/path/to/chromium node scripts/test-browser.cjs
PLAYWRIGHT_PATH=/absolute/path/to/playwright CHROMIUM_PATH=/absolute/path/to/chromium node scripts/test-upgrade.cjs
```
Naršyklės testai patys sukuria laikiną vietinį HTTP serverį po /kelione-2026/ keliu.

## Ribos ir kitas etapas
- Tai mobilios naršyklės emuliacija, ne fizinio Android ir Google Maps programėlės bandymas.
- Gyvos išorinių žemėlapių, koordinačių paieškos ir navigacijos paslaugos nepatvirtintos šiais testais.
- Automatinis grįžimo laiko perskaičiavimas, importas/atkūrimas ir struktūrinis visų senų vietų duomenų modelis dar neįgyvendinti.
- Pakeitus dieną originalūs laikai paliekami orientacijai, tačiau aiškiai pažymėta, kad jie neperskaičiuoti.
- Alanijos kainų, darbo laiko, orų ir parkavimo vietų patvirtinimas lieka atskira turinio užduotis.
- Pakeitimai skirti PR peržiūrai, viešas main nepakeistas.
