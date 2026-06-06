# Smoke tests LaCurent

## Scop

Smoke testele prind rapid problemele mari de navigare, pagini lipsa, JavaScript invalid si regresii de cont.

## Rulare locala

Porneste site-ul local, apoi ruleaza:

```powershell
npm run smoke
```

Implicit testeaza:

* sintaxa fisierelor JS importante;
* incarcarea paginilor principale;
* prezenta sectiunilor cheie: dashboard, analiza, raport, algoritmi, facturi, furnizori, admin.

## Rulare cu API de development

Pentru testul complet de autentificare/provider:

```powershell
npm run smoke:api
```

Acest test creeaza un cont temporar pe API-ul configurat in `SMOKE_API_BASE`.
Implicit, `SMOKE_API_BASE` este mediul de development:

```text
https://lacurent-dev.lemnarukarol.workers.dev
```

Nu rula smoke API pe productie decat explicit si intentionat.

Verifica regresia importanta:

* un cont residential ramane `role = residential`;
* inscrierea ca furnizor seteaza doar `account_type = provider`;
* formularul de business nu trebuie sa preia contul residential doar pentru ca are profil de furnizor.

## Configurare

Poti schimba bazele cu variabile de mediu:

```powershell
$env:SMOKE_LOCAL_BASE="http://127.0.0.1:4173"
$env:SMOKE_API_BASE="https://lacurent-dev.lemnarukarol.workers.dev"
npm run smoke
```
