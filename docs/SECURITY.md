# Sécurité et Contrôle d'Accès

## Principes

- Aucun secret sensible dans le frontend.
- Variables `VITE_` limitées aux informations publiques nécessaires au frontend.
- Tokens privés stockés dans Supabase Secrets.
- Accès applicatif contrôlé par `user_permissions`.
- RLS Supabase activée sur les tables principales.

## Authentification

Supabase Auth gère les comptes. À l'inscription, l'utilisateur obtient le rôle `en_attente`, sans permission applicative.

Activation :

1. L'utilisateur crée son compte.
2. Il voit l'écran d'attente.
3. Un admin lui attribue un rôle.
4. L'utilisateur recharge la page.

## Rôles

- `en_attente`: aucun accès métier.
- `membre`: lecture limitée.
- `staff`: contribution sans suppression critique.
- `direction`: accès métier complet.
- `admin`: supervision et gestion des utilisateurs.

## Journalisation

Actions journalisées :

- connexion
- déconnexion
- accès refusé
- export PDF
- export sauvegarde
- rapport supervision
- création/modification de bien
- création/modification d'analyse
- suppression logique
- restauration

Criticité :

- `info` : événements standards.
- `warning` : action sensible, export sauvegarde, suppression/restauration.
- `critical` : accès refusé ou événement sécurité.

## Suppression

Les biens et analyses utilisent une suppression logique :

- `deleted_at`
- `deleted_by_id`

Les données sont masquées dans l'application mais restaurables depuis l'administration.

## Risques et parades

- Compte sans rôle : bloqué par défaut.
- Suppression accidentelle : corbeille.
- Fuite de secret : pas de secret dans le frontend.
- Erreur d'accès : RLS + permissions applicatives.
- Traçabilité insuffisante : logs et historique de modifications.

## RLS renforcé

La migration `20260703_harden_rls_permissions.sql` remplace les policies larges par des policies basées sur les permissions applicatives :

- `can_view_properties`
- `can_create_property`
- `can_edit_property`
- `can_delete_property`
- `can_create_analysis`
- `can_edit_analysis`
- `can_delete_analysis`
- `can_comment`

Les logs d'audit sont consultables uniquement par les administrateurs.
