# Home Lab — audit legislativ și product-compliance
Data auditului: 2026-09-30
Scope: România, locuințe individuale, performanță energetică, renovare, optimizare tehnico-economică și poziționarea juridică a raportului Home Lab.

## 1. Concluzie executivă

Home Lab poate rămâne un motor tehnic și economic foarte puternic fără să se prezinte drept document oficial.

Poziționarea recomandată:
- RBPE = model fizic / energetic;
- TEO = optimizare tehnico-economică;
- Raport Home Lab = raport de calcul și suport pentru decizie;
- documentele oficiale și proiectele pentru execuție rămân în responsabilitatea specialiștilor atestați/autorizați prevăzuți de lege.

Nu folosim pentru output-ul automat expresii precum „certificat energetic oficial”, „raport de audit energetic oficial”, „raport de conformare nZEB” sau „proiect verificat”, dacă documentul nu a fost efectiv elaborat/verificat de specialistul competent.

## 2. Baza legislativă confirmată

### Legea nr. 372/2005 privind performanța energetică a clădirilor
Sursă oficială:
https://legislatie.just.ro/Public/DetaliiDocument/182141

Puncte relevante pentru produs:
- performanța energetică include consum de energie primară/finală, clasă energetică, emisii CO2 și energie din surse regenerabile;
- metodologia națională este baza de calcul;
- certificatul de performanță energetică și raportul de audit energetic sunt documente reglementate;
- auditorul energetic pentru clădiri este specialistul atestat care are dreptul să elaboreze documentele prevăzute de lege;
- raportul de conformare nZEB este definit distinct și este elaborat de auditor energetic pentru clădiri gradul I;
- pentru clădiri noi, documentația pentru autorizare include raportul de conformare nZEB, în condițiile legii;
- pentru renovarea majoră, documentația tehnică pentru autorizare dezvoltă măsurile prevăzute în raportul de audit energetic;
- pentru sistemele tehnice noi/înlocuite/modernizate sunt relevante instalarea corectă, dimensionarea, reglarea și controlul.

### Mc 001-2022
Ordinul MDLPA nr. 16/2023:
https://legislatie.just.ro/Public/DetaliiDocument/263984

Home Lab trebuie să mențină versionarea explicită a metodologiei, ipotezelor, factorilor și pragurilor folosite.

### Legea nr. 10/1995 privind calitatea în construcții
Sursă oficială:
https://legislatie.just.ro/Public/DetaliiDocument/5729

Puncte relevante:
- proiectele pentru execuție se verifică, când legea o cere, de verificatori de proiecte atestați pe domenii/subdomenii și specialități;
- proiectantul și verificatorul au roluri juridice distincte;
- investitorul/proprietarul are obligații privind proiectarea, verificarea, execuția și recepția;
- produsele/procedeele/echipamentele utilizate trebuie să respecte cadrul de calitate aplicabil.

### Legea nr. 50/1991 privind autorizarea executării lucrărilor de construcții
Sursă oficială:
https://legislatie.just.ro/Public/DetaliiDocumentAfis/293285

Punct relevant:
- documentațiile tehnice pentru reabilitarea termică sunt supuse cerințelor de verificare aplicabile pentru economia de energie și izolarea termică;
- regimul concret al autorizației trebuie stabilit pentru lucrarea efectivă, nu dedus automat doar din recomandarea TEO.

## 3. Ce este deja bine în Home Lab

- nZEB este tratat ca o constrângere tehnică și UI-ul precizează că nu este certificat legal.
- raportul prezintă metodologia și ipotezele.
- TEO optimizează separat de maparea comercială.
- RBPE/TEO calculează explicit puterea necesară și performanța sistemelor.
- clasa energetică modelată are deja explicație că nu reprezintă un CPE emis legal.
- raportarea RER/garanțiilor de origine separă partea calculabilă de dovada documentară.

## 4. Gap-uri identificate și acțiuni

### A. Statutul raportului — critic
Risc:
utilizatorul poate interpreta raportul Home Lab drept audit energetic / CPE / conformare nZEB oficială.

Acțiune:
- denumire: „Raport Home Lab — analiză tehnică de decizie”;
- stare explicită: „Calcul tehnic finalizat” + „Verificare profesională neefectuată”;
- secțiune finală care explică ce tip de specialist intervine pentru fiecare document oficial.

Status: implementat în staging în această iterație.

### B. Raport nZEB — critic
Risc:
„Candidat nZEB” poate fi confundat cu conformare juridică.

Acțiune:
- păstrăm „candidat / verificare tehnică modelată”;
- nu afișăm „conform nZEB oficial” fără document elaborat de auditor energetic gradul I;
- păstrăm separat documentele/garanțiile pe care motorul nu le poate demonstra.

### C. Renovare majoră — ridicat
Risc:
TEO poate propune un pachet amplu fără să știe dacă juridic lucrarea este o renovare majoră.

Acțiune viitoare:
- adăugăm un „legislative applicability check” bazat pe scopul lucrării și date suplimentare;
- nu derivăm statutul juridic exclusiv din anul construcției sau CAPEX;
- dacă este renovare majoră, raportul indică explicit necesitatea traseului de audit/proiect prevăzut de lege.

### D. Regim de autorizare și verificare proiect — ridicat
Risc:
utilizatorul poate trece direct de la recomandare la execuție.

Acțiune:
- pentru fiecare familie de intervenții, catalogul de măsuri va avea metadata de tip:
  - project_review_required: unknown/likely/no;
  - authority_check_required: unknown/likely/no;
  - specialist_domains: [...];
- UI-ul nu va declara automat „fără autorizație”.

### E. Excepții de aplicabilitate energetică — mediu
Legea 372 include categorii speciale/excepții (de exemplu anumite clădiri protejate, clădiri mici independente, utilizare sezonieră etc.).

Acțiune:
- introducem ulterior un scurt „scope check” doar când datele casei pot indica o excepție;
- pentru patrimoniu / zonă protejată trebuie cerut explicit statutul, nu ghicit din adresă.

### F. Produse reale și conformitatea lor — ridicat pentru marketplace
Risc:
TEO poate mapa la un produs performant numeric, dar „performant” nu înseamnă automat „adecvat legal pentru proiect”.

Acțiune D1:
fiecare SKU destinat construcțiilor trebuie să poată păstra:
- documentația tehnică / declarațiile de performanță relevante;
- standard / evaluare tehnică aplicabilă;
- domeniul de utilizare;
- data și sursa documentului;
- caracteristicile declarate folosite de TEO;
- statusul documentației: verificat / lipsă / expirat / neclar.

TEO nu trebuie să transforme absența documentelor într-o presupunere de conformitate.

### G. EPBD recast 2024/1275 — watchlist obligatoriu
Sursă oficială:
https://eur-lex.europa.eu/eli/dir/2024/1275/oj

Direcții care afectează arhitectura Home Lab:
- renovation passports;
- zero-emission buildings;
- life-cycle global warming potential (GWP) pentru clădiri noi;
- cerințe și politici privind energia solară;
- eliminarea treptată a combustibililor fosili / lipsa stimulentelor pentru cazane standalone pe combustibili fosili;
- one-stop shops pentru renovare;
- calitatea mediului interior și noi cerințe de raportare.

Regulament delegat UE 2026/52 privind cadrul GWP:
https://eur-lex.europa.eu/eli/reg_del/2026/52/oj

Decizie de produs:
nu hard-codăm ca „lege românească în vigoare” praguri EPBD noi până când actul național aplicabil este identificat și versionat în registry-ul legislativ Home Lab. Păstrăm aceste cerințe ca watchlist și pregătim structurile de date.

## 5. Propunere de arhitectură: Legislative Registry

Home Lab ar trebui să aibă un registry versionat, separat de motor:
- jurisdiction: RO / EU;
- source_id;
- title;
- source_url;
- published_at;
- effective_from;
- effective_until;
- applicability;
- requirement_type;
- metric / threshold;
- evidence_required;
- responsible_professional;
- implementation_status;
- last_verified_at.

RBPE/TEO consumă doar reguli active și versionate. Raportul tipărește versiunea registry-ului folosită.

## 6. Flux recomandat după TEO

1. Calcul Home Lab
2. Optimizare TEO
3. Raport Home Lab — analiză tehnică de decizie
4. Clasificarea scopului:
   - decizie personală;
   - audit/CPE;
   - conformare nZEB;
   - proiect pentru execuție;
   - renovare majoră / intervenție supusă autorizării
5. Specialist competent
6. Document oficial / proiect verificat, dacă este necesar
7. Execuție și recepție conform cadrului aplicabil

Important: „verificare profesională” este termenul UI generic. În documentele oficiale trebuie folosită denumirea exactă a profesionistului și a documentului.

## 7. Următoarele task-uri legislative recomandate

P0:
- păstrăm separarea clară Raport Home Lab vs document oficial;
- introducem registry legislativ versionat;
- audităm complet nZEB / Mc001 threshold mapping din motor;
- definim workflow-ul „verificare profesională”.

P1:
- matrice intervenție → proiect/autorizație/specialist/document;
- scope check pentru renovare majoră și excepții;
- metadata de conformitate pentru produsele D1.

P2:
- renovation passport;
- GWP lifecycle;
- zero-emission building;
- one-stop-shop / finanțări / pași de implementare.

## 8. Principiu de produs

Home Lab trebuie să poată spune:
„Am calculat această soluție și îți arăt exact pe ce date și reguli se bazează.”

Nu trebuie să spună:
„Această soluție este avizată legal”,
decât după ce documentul și specialistul corespunzător au intrat efectiv în flux.
