# Kelionės programos auditas ir 4 etapas

Data: 2026-10-04. Apimtis: paskelbta stage3 versija, laiko skaičiavimas, mobilioji sąsaja, progreso ir kopijų saugojimas, atnaujinimas bei veikimas be interneto. Vertinti šaltinio failai ir automatizuoti Chromium/JSDOM scenarijai; fizinis vartotojo telefonas nepasiekiamas.

## Nustatyta ir pataisyta

| Problema | Svarba | Pataisa |
|---|---|---|
| Kortelių laikai likdavo originalūs, nors grįžimo suvestinė keisdavosi | Aukšta | Kortelės naudoja to paties skaičiavimo rezultato atvykimus. Nežinomi laikai nerodomi kaip tikslūs. Dienos pabaiga sutampa su suvestine. Originalus tekstas išsaugotas išskleidžiamoje skiltyje. |
| Žemėlapio vairavimo laikai iš naujo išvedami iš HTML teksto | Aukšta | Pašalintas dubliuotas teksto analizatorius. Laikui naudojama pagrindinė dienos suvestinė; kilometrai lieka atskiras orientacinis rodiklis. |
| Offline parengtis deklaruojama vien sulaukus aktyvaus worker | Aukšta | Worker patikrina visų CORE failų buvimą savo podėlyje ir atsako per MessageChannel. Neatsakius rodoma, kad parengties patvirtinti nepavyko. |
| Automatinis slinkimas paslėpdavo suvestinę | Vidutinė | Atsisakyta pradinio automatinio slinkimo. Kitos vietos pavadinimas, navigacija ir grįžimas pateikiami viršuje. |
| Eksportas, importas ir išplėstiniai laikai užimdavo pagrindinį ekraną | Vidutinė | Perkelta į „Nustatymai ir kopijos“. |
| Aplankymo žyma neatskirta nuo realaus išvykimo | Vidutinė | „Išvykstu iš čia“ nustato dabartinį kelionės laiko juostos laiką, buvimo trukmę 0 ir likusią seką. Nežymi vietos aplankyta. |
| Rodinio perjungimas klaidingai panaikindavo tęsimo atskaitą | Vidutinė | Atskaita keičiama tik pasikeitus dienai; tikrinamas realus sekos ir progreso pasikeitimas. |
| Atsitiktinis žymėjimas neturėjo greito atšaukimo | Vidutinė | 10 sekundžių matomas vieno paskutinio sėkmingo progreso pakeitimo atšaukimas. Grąžinamas ir žemėlapio rodinys. |
| Trūko vietos duomenų patikimumo žymėjimo | Vidutinė | Lankymo skiltis: parkingas, ėjimo trukmė, lankymo trukmė, kaina, darbo laikas, Google įvertinimas ir patikros data. Nežinomi laukai aiškiai pažymėti. |
| Laukiantis atnaujinimas nebuvo aiškiai siūlomas | Vidutinė | Matomas „Įjungti naują versiją“, aktyvinimas tik paspaudus, po jo perkraunamas puslapis. Atidaryta redagavimo forma saugoma nuo automatinio perkrovimo. |

## Vietos informacijos duomenų modelis

Neprivalomas patikimų repo duomenų laukas `stops[].practical`: `parking`, `walkMinutes`, `price`, `hours`, `rating`, `reviewCount`, `checkedAt`, `source`. Nuorodoms leidžiama HTTPS, tekstai rodomi per textContent. Dabartinių vietų kainos, darbo laikas, parkingai ir reitingai šiuo auditu nebuvo patvirtinti; į skiltis neįrašyti išgalvoti dydžiai. Google Maps nuoroda leidžia atidaryti to objekto paiešką. Tai ne automatinis reitingų gavimas ir ne parkavimo taško patvirtinimas.

## Patikros ir rezultatai

- stage1 DOM: senų duomenų migracija, 65 originalios navigacijos nuorodos, kelionių atskyrimas.
- stage2 DOM: asmeninės vietos, perrikiavimas, būsenos, rašymo klaidos ir neįskaitomų duomenų išsaugojimas.
- stage3 core: atsarga, vėlavimas, nežinomos trukmės, importo validacija, atkūrimo žurnalas ir atšaukimas.
- stage3 Chromium: laiko keitimas, eksportas ir importas be interneto, peržiūra prieš rašymą, importo atšaukimas.
- bendras Chromium: vietų pridėjimas, perrikiavimas, progresas, dienos ir kelionės pakeitimas, offline.
- stage4 Chromium 390×844: neslenkamas pradinis ekranas, kita vieta, progreso atšaukimas, 13:00 Turkijos laiku išvykus iš Syedra gaunama 14:15 Sapadere atvykimo prognozė pagal esamą 75 min. įvertį; „Aplankyta“ nepakeičiama; režimo perjungimas išlaiko atskaitą; pakeitus išvykimą į 11:30 kortelėse 12:20 ir grįžimas 19:00; praleidus vietą nežinoma atkarpa nerodoma kaip žinoma; podėlio patikra, perkrovimas be interneto, atskiri dienų laikai, naujo worker pasiūlymas ir aktyvinimas neprarandant pasirinktos dienos.
- v5 → stage4: ankstesnės versijos migracijos simuliacija; originalus progresas išsaugomas. Testo izoliavimo išimtys aprašytos STAGE2.md.
- Mobilioji ekrano kopija vizualiai peržiūrėta; horizontalaus persislinkimo nėra.

## Likę apribojimai ir rekomendacijos

1. Maršrutų ir gyvo eismo API šiame etape nepridėta. Planiniai laikai nėra atvykimo garantija.
2. „Išvykstu iš čia“ / tęsimo atskaita galioja šiam puslapio atidarymui. Perkrovus rodomas dienos planas. Per vidurnaktį tęsiamos kelionės lieka atskiras ateities darbas.
3. Duomenys laikomi konkrečioje naršyklėje. Nėra sinchronizavimo tarp įrenginių; prieš valant duomenis būtinas eksportas. Redaguoti rekomenduojama viename skirtuke.
4. Offline parengtis apima programos failus ir abu kelionių JSON, bet ne žemėlapių plyteles, visas nuotraukas ar išorinę navigaciją. Patikra nėra pažadas, kad naršyklė vėliau neišvalys podėlio.
5. Fizinis Android ir jo PWA diegimas netestuotas. Seno stage3 cache naudotojui pereinant į stage4 gali reikėti uždaryti visus svetainės skirtukus ir PWA bei atidaryti iš naujo.
6. Kitas naudingas etapas: patikrinti konkrečių Alanijos vietų parkingus, kainas bei darbo laiką ir įrašyti šaltinius / datas. Tik po to svarstyti automatinę mokamą maršrutų paslaugą.
