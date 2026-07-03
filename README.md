# SIPA Analyzer

Application web de gestion, analyse et supervision de biens immobiliers pour SIPA.

## Objectif

Centraliser les biens, analyses financières, exports PDF, commentaires, favoris, traçabilité, supervision admin et contrôle des accès.

## Stack

- Frontend: React + Vite
- Backend: Supabase
- Authentification: Supabase Auth
- Base de données: PostgreSQL Supabase
- Edge Functions: IA, SARON, services externes
- Hébergement frontend: Vercel conseillé

## Documentation RNCP AIS

- [Architecture technique](docs/ARCHITECTURE.md)
- [Exploitation et supervision](docs/OPERATIONS.md)
- [Sécurité et contrôle d'accès](docs/SECURITY.md)
- [Matrice des permissions](docs/PERMISSIONS_MATRIX.md)
- [Sauvegarde et restauration](docs/BACKUP_RESTORE.md)
- [Gestion d'incident](docs/INCIDENT_RESPONSE.md)
- [Separation dev / prod](docs/ENVIRONMENTS.md)

## Commandes

```powershell
npm install
npm run lint
npm run build
```

## Variables

Voir [DEPLOYMENT.md](DEPLOYMENT.md).
