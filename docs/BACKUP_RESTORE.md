# Sauvegarde et Restauration

## Objectif

Garantir la récupération des données en cas d'erreur humaine, incident ou besoin d'audit.

## Niveaux de restauration

### 1. Corbeille applicative

Les biens et analyses supprimés sont masqués mais conservés :

- `deleted_at`
- `deleted_by_id`

Restauration depuis Admin > Supervision > Corbeille.

### 2. Export Supabase

Depuis Supabase :

- export CSV par table
- backup PostgreSQL si disponible selon le plan
- restauration manuelle par SQL

Tables prioritaires :

- `properties`
- `analysis`
- `comments`
- `user_permissions`
- `audit_logs`

### 3. Historique Git

Le code source est versionné sur GitHub. Chaque évolution doit passer par :

```powershell
npm run lint
npm run build
git status
git add .
git commit -m "message"
git push origin main
```

## Procédure de restauration d'un bien

1. Aller dans Administration.
2. Ouvrir Supervision.
3. Trouver le bien dans la corbeille.
4. Cliquer sur Restaurer.
5. Vérifier la fiche bien et ses analyses.

## Procédure de restauration base

1. Identifier la table et la date d'incident.
2. Exporter l'état actuel avant intervention.
3. Restaurer la donnée ciblée.
4. Vérifier les relations `property_id`.
5. Consigner l'action dans un ticket ou rapport d'incident.
