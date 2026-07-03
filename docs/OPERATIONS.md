# Exploitation et Supervision

## Objectif

Assurer le suivi opérationnel de l'application : état des services, activité utilisateur, logs, corbeille et restauration.

## Supervision disponible dans l'application

Dans le panneau admin :

- monitoring technique Supabase
- nombre de biens et d'analyses actifs
- état des logs d'audit
- récupération du taux SARON
- logs filtrables
- criticité des logs : info, warning, critical
- export de sauvegarde JSON/CSV
- rapport PDF de supervision
- corbeille/restauration des biens et analyses

## Contrôles quotidiens

- Vérifier les utilisateurs en attente de rôle.
- Consulter les logs de connexion et d'export.
- Vérifier les erreurs éventuelles sur les Edge Functions.
- Contrôler que le taux SARON se récupère correctement.
- Vérifier la corbeille avant suppression définitive hors application.

## Contrôles avant livraison

```powershell
npm run lint
npm run build
```

Points fonctionnels :

- connexion admin
- connexion utilisateur standard
- création/modification de bien
- import Excel analyse
- export PDF bien/analyse/comparaison
- commentaires
- corbeille/restauration
- logs admin
- supervision technique

## Rollback

Si un déploiement Vercel pose problème :

1. Aller dans Vercel > Deployments.
2. Sélectionner le dernier déploiement stable.
3. Cliquer sur "Promote to Production".
4. Vérifier la connexion, l'admin et une fiche bien.

## Maintenance Supabase

Les migrations peuvent être appliquées via SQL Editor si le CLI est bloqué par l'historique de versions.

Toujours vérifier :

- colonnes nécessaires présentes
- RLS active
- policies cohérentes
- secrets Edge Functions configurés
