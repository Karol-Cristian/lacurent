# GUEST_MODE.md

# Guest First, Account Later

LaCurent trebuie sa arate valoarea produsului inainte sa ceara cont.

Principiu:

> Show value first. Ask for account later.

Utilizatorul poate completa analiza locuintei si poate vedea un raport estimativ fara cont.

Contul devine optional dupa raport, pentru:

* salvare permanenta;
* PDF;
* facturi;
* compararea mai multor locuinte;
* continuare pe alt dispozitiv;
* actualizari;
* oferte viitoare.

Nu folosim copy de tip:

> Trebuie sa creezi cont pentru a continua.

Folosim:

> Raportul tau este gata. Il poti folosi acum fara cont.

si:

> Creeaza cont gratuit ca sa il salvezi si sa revii la simulari.

---

# GuestSession

Sesiunea anonima se pastreaza local pe dispozitiv.

Stocare permisa:

* localStorage;
* sessionStorage;
* cookies strict necesare;
* anonymous session id.

Date permise:

* tip locuinta;
* localitate aproximativa;
* suprafata;
* an constructie;
* sistem incalzire;
* izolatie;
* ferestre;
* scenarii analizate;
* raport generat;
* preferinte UI.

Nu cerem nume, telefon sau email inainte ca utilizatorul sa vada raportul.

---

# Modele conceptuale

```ts
interface GuestSession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  homesAnalyzed: HomeDraft[];
  currentHomeDraft?: HomeDraft;
  reportsGenerated: ReportAccess[];
  scenariosViewed: string[];
  consentState: ConsentState;
}

interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

interface HomeDraft {
  id: string;
  mode: "owner" | "buyer";
  updatedAt: string;
  inputData: Record<string, unknown>;
  completionPercent: number;
  generatedReportId?: string;
}

interface ReportAccess {
  reportId: string;
  accessType: "guest" | "account";
  savedLocally: boolean;
  savedToCloud: boolean;
}
```

---

# Privacy & Consent

LaCurent distinge intre:

1. Date strict necesare
   * progres local;
   * sesiune anonima;
   * raport local.

2. Date pentru personalizare
   * simulari recente;
   * preferinte;
   * comparatii.

3. Analytics / marketing
   * doar optional si cu consimtamant unde este necesar.

Copy:

> Folosim stocare locala pentru a-ti pastra simularea pe acest dispozitiv. Cookie-urile de analiza sau marketing sunt optionale.

---

# Acceptance Criteria

1. Utilizatorul poate incepe analiza fara cont.
2. Utilizatorul poate vedea un raport estimativ fara cont.
3. Progresul poate fi pastrat local pe dispozitiv.
4. Crearea contului apare doar dupa ce utilizatorul vede valoare.
5. Simularile pot fi reluate daca utilizatorul revine pe acelasi dispozitiv.
6. Recomandarile raman bazate pe casa si scenarii.
7. Analytics si marketing sunt optionale.
8. Datele personale nu sunt cerute prea devreme.
