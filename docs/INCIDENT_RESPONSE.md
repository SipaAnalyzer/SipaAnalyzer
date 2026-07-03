# Gestion d'Incident

## Niveaux de gravité

| Niveau | Description | Exemple |
|---|---|---|
| P1 | Application indisponible | Frontend inaccessible, Supabase KO |
| P2 | Fonction critique bloquée | Connexion impossible, création analyse impossible |
| P3 | Donnée ou workflow dégradé | SARON indisponible, export PDF échoue |
| P4 | Anomalie mineure | Affichage, filtre, texte |

## Procédure générale

1. Identifier l'impact utilisateur.
2. Consulter Admin > Supervision.
3. Vérifier les logs filtrables.
4. Reproduire le problème avec un compte test.
5. Vérifier le dernier déploiement.
6. Décider : correction, rollback, restauration donnée.
7. Documenter l'incident.

## Incident sécurité

Actions immédiates :

- désactiver ou retirer les permissions du compte concerné
- vérifier les logs par utilisateur
- vérifier les exports PDF récents
- contrôler les modifications de biens/analyses
- changer les secrets si suspicion de fuite

## Incident données

Actions :

- vérifier la corbeille
- restaurer le bien ou l'analyse si nécessaire
- vérifier l'historique des modifications
- exporter l'état après correction

## Incident déploiement

Actions :

```powershell
npm run lint
npm run build
```

Si l'erreur vient du dernier déploiement :

1. rollback Vercel vers le dernier déploiement stable
2. vérifier Supabase
3. ouvrir une correction Git

## Modèle de compte rendu

```txt
Date/heure:
Détecté par:
Gravité:
Impact:
Cause probable:
Actions réalisées:
Résultat:
Prévention:
```
