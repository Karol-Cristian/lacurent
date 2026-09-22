from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
templates = Jinja2Templates(directory=BASE_DIR / "templates")
router = APIRouter()

ESSAYS = [
    {
        "slug": "lucrarile-sau-inima",
        "title": "Lucrările sau inima",
        "date": "22 septembrie 2026",
        "theme": "Credință",
        "dek": "Poți face lucruri bune, chiar extraordinare, și totuși să păstrezi neatins centrul pe care nu vrei să-l cedezi.",
        "body": [
            "Există un pasaj care mă neliniștește tocmai fiindcă nu vorbește despre oameni care nu au făcut nimic. În Matei 7, oamenii vin cu lucrările lor: au vorbit, au vindecat, au făcut minuni în Numele lui Dumnezeu. Răspunsul nu este că au făcut prea puțin, ci: «nu v-am cunoscut».",
            "Aici apare o diferență pe care mult timp am trecut-o cu vederea. Este posibil să-I dau lui Dumnezeu lucrări fără să-I dau centrul din care le fac. Pot să ajut oameni, să dau bani, să construiesc ceva folositor, să fac bine și chiar să-mi asum sacrificii, dar să rămân în același timp proprietarul ultim al vieții mele.",
            "În acest sens, binele însuși poate deveni o evitare. Pot face lucruri complicate tocmai fiindcă sunt mai simple decât gestul fundamental: să renunț la pretenția de autonomie față de Dumnezeu. Lucrările îmi permit încă să spun «eu am făcut». Predarea inimii pune sub semnul întrebării tocmai acel «eu» care vrea să rămână suveran.",
            "Nu rezultă că faptele bune sunt inutile. Rezultă că ele nu pot înlocui relația. Caritatea nu poate cumpăra ceea ce refuz să ofer: disponibilitatea ca viața mea să nu-mi mai aparțină în sens absolut.",
            "Poate acesta este paradoxul expresiei «cine își va pierde viața o va găsi». Nu este doar renunțare la bunuri sau la confort. Este renunțarea la ideea că eu sunt fundamentul ultim al propriei existențe.",
        ],
        "refs": "Matei 7:21–23 · Matei 16:24–25 · 1 Corinteni 13:3",
    },
    {
        "slug": "fara-verdict",
        "title": "Fără verdict",
        "date": "ianuarie–februarie 2026",
        "theme": "Ontologie",
        "dek": "Suferința nu trebuie transformată într-un verdict asupra valorii unei existențe.",
        "body": [
            "Întrebarea de la care am pornit nu a fost doar de ce există suferința, în forma clasică, ci ce spune suferința despre structura realității. Dacă o tratăm doar ca eroare sau abatere, riscăm să ratăm faptul că orice existență finită este expusă.",
            "Ordinea care mi s-a conturat este: limită, identitate, relație, tensiune, suferință. Limita nu este doar o lipsă. Ea face posibilă identitatea: ceva este el însuși tocmai pentru că nu este totul. Identitatea face posibilă diferența, iar diferența face posibilă relația.",
            "Relația reală produce tensiune pentru că două identități nu pot fi pur și simplu dizolvate una în alta. Durerea apare atunci când limita este atinsă sub presiune, iar autoconservarea este mișcarea prin care identitatea încearcă să rămână ea însăși.",
            "De aici vine ideea titlului «Fără verdict». Suferința poate fi reală și devastatoare fără să fie verdictul ontologic al persoanei. Faptul că o viață este fragilă, nevindecată, puțin vizibilă sau întreruptă devreme nu spune că acea viață a valorat mai puțin.",
        ],
        "refs": "",
    },
    {
        "slug": "relatia-inaintea-individului",
        "title": "Relația înaintea individului",
        "date": "5 februarie 2026",
        "theme": "Relație",
        "dek": "În anumite experiențe, celălalt nu apare ca anexă a sinelui; apare înaintea lui.",
        "body": [
            "Suntem obișnuiți să pornim ontologic de la individ și apoi să explicăm relațiile dintre indivizi. Dar experiența umană nu respectă întotdeauna această ordine.",
            "În relația cu propriul copil devine vizibil ceva greu de redus la interes individual: celălalt poate ajunge înaintea sinelui. Nu doar moral, ca decizie eroică, ci aproape spontan, ca structură a conștiinței.",
            "Asta m-a făcut să iau în serios posibilitatea că relația nu este doar un produs secundar al indivizilor deja constituiți. Poate că identitatea însăși devine inteligibilă numai într-un câmp relațional. În forma ei finită, relația poate avea un caracter suprem în conștiința umană.",
        ],
        "refs": "",
    },
    {
        "slug": "credinta-si-capacitatea-de-a-crede",
        "title": "Credința și capacitatea de a crede",
        "date": "2 februarie 2026",
        "theme": "Mântuire",
        "dek": "Dacă oamenii nu au aceeași capacitate de a crede, mântuirea nu poate fi simplificată la o performanță cognitivă.",
        "body": [
            "Una dintre problemele care mă urmărește este situația celui care nu poate crede. Oamenii nu pornesc cu aceeași structură psihologică, aceeași educație, aceleași răni, același limbaj și aceeași capacitate de a considera plauzibil un enunț religios.",
            "Dacă relația cu Dumnezeu este fundamentală, ea nu poate începe doar în momentul în care omul reușește intelectual să formuleze credința corectă. Altfel, mântuirea ar depinde într-o măsură decisivă de capacități distribuite inegal.",
            "Pentru mine devine esențială distincția dintre incapacitate și refuz. Neputința, neînțelegerea, trauma sau lipsa limbajului religios nu pot fi tratate automat ca refuz conștient al relației.",
            "Asta nu rezolvă mecanic problema mântuirii. Dar schimbă întrebarea: nu «a reușit omul să creadă suficient?», ci «ce fel de relație poate iniția Dumnezeu fără să anuleze libertatea persoanei?»",
        ],
        "refs": "",
    },
    {
        "slug": "iubirea-si-nonviolenta",
        "title": "Iubirea ca refuz al anulării",
        "date": "6 februarie 2026",
        "theme": "Iubire",
        "dek": "Iubirea poate fi descrisă ontologic: păstrează diferența fără s-o rezolve prin forță.",
        "body": [
            "Am ajuns să nu mai pot defini iubirea doar ca sentiment. Sentimentul poate exista sau dispărea, poate fi intens ori slab. Dar există un nivel mai fundamental.",
            "Iubirea este refuzul de a anula celălalt, de a-l forța sau de a rezolva diferența prin violență. Tocmai pentru că există limită și identitate, există posibilitatea reală ca celălalt să rămână altul.",
            "În această cheie, unitatea autentică nu este fuziune. O relație desăvârșită nu cere dispariția diferenței. Din acest motiv, ideea creștină a Treimii devine ontologic interesantă: unitate și diferență fără anularea persoanelor.",
            "Aceeași intuiție schimbă și felul în care privesc creația: o realitate ultimă care iubește nu absoarbe creația în sine și nici nu o constrânge să înceteze a fi alta.",
        ],
        "refs": "",
    },
    {
        "slug": "jertfa-fara-tranzactie",
        "title": "Jertfa fără tranzacție",
        "date": "3 februarie 2026",
        "theme": "Teologie",
        "dek": "Jertfa devine mai inteligibilă ca asumare a limitei și a suferinței decât ca simplă contabilitate a vinei.",
        "body": [
            "Am dificultăți cu explicația jertfei redusă la o tranzacție: cineva trebuie să plătească o datorie, iar mecanismul este închis prin transferul pedepsei.",
            "Mă interesează mai mult o interpretare ontologică și relațională. Dacă existența finită înseamnă limită, vulnerabilitate și posibilitatea suferinței, atunci asumarea deplină a condiției umane capătă o semnificație mai adâncă decât plata unei sume morale.",
            "Crucea poate fi gândită ca intrarea lui Dumnezeu în limita pe care creația o trăiește, fără ca relația să fie abandonată. În această perspectivă, mântuirea nu este rezolvarea violentă a diferenței, ci păstrarea relației până în limita extremă.",
        ],
        "refs": "",
    },
    {
        "slug": "invierea-si-identitatea",
        "title": "Învierea fără ștergerea identității",
        "date": "2 februarie 2026",
        "theme": "Moarte",
        "dek": "Dacă mântuirea salvează persoana, transformarea nu poate însemna înlocuirea ei.",
        "body": [
            "Moartea este limita extremă. Dar dacă răspunsul la moarte ar fi pur și simplu producerea altei ființe, problema persoanei concrete ar rămâne nerezolvată.",
            "De aceea învierea mă interesează ca transformare fără ștergerea identității. Continuitatea trebuie să fie suficient de reală încât cel care trăiește să fie cel care a murit, nu o copie ontologică.",
            "Faptul că narațiunile creștine păstrează rănile în trupul înviat este, în această logică, sugestiv: vindecarea nu are nevoie să falsifice istoria persoanei. Transformarea poate păstra identitatea fără să păstreze distrugerea.",
        ],
        "refs": "",
    },
    {
        "slug": "gaura-in-timp",
        "title": "O gaură în timp",
        "date": "decembrie 2025",
        "theme": "Timp",
        "dek": "Nașterea unui om face timpul familiar să pară, pentru câteva clipe, o explicație insuficientă.",
        "body": [
            "Nașterea copilului meu a produs o senzație greu de exprimat: cum este posibil să apară un om? După foarte puțin timp, noua persoană pare că a fost dintotdeauna acolo.",
            "Etapele — embrion, făt, bebeluș, copil — sunt descrise cronologic fără dificultate. Și totuși experiența persoanei pare să contrazică această simplitate. Când îl privești în ochi, cronologia explică succesiunea, dar nu explică apariția acelui «cineva».",
            "Am numit senzația aceasta o gaură în timp. Nu ca teorie fizică, ci ca experiență: un punct în care timpul măsurat și timpul trăit nu mai par să fie același lucru.",
            "Poate tocmai de aceea apar simultan bucuria și frica. În clipa în care cineva intră în viața ta, mintea proiectează deja despărțirea, maturizarea și moartea. O singură persoană face vizibile deodată începutul și limita.",
        ],
        "refs": "",
    },
    {
        "slug": "actiune-intamplare-martor",
        "title": "Acțiune, întâmplare, martor",
        "date": "11 decembrie 2025",
        "theme": "Voință",
        "dek": "Nu orice lucru care ni se întâmplă este acțiunea noastră; iar dorința de rezultat fără asumare produce confuzie.",
        "body": [
            "Am început să separ «întâmplarea» de «acțiune». Întâmplarea vine din cauze care nu pornesc din voința mea. Acțiunea presupune ca eu să intru real în lanțul cauzal și să-mi asum ceea ce urmează.",
            "O parte din confuzia umană vine din dorința de a obține roadele unei acțiuni fără costul ei. Aruncăm zarul, dar am vrea să avem dreptul doar la rezultatul favorabil.",
            "Problema mea personală este uneori opusă: aleg să rămân martor. Lucrurile trec prin viață fără să le las să fie prelucrate suficient de voință, conștiință și responsabilitate.",
            "A trăi nu înseamnă doar să asist la succesiunea întâmplărilor. Înseamnă să transform o parte dintre ele în acțiuni pentru care pot spune: aici am intrat eu.",
        ],
        "refs": "",
    },
    {
        "slug": "dupa-roade",
        "title": "După roade",
        "date": "28 ianuarie 2025",
        "theme": "Caracter",
        "dek": "Caracterul nu se măsoară într-un moment spectaculos, ci în tiparul pe care îl lasă în jur.",
        "body": [
            "Dacă vreau să înțeleg cine este un om, declarațiile lui sunt insuficiente. Mă interesează ce se întâmplă cu el când apar dificultățile, cum se poartă cu cei vulnerabili și dacă viața privată contrazice persoana publică.",
            "Totuși, nici un episod izolat nu este suficient. Trebuie privită tendința: consecvența în timp, impactul asupra celorlalți, capacitatea de a recunoaște greșeala și posibilitatea schimbării.",
            "De aceea ideea biblică a roadelor mi se pare mai serioasă decât o etichetă. Roada nu este o impresie și nici o propoziție despre sine; este ceea ce produce în mod repetat felul în care trăiești.",
        ],
        "refs": "Matei 7:16–20",
    },
    {
        "slug": "dovada-si-credinta",
        "title": "Ce poate fi demonstrat și ce rămâne credință",
        "date": "martie 2026",
        "theme": "Cunoaștere",
        "dek": "Credința nu devine mai solidă dacă numim «dovadă» ceea ce nu poate suporta criteriile istoriei.",
        "body": [
            "În studiul creștinismului am simțit nevoia unei delimitări stricte: ce poate fi susținut istoric independent și ce aparține mărturiei religioase.",
            "De aceea m-au interesat sursele non-biblice despre Isus, procesul sub Pilat, moartea, mormântul gol și afirmațiile despre înviere. Nu pentru a elimina credința, ci pentru a nu o construi pe o confuzie epistemică.",
            "Aceeași regulă trebuie aplicată textului biblic însuși: manuscrise, variante, datare, autor, tradiție. Posibilitatea unei variații textuale nu trebuie ascunsă pentru a proteja credința.",
            "Pentru mine, o credință stabilă nu trebuie să pretindă că fiecare propoziție teologică este demonstrată istoric. Trebuie să știe exact unde se termină demonstrația și unde începe actul de credință.",
        ],
        "refs": "",
    },
    {
        "slug": "dupa-dezvrajire",
        "title": "După dezvrăjire",
        "date": "3 februarie 2026",
        "theme": "Sens",
        "dek": "Demontarea explicațiilor false nu produce automat o lume în care merită să trăiești.",
        "body": [
            "Mă interesează o lume complet dezvrăjită: una în care religia, idealurile și autoritatea pot fi supuse criticii fără teamă. Dar simpla demontare nu este suficientă.",
            "Poți elimina o explicație falsă și să rămâi fără orientare. Faptul că putem explica psihologic, social sau politic o credință nu răspunde automat întrebării dacă realitatea are sens, dacă libertatea este reală sau dacă sacrificiul are valoare.",
            "De aici vine încercarea mea de a construi o ontologie compatibilă cu fizica și matematica, fără să folosesc Dumnezeu ca piesă de umplutură pentru ceea ce nu înțeleg. Nu vreau o lume re-vrăjită artificial, ci una în care întrebarea despre realitatea ultimă rămâne intelectual legitimă.",
        ],
        "refs": "",
    },
]


SHORT_NOTES = [
    {"theme": "Ontologie", "text": "Limitele sunt identitate. Fără limite nu există identitate."},
    {"theme": "Suferință", "text": "Durerea, efectiv, este atingerea limitelor."},
    {"theme": "Suferință", "text": "Suferința apare exact în acest punct: acolo unde limita este trăită."},
    {"theme": "Conștiință", "text": "Conștiința nu este un mecanism de compensare care aduce experiența la zero."},
    {"theme": "Conștiință", "text": "Experiența lasă întotdeauna un rest. O acumulare. O sumă care nu se reduce la neutralitate."},
    {"theme": "Conștiință", "text": "Dacă conștiința e ceva care costă, care lasă «sumă», atunci Universul însuși nu e un sistem contabil neutru — ci unul cu surplus, cu tensiune, cu istoric."},
    {"theme": "Relație", "text": "Tensiunea este diferență de potențial și între două identități."},
    {"theme": "Existență", "text": "Existența costă."},
    {"theme": "Suferință", "text": "Suferința nu înseamnă neapărat că ceva a mers greșit. Poate însemna că ceva finit a întâlnit propria limită."},
    {"theme": "Identitate", "text": "Autoconservarea este identitatea care refuză să dispară."},
    {"theme": "Identitate", "text": "Dacă nu există limită, nu există nici «eu» și «tu»."},
    {"theme": "Relație", "text": "Dacă diferența dispare, relația dispare odată cu ea."},
    {"theme": "Iubire", "text": "Iubirea nu trebuie să elimine diferența ca să producă unitate."},
    {"theme": "Iubire", "text": "Iubirea poartă costul relației fără să-l anuleze pe celălalt."},
    {"theme": "Iubire", "text": "Poate că iubirea se vede mai clar în lucrurile pe care refuză să le facă."},
    {"theme": "Viață", "text": "Cum este posibil așa ceva? Un om?"},
    {"theme": "Timp", "text": "Normalitate inexplicabilă."},
    {"theme": "Timp", "text": "Înainte de nașterea lui, timpul părea aproape absolut. După aceea, timpul lui s-a amestecat cu al nostru."},
    {"theme": "Timp", "text": "Un copil apare într-o zi și foarte repede ai impresia că a existat dintotdeauna."},
    {"theme": "Cunoaștere", "text": "Dar când murim vom înțelege mai mult?"},
    {"theme": "Cunoaștere", "text": "Când vom ajunge noi oamenii să cunoaștem tot adevărul?"},
    {"theme": "Cunoaștere", "text": "Avem impresia că suntem incredibili, dar de fapt suntem aproape zero barat."},
    {"theme": "Credință", "text": "Un sistem complet de gândire tot nu explică suficient și în continuare ai nevoie de credință."},
    {"theme": "Cunoaștere", "text": "Faptul că o teorie explică foarte mult nu înseamnă că a epuizat realitatea."},
    {"theme": "Cunoaștere", "text": "Poate că adevărul este mai mare decât capacitatea noastră de a-l transforma într-un sistem."},
    {"theme": "Credință", "text": "Credința începe poate exact acolo unde explicația nu mai poate pretinde că este totală."},
    {"theme": "Cunoaștere", "text": "A admite că nu știi nu este același lucru cu a renunța să cauți."},
    {"theme": "Dumnezeu", "text": "Nu vreau ca Dumnezeu să fie explicația lucrurilor pe care încă nu le înțeleg."},
    {"theme": "Dumnezeu", "text": "Dumnezeu nu trebuie introdus ca reparație într-o fizică incompletă."},
    {"theme": "Dumnezeu", "text": "Dacă Dumnezeu există, realitatea nu trebuie falsificată ca să-I facem loc."},
    {"theme": "Credință", "text": "O credință care se teme de adevăr este deja într-o poziție foarte fragilă."},
    {"theme": "Credință", "text": "Dacă o variantă de manuscris există, vreau să știu că există. Credința nu trebuie apărată ascunzând-o."},
    {"theme": "Cunoaștere", "text": "Nu vreau să demonstrez mai mult decât permit dovezile."},
    {"theme": "Sens", "text": "Oamenii se dezvrăjesc ca să nu mai poată fi manipulați, dar după aceea trebuie să afle pentru ce mai trăiesc."},
    {"theme": "Sens", "text": "Demontarea unei minciuni nu produce automat un adevăr în care poți locui."},
    {"theme": "Libertate", "text": "Libertatea fără direcție poate deveni doar absența constrângerii."},
    {"theme": "Sens", "text": "Idealurile pot fi folosite pentru manipulare; asta nu înseamnă că trebuie să trăim fără idealuri."},
    {"theme": "Existență", "text": "Echilibrul poate fi uneori un cuvânt prea comod. Viața nu readuce totul la zero."},
    {"theme": "Existență", "text": "Nu orice lucru trebuie compensat. Unele lucruri rămân în tine."},
    {"theme": "Timp", "text": "Viața are istoric. Nu te întorci pur și simplu la starea inițială."},
    {"theme": "Identitate", "text": "Ceea ce ai trăit schimbă sistemul care trăiește mai departe."},
    {"theme": "Caracter", "text": "Cum să recunoști totuși un om după roade? La ce te uiți? Cum evaluezi?"},
    {"theme": "Caracter", "text": "Poate că un om nu se vede cel mai bine în ceea ce declară, ci în ceea ce produce repetat în jurul lui."},
    {"theme": "Credință", "text": "Nu vreau o credință care doar mă consolează. Vreau una care rămâne în picioare și după ce încerc s-o demontez."},
    {"theme": "Credință", "text": "Nu vreau o lume revrăjită. Vreau să văd dacă Dumnezeu mai rămâne după dezvrăjire."},
    {"theme": "Adevăr", "text": "Adevărul nu devine mai adevărat pentru că am nevoie de el."},
    {"theme": "Sens", "text": "Și totuși nevoia noastră de sens este ea însăși un fapt care trebuie explicat."},
    {"theme": "Voință", "text": "Uneori facem lucruri foarte grele ca să evităm un lucru foarte simplu."},
    {"theme": "Credință", "text": "Poți da aproape orice fără să te dai pe tine."},
    {"theme": "Credință", "text": "Poți renunța la avere și să păstrezi proprietatea asupra ta."},
    {"theme": "Credință", "text": "Poate că ultima proprietate la care renunță omul este el însuși."},
    {"theme": "Credință", "text": "Vrem viața veșnică, dar vrem să rămână viața noastră."},
    {"theme": "Dumnezeu", "text": "A-L accepta pe Dumnezeu nu este același lucru cu a-I permite să fie Dumnezeu."},
    {"theme": "Credință", "text": "Faptele pot deveni inclusiv o metodă de a păstra controlul."},
    {"theme": "Credință", "text": "Uneori meritul este ultima formă a autonomiei."},
    {"theme": "Credință", "text": "«N-am făcut noi...?» este poate una dintre cele mai periculoase propoziții religioase."},
]


BUSINESS_IDEAS = [
    {
        "date": "august 2025",
        "theme": "Energie",
        "title": "Energie direct de la producător la consumator",
        "summary": "O platformă software în care consumatorul cumpără energie direct de la producător, cu posibilitatea unui model pre-pay.",
        "body": [
            "Ideea pornește de la eliminarea unei părți din distanța comercială dintre producător și consumator. Software-ul nu ar fi doar un comparator de oferte, ci infrastructura prin care energia poate fi contractată mai direct.",
            "Ulterior am adăugat ideea de energie pre-pay: consumatorul cumpără în avans o anumită cantitate sau valoare, iar platforma urmărește consumul și relația comercială."
        ],
    },
    {
        "date": "2026",
        "theme": "LaCurent",
        "title": "Un strat independent de decizie înainte de investiția energetică",
        "summary": "LaCurent nu trebuie să fie în primul rând un vânzător de produse, ci locul în care investiția este evaluată înainte de cumpărare.",
        "body": [
            "Motorul trebuie să răspundă întâi la întrebarea tehnică și economică: ce se întâmplă dacă schimb izolația, ferestrele, generatorul, instalația, ventilarea sau producția locală?",
            "Abia după verdict pot apărea produse, furnizori sau instalatori. Recomandarea comercială nu trebuie să schimbe concluzia fizică."
        ],
    },
    {
        "date": "iunie 2026",
        "theme": "LaCurent",
        "title": "80% din investițiile energetice evaluate înainte de cumpărare",
        "summary": "Ținta pe termen lung: decizia energetică rezidențială să fie verificată digital înainte ca banii să fie cheltuiți.",
        "body": [
            "Ambiția nu este doar să existe un calculator bun. Ideea este ca evaluarea înainte de cumpărare să devină comportament normal: utilizatorul verifică impactul, costul și alternativa înainte să comande lucrarea.",
            "Asta mută valoarea platformei din zona de «calculator» în zona de infrastructură de decizie."
        ],
    },
    {
        "date": "2026",
        "theme": "Produs",
        "title": "Casa reală ca baseline, apoi scenarii",
        "summary": "Modelul de referință util nu este o casă generică, ci casa reală a utilizatorului salvată ca baseline.",
        "body": [
            "Utilizatorul își modelează situația actuală, o salvează, apoi construiește scenarii de îmbunătățire peste ea.",
            "Comparația trebuie să arate clar ce se schimbă față de realitatea lui: energie, cost, emisii, investiție, ROI și eventual conformarea la o țintă precum nZEB."
        ],
    },
    {
        "date": "2026",
        "theme": "Monetizare",
        "title": "Raport plătit cu investiții, prioritizare și ROI",
        "summary": "Calculul gratuit poate duce la un raport personalizat care spune unde merită investiți banii și în ce ordine.",
        "body": [
            "Raportul nu trebuie să fie doar o listă de rezultate tehnice. Trebuie să transforme calculul într-o decizie: ce intervenție are impact, cât costă, cât economisește și care este ordinea logică a investițiilor.",
            "Valoarea comercială vine din reducerea incertitudinii înainte de o cheltuială reală."
        ],
    },
    {
        "date": "mai–iunie 2026",
        "theme": "Piață",
        "title": "Economii împărțite, furnizori parteneri, utilizatori agregați",
        "summary": "Platforma poate lega economia tehnică de o piață: furnizori parteneri și gruparea cererii pentru a obține condiții mai bune.",
        "body": [
            "Am explorat ideea ca economiile și investițiile să aibă un baseline transparent, iar furnizorii să intre ca parteneri după calcul.",
            "Dacă suficienți utilizatori au aceeași nevoie, cererea poate fi agregată și folosită pentru a influența prețul sau oferta."
        ],
    },
    {
        "date": "iulie 2026",
        "theme": "BIM",
        "title": "Motorul energetic în Archicad, Revit și IFC",
        "summary": "În loc ca utilizatorul să reintroducă datele, modelul clădirii poate veni direct din instrumentele de proiectare.",
        "body": [
            "IFC poate conține geometrie, materiale, grosimi, anvelopă și informații despre instalații. Ideea este ca motorul fizic să consume aceste date și să întoarcă impactul energetic.",
            "Asta transformă LaCurent din aplicație izolată într-un motor reutilizabil în fluxurile existente ale proiectanților."
        ],
    },
    {
        "date": "iulie 2026",
        "theme": "Date",
        "title": "Calcule precise la scară mare pentru a descoperi pattern-uri",
        "summary": "Dacă poți calcula clădiri corect în multe puncte și configurații, poți descoperi schimbări mici de parametri care produc impact mare.",
        "body": [
            "Valoarea nu este doar rezultatul pentru o singură casă. O bază mare de simulări poate arăta ce combinații de climă, anvelopă, instalații și utilizare schimbă cel mai mult rezultatul.",
            "Ideea poate produce insight-uri utile dincolo de România, dacă motorul și datele sunt suficient de generalizabile."
        ],
    },
    {
        "date": "septembrie 2026",
        "theme": "AI",
        "title": "AI care explică rezultatul, nu doar îl afișează",
        "summary": "Dacă rezultatul energetic pare contraintuitiv, utilizatorul trebuie să poată întreba direct de ce.",
        "body": [
            "Un rezultat corect poate fi greu de crezut fără explicație. De aici ideea unui chat care primește contextul calculului și explică de ce un scenariu costă mai mult, consumă mai mult sau produce alte emisii.",
            "AI-ul trebuie să stea peste rezultatul calculat, nu să inventeze calculul."
        ],
    },
    {
        "date": "septembrie 2026",
        "theme": "Distribuție",
        "title": "Calculatorul ca widget distribuit în site-urile altora",
        "summary": "Același motor poate fi pus în site-uri partenere, păstrând logica baseline → scenariu → decizie.",
        "body": [
            "În loc să obligi fiecare client să vină pe un singur site, produsul poate merge acolo unde există deja trafic: parteneri, furnizori sau alte platforme.",
            "Important este ca widgetul să nu devină doar un formular de lead-uri, ci să păstreze comparația dintre casa actuală și scenariul dorit."
        ],
    },
    {
        "date": "septembrie 2026",
        "theme": "Date",
        "title": "Prețurile reale trebuie să intre în calcul",
        "summary": "Gazul, lemnul, electricitatea și ceilalți purtători trebuie legați de surse actualizabile, astfel încât rezultatul tehnic să devină cost în lei.",
        "body": [
            "Energia utilă nu este suficientă pentru decizie. În funcție de sistemul care o produce, consumul trebuie înmulțit cu prețul aferent și explicată sursa.",
            "Pentru combustibili precum lemnul, inclusiv unitatea de vânzare, umiditatea și transportul pot schimba comparația."
        ],
    },
    {
        "date": "septembrie 2026",
        "theme": "AI & Business",
        "title": "Un AI ca angajat care conduce operațional afacerea",
        "summary": "Nu doar un chatbot care răspunde, ci un operator care caută, execută taskuri, vorbește cu oameni și promovează produsul.",
        "body": [
            "Ideea este ca AI-ul să preia cât mai mult din munca de operator: cercetare, identificare de oportunități, pregătirea contactelor, mesaje și urmărirea fluxului.",
            "Omul păstrează deciziile importante și limitele, dar nu trebuie să execute manual fiecare pas repetitiv."
        ],
    },
    {
        "date": "septembrie 2026",
        "theme": "Business",
        "title": "Căutarea de bani trebuie să iasă din canalul curent",
        "summary": "Dacă email outreach-ul nu produce suficient, căutarea recurentă trebuie să exploreze alte oportunități și alte modele, nu doar mai multe emailuri.",
        "body": [
            "Am cerut explicit ca activitatea recurentă să fie orientată spre bani și să gândească în afara canalului curent.",
            "Principiul este simplu: nu optimiza la infinit un canal slab doar pentru că ai automatizat deja acel canal."
        ],
    },
    {
        "date": "ianuarie–septembrie 2025",
        "theme": "Automatizare",
        "title": "Firmă de automatizare a proceselor",
        "summary": "O firmă care intră în procesele altor companii și automatizează activitățile repetitive cu unelte software și AI.",
        "body": [
            "Interesul meu inițial a fost mai larg decât automotive: procese administrative și operaționale care pot fi simplificate prin automatizare.",
            "Mai târziu ideea s-a rafinat spre un sistem care nu doar execută procesul, ci caută și varianta mai eficientă."
        ],
    },
    {
        "date": "septembrie 2025",
        "theme": "AI",
        "title": "AI Process Optimizer",
        "summary": "O aplicație AI care primește pașii, costurile, timpii și dependențele unui proces și caută o structură mai eficientă.",
        "body": [
            "Nu doar automatizare a procesului existent, ci analiză a procesului înainte de automatizare.",
            "Produsul ar trebui să răspundă la întrebarea: care este cea mai eficientă soluție sau succesiune, și ce economie ar produce schimbarea?"
        ],
    },
    {
        "date": "august 2025",
        "theme": "Engineering SaaS",
        "title": "Smart Engineer Toolkit",
        "summary": "Un produs pentru ingineri care automatizează calcule, rapoarte și template-uri repetitive.",
        "body": [
            "Ideea a venit din dorința de produs scalabil bazat pe muncă inginerească reală, nu din content generic.",
            "Valoarea este în comprimarea muncii repetitive pe care inginerii o fac deja în Excel, documente și tool-uri separate."
        ],
    },
    {
        "date": "iulie 2026",
        "theme": "Micro-SaaS",
        "title": "Produse mici pentru a finanța produsul mare",
        "summary": "Generatoare de trasabilitate, requirements și test cases ca produse rapide, în paralel cu construcția LaCurent.",
        "body": [
            "Ideea nu era să abandonez proiectul central, ci să folosesc produse mai simple și mai ușor vandabile ca sursă de cash.",
            "Un micro-produs poate avea rol strategic: finanțează timpul necesar pentru un produs mai ambițios."
        ],
    },
    {
        "date": "octombrie 2025",
        "theme": "Engineering",
        "title": "Automatizează ASPICE fără să distrugi disciplina",
        "summary": "Documentația, trasabilitatea, configurarea și auditul repetitiv trebuie automatizate astfel încât inginerii să nu devină data clerks.",
        "body": [
            "Problema nu este procesul în sine, ci cantitatea de muncă mecanică pe care procesul o poate împinge asupra inginerului.",
            "Parametrizarea, configurarea, generarea, implementarea, copierea, redenumirea și reformularea sunt candidați naturali la automatizare. Structura rămâne; energia cognitivă se mută înapoi spre inginerie."
        ],
    },
    {
        "date": "septembrie 2026",
        "theme": "AI & Verification",
        "title": "Manual first, AI scale later",
        "summary": "În testare, întâi înțelegi manual un fault simplu și reacția sistemului; apoi AI-ul scalează pattern-ul.",
        "body": [
            "Un test punctual, făcut manual, poate arăta cadența software, latențele și reacția reală. După ce mecanismul este înțeles, automatizarea poate multiplica acoperirea.",
            "AI-ul poate genera și reutiliza implementări, dar nu trebuie să decidă singur dacă rezultatul tehnic este adevărat sau fals."
        ],
    },
    {
        "date": "septembrie 2026",
        "theme": "Human Safety",
        "title": "Antivirus pentru om, nu pentru malware",
        "summary": "Un sistem care te protejează de propriile erori de decizie și de manipularea psihologică înainte de acțiuni cu risc.",
        "body": [
            "Ideea pornește de la faptul că multe pierderi nu vin dintr-un calculator compromis, ci dintr-un om convins să facă pasul greșit.",
            "Produsul ar observa contextul unei decizii și ar introduce fricțiune sau avertizare când apar semne de manipulare, scam, grabă, presiune sau incoerență."
        ],
    },
    {
        "date": "februarie 2026",
        "theme": "Hardware",
        "title": "Controller modular pentru instalații",
        "summary": "O cutie de comandă cu intrări analogice și ieșiri pentru electrovane, pompe și comandă de centrală, construită întâi într-o variantă 1-in/1-out.",
        "body": [
            "Principiul de dezvoltare este important: faci o singură intrare și o singură ieșire, validezi arhitectura, apoi multiplici.",
            "Aceeași bază poate servi protecției anti-îngheț, degivrării și altor automatizări termice simple."
        ],
    },
    {
        "date": "februarie 2025",
        "theme": "Agricultură",
        "title": "Automatizarea utilajelor agricole existente",
        "summary": "În loc să înlocuiești flota, automatizezi tractoarele și utilajele deja existente pentru a crește mecanizarea și productivitatea.",
        "body": [
            "Ideea este una de leverage național: hardware și control adăugate peste capitalul mecanic existent.",
            "Valoarea vine din multiplicarea productivității fără ca fiecare fermă să cumpere de la zero utilaje autonome noi."
        ],
    },
    {
        "date": "martie 2025",
        "theme": "Media & AI",
        "title": "Muzică originală generată cu AI ca micro-business media",
        "summary": "Producție rapidă de piese originale cu AI și distribuție multi-platformă pentru monetizare.",
        "body": [
            "Modelul explorat a fost să produci conținut muzical original și să îl distribui pe YouTube, TikTok și platforme de streaming.",
            "Este o idee de producție digitală în care costul marginal al unei noi piese scade mult, iar distribuția poate fi aproape complet online."
        ],
    },
    {
        "date": "septembrie 2026",
        "theme": "Servicii",
        "title": "Expertiza inginerească transformată în business B2B",
        "summary": "Embedded Verification & Test Automation ca serviciu global focalizat, separat de linia locală de instalații și energie.",
        "body": [
            "Strategia este să monetizezi expertiza existentă înainte ca produsul software să ajungă la scară: probleme concrete de testare, diagnostic, automatizare și HIL pentru companii care deja au buget.",
            "În paralel, energia și instalațiile rămân o linie separată pentru piața din România. Două piețe, două landing-uri, aceeași infrastructură la început."
        ],
    },
    {
        "date": "decembrie 2025",
        "theme": "Capital",
        "title": "Renovarea ca generator de equity",
        "summary": "Cumperi cu finanțare, creezi valoare prin renovare, apoi reevaluezi și încerci să folosești valoarea nou creată ca garanție pentru capital suplimentar.",
        "body": [
            "Intuiția este că banii investiți în renovare nu dispar dacă transformă activul într-unul mai valoros.",
            "Întrebarea de business este cum poate fi capturată acea diferență de valoare prin reevaluare și refinanțare, în loc să rămână blocată complet în proprietate."
        ],
    },
    {
        "date": "decembrie 2024",
        "theme": "Economie",
        "title": "IT-ul ca infrastructură de reindustrializare",
        "summary": "România poate folosi competența software nu doar ca industrie de servicii, ci ca strat care modernizează medicina, agricultura, comerțul, turismul și energia.",
        "body": [
            "Ideea este un hub regional IT legat de industrii reale, nu o economie separată de ele.",
            "Software-ul, AI-ul, agricultura de precizie, telemedicina, marketplace-urile, ghidajul digital, smart grid-ul și regenerabilele pot fi tratate ca părți ale unei noi economii industriale."
        ],
    },
]

BUSINESS_FRAGMENTS = [
    {"theme": "LaCurent", "text": "Fizica înaintea comisionului."},
    {"theme": "LaCurent", "text": "Verdictul tehnic trebuie să vină înaintea marketplace-ului."},
    {"theme": "Produs", "text": "Casa reală este baseline-ul. Restul sunt scenarii."},
    {"theme": "AI", "text": "AI-ul scalează testarea; nu decide adevărul testului."},
    {"theme": "Engineering", "text": "Manual first. AI scale later."},
    {"theme": "Engineering", "text": "Nu transforma inginerul în data clerk."},
    {"theme": "Engineering", "text": "Automatizează ce e repetitiv ca să eliberezi ce e creativ."},
    {"theme": "Hardware", "text": "Începe cu o intrare și o ieșire. Multiplică după ce funcționează."},
    {"theme": "Platformă", "text": "Fă motorul o dată. Distribuie-l prin mai multe canale."},
    {"theme": "Business", "text": "Caută leverage, nu muncă locală greu de multiplicat."},
    {"theme": "Business", "text": "Research înainte de build."},
    {"theme": "Business", "text": "Dacă avantajul e marginal și piața e deja rezolvată, nu merită."},
    {"theme": "AI & Business", "text": "Un AI ar trebui să poată conduce operațional o afacere ca un angajat."},
    {"theme": "Business", "text": "Dacă emailul nu produce, caută bani și în afara emailului."},
    {"theme": "Business", "text": "Software fără capital, scalabil, construit pe expertiză."},
    {"theme": "Energie", "text": "Direct de la producător la consumator. Eventual pre-pay."},
    {"theme": "Human Safety", "text": "Antivirus pentru om, nu pentru calculator."},
    {"theme": "Produs", "text": "Raportul nu trebuie doar să calculeze; trebuie să spună ce investiție merită."},
    {"theme": "Micro-SaaS", "text": "Produsele mici pot finanța produsul mare."},
    {"theme": "LaCurent", "text": "Investiția energetică ar trebui evaluată înainte să fie cumpărată."},
    {"theme": "Distribuție", "text": "Distribuția altora poate avea mai mult leverage decât propria implementare locală."},
    {"theme": "Date", "text": "Prețurile reale trebuie să intre direct în decizie."},
    {"theme": "ASPICE", "text": "Păstrează disciplina procesului; elimină munca mecanică a procesului."},
    {"theme": "Automatizare", "text": "Nu automatiza doar procesul. Întâi întreabă dacă procesul poate fi mai bun."},
    {"theme": "Business", "text": "Cu buget zero și timp puțin, tot ce nu are leverage mare devine secundar."},
]

ESSAYS_BY_SLUG = {essay["slug"]: essay for essay in ESSAYS}


@router.get("/lemnaru-karol-cristian", response_class=HTMLResponse)
def personal_blog(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request=request,
        name="personal_blog.html",
        context={
            "essays": ESSAYS,
            "article": None,
            "short_notes": SHORT_NOTES,
        },
    )



@router.get("/lemnaru-karol-cristian/afaceri-tehnologie-bani", response_class=HTMLResponse)
def personal_business_ideas(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request=request,
        name="personal_business_ideas.html",
        context={
            "business_ideas": BUSINESS_IDEAS,
            "business_fragments": BUSINESS_FRAGMENTS,
        },
    )

@router.get("/lemnaru-karol-cristian/{slug}", response_class=HTMLResponse)
def personal_blog_article(request: Request, slug: str) -> HTMLResponse:
    article = ESSAYS_BY_SLUG.get(slug)
    if article is None:
        raise HTTPException(status_code=404, detail="Articol inexistent.")
    return templates.TemplateResponse(
        request=request,
        name="personal_blog.html",
        context={
            "essays": ESSAYS,
            "article": article,
            "short_notes": SHORT_NOTES,
        },
    )
