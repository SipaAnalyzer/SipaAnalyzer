# Mise en ligne SIPA Analyzer

## Variables frontend

Configurer ces variables sur l'hébergeur:

```txt
VITE_SUPABASE_URL=https://nrqqsbubmfjjqvubgqjs.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

Ne jamais mettre de clé OpenAI dans une variable `VITE_`.

## Build

```powershell
node .\node_modules\vite\bin\vite.js build
```

Le dossier produit est `dist/`.

## Hébergement conseillé

Vercel:
- Framework: Vite
- Build command: `npm run build` ou `node .\node_modules\vite\bin\vite.js build`
- Output directory: `dist`
- `vercel.json` force les routes React vers `index.html`.

Netlify:
- Build command: `npm run build`
- Publish directory: `dist`
- `public/_redirects` force les routes React vers `index.html`.

## Supabase

À vérifier avant livraison:
- URL du site ajoutée dans Authentication > URL Configuration.
- Redirect URLs:
  - `https://ton-domaine.com`
  - `https://ton-domaine.com/reset-password`
- Les comptes admin existent dans `profiles` / permissions.
- Les règles RLS autorisent les opérations attendues.

## IA

L'IA est prête techniquement via `supabase/functions/ai-insights`, mais peut rester désactivée tant que le quota/API provider n'est pas choisi.

Pour OpenAI plus tard:

```powershell
supabase secrets set OPENAI_API_KEY="..."
supabase functions deploy ai-insights --project-ref nrqqsbubmfjjqvubgqjs
```

## Checklist de recette

- Connexion avec compte admin.
- Connexion avec compte utilisateur non-admin.
- Création/modification d'un bien.
- Création/modification d'une analyse.
- Vérification des formules sur un bien exemple.
- Favoris.
- Commentaires et suppression admin.
- Exports PDF: fiche bien, analyse, comparaison.
- Comparateur.
- Présentation + carte.
- Historique/traçabilité.
