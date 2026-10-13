# Generasjon M – stemningsrapport

Rapportskjema for M-venner og admin-panel med statistikk over alle besøk.

- `public/index.html` – skjemaet M-vennene fyller ut etter hvert besøk (stedskode, ingen innlogging)
- `public/admin.html` – admin-panel med Google-innlogging: oversikt, alle besøk, oppsummeringer, ukas utfordring, mål, steder og administratorer
- Databasen ligger i Supabase-prosjektet `generasjon-m-stemningsrapport` (eu-north-1), med migreringene `grunnskjema` og `funksjoner_og_statistikk`

## Innlogging for admin (Auth0)

Admin logger inn med Google via Auth0. Sett `auth0Domain` og `auth0ClientId` i `public/config.js`.
Auth0 må ha en post-login Action som legger `role: authenticated` på ID-tokenet, og Supabase må ha Auth0 lagt til under Third-Party Auth.
Databasen godtar bare tokens fra issuer lagret i `private.innstillinger` (`auth0_issuer`).

## Sikkerhet

- Alle tabeller har Row Level Security. Kun administratorer (Google-innlogging + e-post på admin-listen + godkjent domene) kan lese eller endre data.
- M-venner sender inn via `send_rapport()` med en stedskode. Koden lagres kun som bcrypt-hash. Funksjonen validerer alle verdier og begrenser til 10 innsendinger per sted per time.
- Nøkkelen i `public/config.js` er den publiserbare nøkkelen og gir bare det tilgangsreglene tillater.
- `vercel.json` setter streng Content-Security-Policy og andre sikkerhetshoder.

## Publisering på Vercel

Importer repoet i Vercel, sett «Output Directory» til `public` og la byggekommandoen stå tom.
