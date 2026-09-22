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

ESSAYS_BY_SLUG = {essay["slug"]: essay for essay in ESSAYS}


@router.get("/lemnaru-karol-cristian", response_class=HTMLResponse)
def personal_blog(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request=request,
        name="personal_blog.html",
        context={
            "essays": ESSAYS,
            "article": None,
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
        },
    )
