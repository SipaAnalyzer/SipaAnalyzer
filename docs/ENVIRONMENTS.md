# Separation Dev / Prod

## Objectif

Eviter qu'un test, une migration ou une erreur de configuration impacte les donnees de production.

## Environnements recommandes

| Environnement | Usage | Supabase | Vercel |
|---|---|---|---|
| Dev | Tests et evolutions | Projet Supabase dev | Preview / local |
| Prod | Utilisateurs reels | Projet Supabase prod | Production |

## Variables Vercel

Configurer separement :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Ne jamais mettre :

- cle service role
- token Slack
- cle OpenAI
- secret prive dans une variable `VITE_`

## Regles d'exploitation

- Tester les migrations sur Supabase dev avant prod.
- Tester le build local avant push.
- Verifier la restauration backup sur dev.
- Ne jamais utiliser une base prod pour essais destructifs.
- Garder les secrets uniquement dans Supabase Secrets ou Vercel Environment Variables.

## Checklist promotion prod

1. `npm run lint`
2. `npm run build`
3. test connexion admin
4. test compte en attente
5. test creation/modification d'un bien
6. test backup JSON
7. test restauration sur environnement dev
8. push GitHub
9. verification Vercel deployment
10. verification Admin > Supervision
