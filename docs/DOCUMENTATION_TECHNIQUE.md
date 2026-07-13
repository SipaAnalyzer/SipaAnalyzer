# Documentation Technique SIPA Analyzer

> **Version :** 1.0.0  
> **Date :** Juillet 2026  
> **Contexte :** RNCP AIS  Architecture des Systèmes d'Information  
> **Auteur :** Équipe technique SIPA Analyzer  

---

## 1. Présentation générale

### 1.1 Contexte du projet

SIPA Analyzer est une application web professionnelle développée pour SIPA Immobilier SA, une régie immobilière suisse. L'application a pour objectif de fournir aux conseillers immobiliers un outil complet d'analyse financière et de gestion de biens immobiliers. Dans un marché immobilier suisse en constante évolution, les professionnels ont besoin d'outils leur permettant d'évaluer rapidement la rentabilité des biens, de comparer différentes opportunités d'investissement et de présenter des analyses chiffrées à leurs clients de manière claire et professionnelle.

Le projet est né du constat que les outils existants sur le marché étaient soit trop génériques, soit insuffisamment adaptés aux spécificités du marché immobilier suisse. En effet, le financement immobilier en Suisse présente des particularités importantes telles que le système du 2e pilier, les amortissements indirects, le taux SARON pour les hypothèques à taux variable, et une fiscalité cantonale spécifique. SIPA Analyzer intègre l'ensemble de ces particularités pour offrir un outil parfaitement adapté au contexte helvétique.

L'application a été développée avec une approche moderne, en utilisant React pour le frontend et Supabase pour le backend, garantissant ainsi une architecture scalable, sécurisée et maintenable. Le choix de Supabase comme plateforme backend permet de bénéficier d'une base de données PostgreSQL avec des fonctionnalités avancées de sécurité (Row Level Security), d'authentification intégrée et de fonctions serverless (Edge Functions) sans nécessiter de gestion d'infrastructure complexe.

### 1.2 Objectifs métier et techniques

Les objectifs métier de SIPA Analyzer sont multiples. Tout d'abord, l'application vise à accélérer le processus d'analyse financière des biens immobiliers. Là où un conseiller pouvait passer plusieurs heures à rassembler les données, effectuer les calculs et préparer une présentation, SIPA Analyzer permet de réaliser l'ensemble de ces tâches en quelques minutes. L'import de données depuis des fichiers Excel, le calcul automatique des indicateurs de rentabilité et la génération de rapports PDF contribuent à cette efficacité accrue.

Ensuite, l'application vise à standardiser les analyses au sein de l'entreprise. En utilisant des formules de calcul communes, un système de notation uniforme (S/A/B/C) et des modèles de rapports standardisés, SIPA Analyzer garantit que tous les conseillers produisent des analyses de qualité homogène. Cette standardisation est essentielle pour l'image de marque de l'entreprise et pour la confiance des clients.

Du point de vue technique, les objectifs incluent la mise en place d'une architecture robuste avec une séparation claire des responsabilités, un contrôle d'accès granulaire basé sur les rôles, une traçabilité complète des actions via un système d'audit, et une sécurisation des données au niveau de la base de données avec Row Level Security. L'application doit également être performante, avec des temps de chargement optimisés, et déployable de manière continue via Vercel.

### 1.3 Périmètre fonctionnel

Le périmètre fonctionnel de SIPA Analyzer couvre l'ensemble du cycle de vie de l'analyse immobilière, depuis la saisie des biens jusqu'à la présentation des résultats. Voici le tableau détaillé des fonctionnalités :

| Fonctionnalité | Description | Module | Priorité |
|---|---|---|---|
| Gestion des biens | CRUD complet avec géolocalisation, upload de documents | Propriétés | Critique |
| Analyse financière | Calcul automatique des rendements et scores | Analyse | Critique |
| Import Excel | Parsing intelligent des fichiers Excel SIPA | Import | Élevée |
| Notation S/A/B/C | Scoring automatique basé sur rendement et qualitatif | Analyse | Critique |
| Projection 5 ans | Projection financière sur 5 ans avec tableau | Analyse | Élevée |
| Comparateur | Comparaison multi-biens avec indicateurs | Comparateur | Moyenne |
| Cartographie | Visualisation Leaflet des biens sur carte | Propriétés | Moyenne |
| Favoris | Sauvegarde et organisation des biens favoris | Utilisateur | Faible |
| Export PDF | Génération de fiches bien, analyse et comparaison | Export | Élevée |
| Export Excel | Export des projections financières | Export | Moyenne |
| Commentaires | Traçabilité des modifications et discussions | Audit | Élevée |
| Tableau de bord | KPIs, graphiques et indicateurs de performance | Dashboard | Élevée |
| Administration | Gestion des utilisateurs, rôles et supervision | Admin | Critique |
| Panneau de supervision | Monitoring technique, logs, corbeille | Admin | Élevée |
| Authentification | Connexion, inscription, OTP, reset password | Auth | Critique |
| IA Insights | Analyse automatisée par IA des biens | Analyse | Faible |
| Panneau de traçabilité | Historique des modifications métier | Audit | Élevée |
| Chatbot | Assistant conversationnel intégré | Support | Faible |
| Thème sombre/clair | Support du mode sombre via next-themes | UI | Faible |

### 1.4 Utilisateurs cibles et cas d'usage

SIPA Analyzer s'adresse à plusieurs catégories d'utilisateurs au sein de SIPA Immobilier SA. Les conseillers immobiliers constituent le cur de la cible utilisateur : ce sont eux qui utilisent quotidiennement l'application pour analyser les biens, préparer des dossiers clients et générer des rapports. Leur cas d'usage principal consiste à importer les données d'un bien depuis un fichier Excel fourni par le service financier, à ajuster les paramètres de l'analyse, à consulter les indicateurs de rentabilité calculés automatiquement, puis à exporter le tout en PDF pour le présenter au client.

Les directeurs et responsables d'agence utilisent l'application pour superviser l'activité de leur équipe, consulter les analyses produites, et accéder au comparateur pour identifier les meilleures opportunités d'investissement. Ils ont également accès aux tableaux de bord de performance qui leur permettent de suivre l'activité globale.

Les administrateurs système sont responsables de la gestion des comptes utilisateurs, de l'attribution des rôles et permissions, de la supervision technique de l'application, et de la gestion de la corbeille. Ils utilisent le panneau d'administration pour configurer l'application et s'assurer de son bon fonctionnement.

Enfin, les clients de SIPA Immobilier SA sont des utilisateurs indirects : ils reçoivent les rapports PDF générés par l'application et peuvent, dans une version future, accéder à un portail client pour consulter les analyses qui leur sont destinées.
---

## 2. Architecture technique

### 2.1 Architecture globale

SIPA Analyzer suit une architecture moderne de type JAMstack (JavaScript, APIs, Markup) avec un frontend React déployé statiquement sur Vercel et un backend entièrement géré par Supabase. Cette architecture permet de bénéficier des avantages du déploiement statique (performance, scalabilité, simplicité) tout en conservant des fonctionnalités backend puissantes grâce aux services Supabase.

Le frontend est responsable de l'interface utilisateur, des calculs financiers côté client, de la génération des exports PDF et Excel, et de la coordination des appels API. Supabase gere l'authentification, la base de donnees avec ses regles de securite, et les fonctions serverless. Les services externes sont uniquement sollicites via les Edge Functions Supabase, garantissant ainsi que les cles API restent cote serveur et ne sont jamais exposees au client.

L'architecture suit le principe de separation des preoccupations (Separation of Concerns). Cette approche permet de maintenir un code propre, testable et evolutif. Chaque couche de l'application a une responsabilite unique et bien definie, ce qui facilite le travail d'equipe et la maintenance a long terme.

### 2.2 Architecture du frontend

Le frontend est organise selon une structure de dossiers coherente qui separe les differentes preoccupations de l'application. La structure distingue clairement les points d'entree (main.jsx, App.jsx), la couche d'acces aux donnees (api/), les composants reutilisables (components/), les hooks personnalises (hooks/), les pages (pages/), les utilitaires (utils/) et la configuration (lib/).

Le dossier api/ contient la couche d'acces aux donnees. supabaseClient.js initialise le client Supabase avec les variables d'environnement, tandis que base44Client.js est un adaptateur qui migre l'ancienne API Base44 vers Supabase tout en ajoutant des fonctionnalites d'audit automatique. Chaque operation CRUD sur les entites principales (Property, Analysis, Comment, Favorite, UserPermission) passe par cet adaptateur.

Le dossier components/ui/ contient les composants shadcn/ui generes automatiquement. Ces composants sont des primitives d'interface accessibles, basees sur Radix UI, qui assurent une experience utilisateur coherente et accessible dans toute l'application.

### 2.3 Flux de donnees

Le cycle de vie d'une requete CRUD typique suit le schema suivant. Lorsqu'un utilisateur cree un bien immobilier, le composant AddProperty.jsx soumet les donnees via l'adaptateur. L'adaptateur nettoie les donnees en supprimant les champs generes automatiquement, ajoute l'identifiant de l'utilisateur courant comme created_by_id, puis envoie la requete a Supabase. La politique RLS sur la table properties verifie que l'utilisateur a la permission et que created_by_id correspond a l'utilisateur authentifie.

Pour les mises a jour, le flux est plus complexe. Avant d'effectuer la modification, l'adaptateur recupere l'etat actuel de l'enregistrement. Apres la mise a jour reussie, il compare les champs modifies en se basant sur les definitions de AUDIT_FIELDS et genere un commentaire d'audit prefixe. Ce commentaire est insere dans la table comments et contient un payload JSON avec le type d'evenement, l'acteur, et la liste des changements avant/apres.

Le cycle de vie de l'authentification est gere via le contexte React AuthContext. Au demarrage de l'application, AuthProvider verifie l'etat de l'authentification via Supabase. Si un utilisateur est connecte, ses informations de profil sont enrichies avec les donnees de la table profiles. Un ecouteur onAuthStateChange est installe pour reagir aux evenements d'authentification.
### 2.4 Diagrammes de sequence

Voici le diagramme de sequence pour la creation d'une analyse financiere :

`
Utilisateur           Composant            Adaptateur          Supabase          AuditLogs
    |                     |                     |                 |                 |
    |  Remplit formulaire |                     |                 |                 |
    |-------------------->|                     |                 |                 |
    |                     |                     |                 |                 |
    |  Soumet analyse     |                     |                 |                 |
    |-------------------->|                     |                 |                 |
    |                     |  create(data)       |                 |                 |
    |                     |-------------------->|                 |                 |
    |                     |                     |  INSERT INTO    |                 |
    |                     |                     |  analysis       |                 |
    |                     |                     |---------------->|                 |
    |                     |                     |                 |                 |
    |                     |                     |  Retour donnees |                 |
    |                     |                     |<----------------|                 |
    |                     |                     |                 |                 |
    |                     |  Donnees normalisees|                 |                 |
    |                     |<--------------------|                 |                 |
    |                     |                     |                 |                 |
    |  Affiche resultat   |                     |                 |                 |
    |<--------------------|                     |                 |                 |
    |                     |                     |                 |                 |
`

Et le diagramme de sequence pour l'authentification :

`
Utilisateur          Login.jsx          AuthContext         SupabaseClient       Supabase
    |                    |                  |                    |                 |
    |  Saisit email/pass |                  |                    |                 |
    |------------------->|                  |                    |                 |
    |                    |  loginViaEmail   |                    |                 |
    |                    |----------------->|                    |                 |
    |                    |                  |  signInWithPassword|                 |
    |                    |                  |------------------->|                 |
    |                    |                  |                    |                 |
    |                    |                  |     Session + User |                 |
    |                    |                  |<-------------------|                 |
    |                    |                  |                    |                 |
    |                    |                  |  enrichUserProfile |                 |
    |                    |                  |------------------->|                 |
    |                    |                  |  SELECT profiles   |                 |
    |                    |                  |<-------------------|                 |
    |                    |                  |                    |                 |
    |                    |  Utilisateur +   |                    |                 |
    |                    |  profil enrichi  |                    |                 |
    |                    |<-----------------|                    |                 |
    |                    |                  |                    |                 |
    |  Redirection vers  |                  |                    |                 |
    |  Dashboard         |                  |                    |                 |
    |<-------------------|                  |                    |                 |
`

L'authentification OTP (One-Time Password) suit un flux different pour la verification par email. Apres l'inscription, un code a 6 chiffres est envoye par email. L'utilisateur saisit ce code sur la page dediee, et le verdict est effectue via supabase.auth.verifyOtp. Ce flux est utilise pour les inscriptions avec verification d'email obligatoire.

---

## 3. Stack technologique

### 3.1 Tableau complet des dependances

Voici le tableau detaille de l'ensemble des dependances du projet, avec leurs versions et leurs roles respectifs :

| Dependance | Version | Role | Categorie |
|---|---|---|---|
| React | ^18.2.0 | Bibliotheque UI principale | Framework |
| React DOM | ^18.2.0 | Rendu DOM React | Framework |
| Vite | ^6.1.0 | Bundler et serveur de dev | Build |
| React Router DOM | ^6.26.0 | Routage cote client | Routage |
| Supabase JS | ^2.107.0 | Client Supabase (Auth, DB, Functions) | Backend |
| TanStack React Query | ^5.84.1 | Gestion d'etat serveur et cache | Data |
| Tailwind CSS | ^3.4.17 | Framework CSS utilitaire | Styling |
| shadcn/ui (Radix UI) | multiple | Composants d'interface accessibles | UI |
| Lucide React | ^0.475.0 | Icones SVG | UI |
| Framer Motion | ^11.16.4 | Animations | UI |
| jsPDF | ^4.2.1 | Generation PDF cote client | Export |
| html2canvas | ^1.4.1 | Capture d'ecran pour PDF | Export |
| XLSX | ^0.18.5 | Lecture/Ecriture Excel | Import/Export |
| Zod | ^3.24.2 | Validation de schemas | Validation |
| React Hook Form | ^7.54.2 | Gestion de formulaires | Formulaires |
| React Hot Toast | ^2.6.0 | Notifications | UI |
| Sonner | ^2.0.1 | Toasts modernes | UI |
| Recharts | ^2.15.4 | Graphiques et diagrammes | Visualisation |
| Leaflet | ^1.x | Cartographie interactive | Carto |
| React Leaflet | ^4.2.1 | Integration Leaflet React | Carto |
| date-fns | ^3.6.0 | Manipulation de dates | Utils |
| Moment | ^2.30.1 | Formatage de dates | Utils |
| Three.js | ^0.171.0 | Rendu 3D (arriere-plan anime) | UI |
| Canvas Confetti | ^1.9.4 | Effets de confettis | UI |
| Stripe JS | ^5.2.0 | Paiements Stripe | Paiement |
| React Quill | ^2.0.0 | Editeur de texte riche | UI |
| React Markdown | ^9.1.0 | Rendu Markdown | UI |
| Lodash | ^4.17.21 | Utilitaires generaux | Utils |
| Tailwind Merge | ^3.0.2 | Fusion de classes Tailwind | Styling |
| TailwindCSS Animate | ^1.0.7 | Animations Tailwind | Styling |
| ESLint | ^9.19.0 | Linting JS | Qualite |
| TypeScript | ^5.8.2 | Typage statique | Qualite |
| PostCSS | ^8.5.3 | Transformations CSS | Build |
| Autoprefixer | ^10.4.20 | Prefixes CSS automatiques | Build |

### 3.2 Justification des choix technologiques

Le choix de React comme framework frontend repose sur sa maturite, son ecosysteme riche et sa grande communaute. React 18 apporte des ameliorations significatives en termes de rendu concurrent et de transitions, ce qui permet d'offrir une experience utilisateur fluide meme lors du chargement de donnees ou de la generation de PDF complexes.

Vite a ete choisi comme bundler pour sa vitesse de demarrage quasi instantanee et ses temps de rechargement rapides grace au Hot Module Replacement (HMR). Comparativement a Webpack, Vite offre des performances de build superieures, particulierement importantes pour un projet qui evolue rapidement.

Supabase est le pilier central du backend. Son choix est motive par plusieurs facteurs : la puissance de PostgreSQL avec ses fonctionnalites avancees (RLS, fonctions, indexes), l'authentification integree qui evite de developper et maintenir un systeme d'auth personnalise, les Edge Functions en Deno pour le code serveur, et le pricing predictif adapte aux applications SaaS. Supabase offre egalement un SDK JavaScript bien concu qui s'integre parfaitement avec React.

Tailwind CSS a ete prefere a des solutions comme Bootstrap ou Material UI pour sa flexibilite et son approche utility-first. Il permet de creer des interfaces personnalisees sans lutter contre les styles par defaut d'un framework CSS. La combinaison avec shadcn/ui offre des composants accessibles et bien concus tout en conservant la liberte de personnalisation de Tailwind.

TanStack React Query est un choix strategique pour la gestion des donnees cote client. Il simplifie considerablement la synchronisation avec le backend en gerant automatiquement le cache, les revalidations, les mutations et les etats de chargement. Cela reduit la quantite de code boilerplate necessaire pour chaque requete API et ameliore l'experience utilisateur avec des donnees toujours a jour.

Le choix de jsPDF combine a html2canvas pour les exports PDF permet de generer des documents cote client sans necessiter de serveur dedie. Cette approche evite les couts d'infrastructure supplementaires et offre une generation instantanee sans latence reseau. Le motif honeycomb (nid d'abeille) caracteristique des exports a ete developpe sur mesure en utilisant les capacites de dessin vectoriel de jsPDF.

---

## 4. Modele de donnees

### 4.1 Diagramme entite-relation

Le modele de donnees de SIPA Analyzer est compose de 7 tables principales, reliees entre elles par des relations definies. Voici le diagramme entite-relation au format texte :

`
+----------------------------------+
¦          profiles                ¦
¦----------------------------------¦
¦ id (PK, UUID)                   ¦
¦ full_name (text)                ¦
¦ email (text)                    ¦
¦ created_at (timestamptz)        ¦
+----------------------------------+
             ¦ 1
             ¦
             ¦ N (via created_by_id)
             ?
+----------------------------------+
¦         properties               ¦
¦----------------------------------¦
¦ id (PK, UUID)                   ¦
¦ nom_bien (text) NOT NULL        ¦?--------+
¦ adresse (text)                  ¦         ¦
¦ ville (text) NOT NULL           ¦         ¦
¦ canton (text)                   ¦         ¦
¦ pays (text, def: Suisse)        ¦         ¦
¦ annee_construction (numeric)    ¦         ¦
¦ surface (numeric)               ¦         ¦
¦ nombre_logements (numeric)      ¦         ¦
¦ image_url (text)                ¦         ¦
¦ lien_annonce (text)             ¦         ¦
¦ lien_piece_jointe (text)        ¦         ¦
¦ latitude (numeric)              ¦         ¦
¦ longitude (numeric)             ¦         ¦
¦ statut (text enum)              ¦         ¦
¦ created_by_id (UUID) -----------+         ¦
¦ created_at (timestamptz)                  ¦
¦ updated_at (timestamptz)                  ¦
¦ deleted_at (timestamptz)                  ¦
¦ deleted_by_id (UUID)                      ¦
+------------------------------------------+
      1 ¦                                  ¦
        ¦ N (via property_id)              ¦ N (via fk,property_id)
        ?                                  ?
+----------------------+   +--------------------------+
¦      analysis         ¦   ¦       comments            ¦
¦-----------------------¦   ¦--------------------------¦
¦ id (PK, UUID)        ¦   ¦ id (PK, UUID)            ¦
¦ property_id (FK) ----¦--?¦ property_id (FK) --------¦--?
¦ ... (champs calculs) ¦   ¦ commentaire (text)       ¦
¦ note (text)          ¦   ¦ author_name (text)       ¦
¦ statut (text enum)   ¦   ¦ created_by_id (UUID)     ¦
¦ sipa_data (jsonb)    ¦   ¦ created_at (timestamptz) ¦
¦ notes (text)         ¦   ¦ updated_at (timestamptz) ¦
¦ created_by_id (UUID) ¦   +--------------------------+
¦ created_at           ¦
¦ deleted_at           ¦   +--------------------------+
¦ deleted_by_id        ¦   ¦       favorites           ¦
+----------------------+   ¦--------------------------¦
                            ¦ id (PK, UUID)            ¦
+----------------------+   ¦ property_id (FK) --------¦--? properties
¦   user_permissions    ¦   ¦ user_id (UUID)           ¦
¦-----------------------¦   ¦ created_at (timestamptz) ¦
¦ id (PK, UUID)        ¦   +--------------------------+
¦ user_id (UUID)       ¦
¦ role (text)          ¦   +--------------------------+
¦ is_admin (boolean)   ¦   ¦      audit_logs           ¦
¦ can_view_properties  ¦   ¦--------------------------¦
¦ can_create_property  ¦   ¦ id (PK, UUID)            ¦
¦ can_edit_property    ¦   ¦ event_type (text)        ¦
¦ can_delete_property  ¦   ¦ actor_id (UUID)          ¦
¦ can_create_analysis  ¦   ¦ actor_email (text)       ¦
¦ can_edit_analysis    ¦   ¦ actor_name (text)        ¦
¦ can_delete_analysis  ¦   ¦ target_type (text)       ¦
¦ can_view_comparator  ¦   ¦ target_id (text)         ¦
¦ can_view_presentation¦   ¦ target_label (text)      ¦
¦ can_comment          ¦   ¦ severity (text)          ¦
¦ created_at           ¦   ¦ metadata (jsonb)         ¦
+----------------------+   ¦ created_at (timestamptz) ¦
                            +--------------------------+
`

### 4.2 Description detaillee des tables

**Table profiles**

La table profiles est une table systeme creee et maintenue par Supabase. Elle contient les metadonnees de base des utilisateurs authentifies. Lors de l'inscription, un trigger automatique cree un enregistrement dans cette table avec l'identifiant unique, l'email et le nom complet de l'utilisateur. Cette table est liee a la table user_permissions par l'user_id pour determiner les droits d'acces.

Colonnes : id (UUID, cle primaire), full_name (text), email (text), created_at (timestamptz avec defaut now()). La colonne id correspond au meme identifiant que celui utilise dans auth.users de Supabase, assurant ainsi la coherence entre l'authentification et les donnees applicatives.

**Table properties**

La table properties stocke l'ensemble des biens immobiliers geres dans l'application. Chaque bien possede des informations descriptives (nom, adresse, ville, canton, pays), des caracteristiques physiques (annee de construction, surface, nombre de logements), des donnees de geolocalisation (latitude, longitude), et des liens vers des ressources externes (image, annonce, piece jointe).

Colonnes principales : id (UUID, PK, defaut gen_random_uuid()), nom_bien (text, NOT NULL), adresse (text), ville (text, NOT NULL), canton (text), pays (text, defaut 'Suisse'), annee_construction (numeric), surface (numeric), nombre_logements (numeric), image_url (text), lien_annonce (text), lien_piece_jointe (text), latitude (numeric), longitude (numeric), statut (text, enum: brouillon/en_cours/valide/abandonne, defaut 'brouillon'), created_by_id (UUID, FK vers profiles), created_at (timestamptz, defaut now()), updated_at (timestamptz), deleted_at (timestamptz), deleted_by_id (UUID).

La suppression logique via deleted_at et deleted_by_id permet de conserver les donnees en corbeille sans les perdre definitivement. Les politiques RLS filtrent automatiquement les enregistrements supprimes dans les requetes standard, tandis que les administrateurs peuvent consulter et restaurer la corbeille.

**Table analysis**

La table analysis contient les analyses financieres liees aux biens immobiliers. Chaque bien peut avoir plusieurs analyses (historique), mais une seule analyse est consideree comme active a un moment donne. Les colonnes de cette table sont nombreuses car elles stockent a la fois les parametres d'entree (prix du bien, revenus locatifs, frais, etc.) et les resultats calcules (rendement brut, rendement net, score, note).

Colonnes d'entree : property_id (UUID, FK vers properties, NOT NULL), prix_bien (numeric, NOT NULL), versement_initial (numeric, defaut 0), amortissement_5_ans (numeric, defaut 0), honoraires_sipa (numeric, defaut 0), frais_dossier_bancaire (numeric, defaut 0), fonds_propres (numeric, NOT NULL), hypotheque (numeric), revenus_locatifs (numeric, NOT NULL), charges_operationnelles (numeric, defaut 0), interets_hypothecaires (numeric, defaut 0), gestion (numeric, defaut 0), impot (numeric, defaut 0).

Colonnes de resultat : prix_total (numeric, calcule), rendement_brut (numeric), revenu_net (numeric), rendement_net_fonds_propres (numeric), revenu_distribue (numeric), revenu_distribue_fonds_propres (numeric), score_global (numeric), note (text, enum: S/A/B/C).

Colonnes qualitatives : etat_batiment (text, enum: Excellent/Tres bon/Bon/Moyen/Mauvais), emplacement_bien (text, meme enum), sipa_data (jsonb, stocke les donnees additionnelles importees depuis Excel), notes (text, informations complementaires libres).

Colonnes de suivi : statut (text, enum: brouillon/en_cours/valide/abandonne, defaut 'en_cours'), created_by_id (UUID), created_at (timestamptz), updated_at (timestamptz), deleted_at (timestamptz), deleted_by_id (UUID).

**Table comments**

La table comments sert a la fois pour les commentaires utilisateur et pour la tracabilite des modifications metier. Lorsqu'une analyse ou un bien est modifie, un commentaire technique prefixe par \"__audit__\" est insere automatiquement avec un payload JSON contenant le detail des changements. Cette approche permet de centraliser l'historique sans creer de table dediee supplementaire.

Colonnes : id (UUID, PK), property_id (UUID, FK vers properties), commentaire (text), author_name (text), created_by_id (UUID), created_at (timestamptz), updated_at (timestamptz).

**Table favorites**

La table favorites permet aux utilisateurs de marquer des biens comme favoris pour y acceder rapidement. Chaque favori est unique par combinaison utilisateur/bien.

Colonnes : id (UUID, PK), property_id (UUID, FK vers properties), user_id (UUID), created_at (timestamptz, defaut now()).

**Table user_permissions**

La table user_permissions est le cur du systeme de controle d'acces. Elle definit le role et les permissions granulaires de chaque utilisateur. Le role principal (en_attente, membre, staff, direction, admin, super_admin) determine un niveau d'acces de base, tandis que les colonnes booleennes individuelles permettent un controle plus fin.

Colonnes de role : id (UUID, PK), user_id (UUID, unique), role (text, enum des roles), is_admin (boolean).

Permissions booleennes : can_view_properties, can_create_property, can_edit_property, can_delete_property, can_create_analysis, can_edit_analysis, can_delete_analysis, can_view_comparator, can_view_presentation, can_comment.

Colonne de suivi : created_at (timestamptz).

**Table audit_logs**

La table audit_logs journalise l'ensemble des evenements importants de l'application pour des raisons de securite et de tracabilite. Chaque entre mentionne le type d'evenement, l'acteur (avec email et nom), la cible (type, id, label), la severite et des metadonnees supplementaires au format JSON.

Colonnes : id (UUID, PK, defaut gen_random_uuid()), event_type (text, NOT NULL), actor_id (uuid), actor_email (text), actor_name (text), target_type (text), target_id (text), target_label (text), severity (text, defaut 'info'), metadata (jsonb, defaut '{}'::jsonb), created_at (timestamptz, defaut now()).

### 4.3 Indexation et performance

Les indexes suivants ont ete crees pour optimiser les performances des requetes les plus frequentes :

- idx_audit_logs_severity sur public.audit_logs(severity) : permet de filtrer rapidement les logs par niveau de criticite, utilise dans le panneau de supervision pour afficher les evenements critiques.
- idx_properties_deleted_at sur public.properties(deleted_at) : optimise le filtrage des biens non-supprimes (WHERE deleted_at IS NULL), operation effectuee dans la quasi-totalite des requetes.
- idx_analysis_deleted_at sur public.analysis(deleted_at) : meme objectif pour la table analysis.

Les cles primaires UUID sont automatiquement indexees par PostgreSQL. Les foreign keys (property_id, created_by_id, user_id) beneficient egalement d'index implicites crees par le moteur pour les operations de jointure.

### 4.4 Migrations SQL

Le projet comprend 17 migrations SQL qui retracent l'evolution du schema de donnees. Voici leur description detaillee :

1. **20260622_remove_default_member_role.sql** : Supprime l'attribution automatique du role 'membre' a la creation d'un utilisateur, afin que tout nouvel inscrit soit en attente jusqu'a l'activation par un admin.
2. **20260622_force_no_default_user_role.sql** : Renforce la suppression du role par defaut en modifiant les triggers et les politiques d'insertion dans user_permissions.
3. **20260622_default_pending_role.sql** : Configure le role 'en_attente' comme role par defaut pour les nouveaux utilisateurs, avec un verrouillage de toutes les permissions.
4. **20260622_allow_pending_role.sql** : Ajoute le support du role 'en_attente' dans les fonctions de controle d'acces et les politiques RLS, permettant aux utilisateurs non-actives de se connecter mais pas d'acceder aux donnees.
5. **20260622_add_new_fields.sql** : Ajoute les colonnes pour les champs banque A et banque B dans la table analysis (taux, type de taux, marge SARON, amortissement annuel, evaluation).
6. **20260625_create_audit_logs.sql** : Cree la table audit_logs avec sa structure initiale (id, event_type, actor_id, actor_email, actor_name, target_type, target_id, target_label, metadata, created_at). Configure RLS avec des politiques larges pour tous les utilisateurs authentifies.
7. **20260626_enable_rls_core_tables.sql** : Active RLS sur les tables properties, analysis, comments et favorites. Ajoute les colonnes created_by_id, created_at, updated_at. Cree la fonction is_admin_or_direction() et les premieres politiques RLS basees sur l'appartenance.
8. **20260626_rls_user_permissions.sql** : Configure RLS sur user_permissions avec des politiques fines. Cree les fonctions is_admin_or_direction(), role_level(), is_super_admin(), is_admin_or_super_admin(), can_manage_role(). Les politiques empechent les utilisateurs de modifier leur propre role ou d'attribuer des roles superieurs au leur.
9. **20260626_add_frais_dossier_bancaire.sql** : Ajoute la colonne frais_dossier_bancaire a la table analysis pour un calcul plus precis du cout total d'acquisition.
10. **20260626_invitation_tokens.sql** : Cree la table invitation_tokens pour gerer les invitations par email, avec un systeme de tokens a expiration.
11. **20260629_add_soft_delete_fields.sql** : Ajoute les colonnes deleted_at et deleted_by_id aux tables properties et analysis pour implementer la suppression logique.
12. **20260629_add_variable_mortgage_rate_fields.sql** : Ajoute les colonnes pour le taux hypothecaire variable (banque_a_type_taux, banque_a_marge_saron, banque_b_type_taux, banque_b_marge_saron) dans la table analysis.
13. **20260629_add_sipa_data_to_analysis.sql** : Ajoute la colonne sipa_data (jsonb) a la table analysis pour stocker les donnees structurees importees depuis les fichiers Excel SIPA.
14. **20260629_add_notes_to_analysis.sql** : Ajoute la colonne notes (text) a la table analysis pour les informations complementaires saisies par l'utilisateur.
15. **20260629_add_excel_projection_tables.sql** : Ajoute les colonnes pour les tableaux de projection (operating_projection, capital_projection) au format jsonb dans la table analysis.
16. **20260630_add_audit_log_severity.sql** : Ajoute la colonne severity a la table audit_logs avec des valeurs par defaut, et cree l'index idx_audit_logs_severity pour le filtrage.
17. **20260703_harden_rls_permissions.sql** : Migration majeure de durcissement de securite. Cree la fonction centralisee has_permission(), remplace les politiques RLS larges par des politiques fines basees sur les permissions granulaires, et verrouille la consultation des logs d'audit aux seuls administrateurs.

---

## 5. Authentification

### 5.1 Fonctionnement detaille du flux d'authentification

SIPA Analyzer utilise le systeme d'authentification integre de Supabase, qui repose sur GoTrue, un serveur d'authentification base sur le standard JWT (JSON Web Tokens). Le flux d'authentification commence lorsque l'utilisateur soumet ses identifiants (email et mot de passe) via le composant Login.jsx. La methode supabase.auth.signInWithPassword() est appelee, ce qui envoie les identifiants a Supabase Auth via HTTPS. Si les identifiants sont valides, Supabase retourne un objet session contenant un access_token (JWT), un refresh_token, et les informations de l'utilisateur.

Le JWT contient des claims standards (sub, exp, iat, aud) ainsi que des metadonnees utilisateur. Ce token est stocke automatiquement par le SDK Supabase dans localStorage et est inclus dans chaque requete subsequente via l'en-tete Authorization: Bearer. Le rafraichissement automatique du token est configure dans supabaseClient.js avec l'option autoRefreshToken: true, ce qui garantit que la session reste valide meme pendant de longues periodes d'utilisation.

Apres la recuperation de l'utilisateur, la fonction enrichUserWithProfile() est appelee pour enrichir les donnees de l'utilisateur avec son nom complet et son email depuis la table profiles. Cette etape est necessaire car les metadonnees de l'utilisateur dans le JWT peuvent etre incomplete selon la configuration de l'inscription.

### 5.2 Gestion des sessions et persistance

La persistance de session est configuree avec l'option persistSession: true dans le client Supabase. Cela signifie que le token JWT et le refresh token sont stockes dans le localStorage du navigateur. Lors d'une fermeture et reouverture du navigateur ou d'un rechargement de page, le client Supabase restaure automatiquement la session a partir du localStorage sans intervention utilisateur.

Le composant AuthProvider.jsx installe un ecouteur onAuthStateChange qui se declenche lors de tout changement d'etat d'authentification (connexion, deconnexion, rafraichissement de token). Cet ecouteur met a jour le contexte React, ce qui provoque le re-rendu de tous les composants qui dependent de l'etat d'authentification. Le composant ProtectedRoute.jsx utilise ce contexte pour verifier si l'utilisateur est authentifie avant d'autoriser l'acces aux routes protegees.

Pour la securite, le rafraichissement automatique du token (autoRefreshToken: true) garantit que le token JWT expire est remplace avant son expiration. Si le refresh token lui-meme expire (par defaut apres 30 jours), l'utilisateur doit se reconnecter.

### 5.3 Flux d'inscription et activation

Le flux d'inscription commence sur la page Register.jsx. L'utilisateur saisit son email et son mot de passe, puis soumet le formulaire. La methode supabase.auth.signUp() est appelee, ce qui cree un compte dans Supabase Auth et envoie un email de confirmation. Selon la configuration de Supabase, l'utilisateur peut etre automatiquement connecte (auto-confirm) ou doit verifier son email via un lien ou un code OTP.

Par defaut, SIPA Analyzer utilise le flux OTP (One-Time Password). Apres l'inscription, l'utilisateur est redirige vers une page de verification OTP ou il doit saisir le code recu par email. Ce code est verifie via supabase.auth.verifyOtp() avec le type signup. En cas de succes, la session est creee et l'utilisateur est redirige vers l'application.

Tout nouvel utilisateur inscrit obtient le role 'en_attente' dans la table user_permissions. Ce role, configur via les migrations, n'accorde aucune permission metier. L'utilisateur est donc accueilli sur un ecran d'attente (UserNotRegisteredError.jsx) l'informant qu'un administrateur doit activer son compte avant qu'il puisse utiliser l'application. Cette approche garantit qu'aucun acces non autorise n'est possible avant l'activation explicite par un admin.

L'activation du compte est effectuee par un administrateur depuis le panneau d'administration (Admin.jsx). L'admin attribue un role (membre, staff, direction) a l'utilisateur via l'interface de gestion des permissions. Cette modification dans la table user_permissions est immediatement prise en compte par le hook usePermissions, qui interroge les permissions toutes les 5 secondes (refetchInterval: 5000). L'utilisateur n'a donc pas besoin de se reconnecter ; ses permissions sont mises a jour automatiquement.

### 5.4 Reinitialisation du mot de passe

La reinitialisation du mot de passe suit un flux standard securise. Depuis la page ForgotPassword.jsx, l'utilisateur saisit son email et soumet le formulaire. La methode supabase.auth.resetPasswordForEmail() est appelee avec l'URL de redirection configurée vers /reset-password.

Supabase Auth envoie un email contenant un lien de reinitialisation avec un token integre. Lorsque l'utilisateur clique sur ce lien, il est redirige vers la page ResetPassword.jsx. Le SDK Supabase detecte automatiquement le token dans l'URL et l'utilisateur peut saisir son nouveau mot de passe. La methode supabase.auth.updateUser() est ensuite appelee pour mettre a jour le mot de passe.

La securite de ce flux repose sur le lien temporaire envoye par email, qui valide l'identite de l'utilisateur. La page de reinitialisation verifie egalement que le token est valide et n'a pas expire avant d'autoriser le changement de mot de passe.

---

## 6. Controle d'acces et permissions

### 6.1 Philosophie et architecture du controle d'acces

Le controle d'acces de SIPA Analyzer repose sur une architecture multicouche qui combine des verifications au niveau de la base de donnees (RLS PostgreSQL), des verifications au niveau applicatif (usePermissions hook), et des verifications au niveau du routage (ProtectedRoute). Cette approche en profondeur (defense in depth) garantit qu'un utilisateur ne peut jamais acceder a des ressources ou effectuer des actions pour lesquelles il n'est pas autorise, meme en cas de contournement du frontend.

La philosophie generale est celle du moindre privilege : chaque utilisateur dispose uniquement des permissions necessaires a son role. Un nouvel utilisateur commence sans aucune permission (role en_attente), et les permissions sont progressivement attribuees par un administrateur. Les roles sont hierarchiques et chaque niveau herite des permissions du niveau inferieur, avec des droits supplementaires.

### 6.2 Hierarchie des roles

Les roles sont organises selon une hierarchie stricte avec des niveaux numeriques definis dans la fonction SQL role_level() :

| Role | Niveau | Description |
|---|---|---|
| en_attente | 20 | Nouvel utilisateur en attente d'activation |
| membre | 40 | Acces en lecture aux biens et analyses |
| staff | 60 | Peut creer et modifier des biens et analyses |
| direction | 80 | Acces complet aux fonctionnalites metier, y compris suppression |
| admin | 100 | Gestion des utilisateurs, supervision et corbeille |
| super_admin | 200 | Acces systeme total (non attribue via l'interface) |

La hierarchie est implementee avec la fonction role_level(role) qui permet les comparaisons. Un utilisateur ne peut pas attribuer un role de niveau superieur ou egal au sien, ce qui empeche les eleves de privileges non autorises.

### 6.3 Matrice des permissions complete

La matrice suivante detaille les permissions accordees a chaque role :

| Permission | en_attente | membre | staff | direction | admin | super_admin |
|---|---|---|---|---|---|---|
| can_view_properties | Non | Oui | Oui | Oui | Oui | Oui |
| can_create_property | Non | Non | Oui | Oui | Oui | Oui |
| can_edit_property | Non | Non | Oui | Oui | Oui | Oui |
| can_delete_property | Non | Non | Non | Oui | Oui | Oui |
| can_create_analysis | Non | Non | Oui | Oui | Oui | Oui |
| can_edit_analysis | Non | Non | Oui | Oui | Oui | Oui |
| can_delete_analysis | Non | Non | Non | Oui | Oui | Oui |
| can_view_comparator | Non | Oui | Oui | Oui | Oui | Oui |
| can_view_presentation | Non | Oui | Oui | Oui | Oui | Oui |
| can_comment | Non | Non | Oui | Oui | Oui | Oui |
| Gestion des roles | Non | Non | Non | Non | Oui | Oui |
| Supervision | Non | Non | Non | Non | Oui | Oui |
| Restauration corbeille | Non | Non | Non | Non | Oui | Oui |
| Suppression utilisateur | Non | Non | Non | Non | Oui (niveau) | Oui |

### 6.4 Implementation RLS

La fonction centrale du systeme RLS est has_permission(permission_name text), definie dans la migration 20260703_harden_rls_permissions.sql. Cette fonction verifie si l'utilisateur courant possede une permission specifique en consultant la table user_permissions :

`sql
create or replace function public.has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as 
  select exists (
    select 1
    from public.user_permissions
    where user_id = auth.uid()
      and (
        role in ('admin', 'super_admin')
        or is_admin = true
        or case permission_name
          when 'can_view_properties' then coalesce(can_view_properties, false)
          when 'can_create_property' then coalesce(can_create_property, false)
          when 'can_edit_property' then coalesce(can_edit_property, false)
          when 'can_delete_property' then coalesce(can_delete_property, false)
          when 'can_create_analysis' then coalesce(can_create_analysis, false)
          when 'can_edit_analysis' then coalesce(can_edit_analysis, false)
          when 'can_delete_analysis' then coalesce(can_delete_analysis, false)
          when 'can_comment' then coalesce(can_comment, false)
          else false
        end
      )
  );
;
`

Cette fonction utilise security definer, ce qui signifie qu'elle s'execute avec les privileges du proprietaire de la fonction (postgres) plutot que ceux de l'utilisateur appelant. Cela permet de contourner les restrictions RLS sur la table user_permissions et de verifier les permissions meme pour les utilisateurs qui n'ont pas acces a cette table.

Les politiques RLS sur les tables metier utilisent ensuite cette fonction. Par exemple, sur la table properties :

`sql
create policy "properties_select_permitted"
  on public.properties for select
  using (public.has_permission('can_view_properties'));

create policy "properties_insert_permitted"
  on public.properties for insert
  with check (created_by_id = auth.uid() and public.has_permission('can_create_property'));

create policy "properties_update_permitted"
  on public.properties for update
  using (public.has_permission('can_edit_property'))
  with check (public.has_permission('can_edit_property'));

create policy "properties_delete_permitted"
  on public.properties for delete
  using (public.has_permission('can_delete_property'));
`

Les politiques pour les likes analysis et comments suivent la meme structure. La table favorites utilise des politiques basees sur l'appartenance (l'utilisateur ne voit que ses propres favoris), et la table audit_logs est configuree pour que seuls les administrateurs puissent consulter les logs.

### 6.5 Hook usePermissions

Le hook usePermissions est implemente dans src/hooks/usePermissions.js. Il utilise TanStack React Query pour recuperer les permissions de l'utilisateur courant depuis la table user_permissions. Le hook est appele avec une cle de requete incluant l'identifiant de l'utilisateur, ce qui garantit que les permissions sont recalculees a chaque changement d'utilisateur.

Le hook definit un objet DEFAULT_PERMISSIONS avec toutes les permissions a false, et un objet ADMIN_PERMISSIONS avec toutes les permissions a true. Ces valeurs par defaut garantissent que meme en cas d'erreur de chargement ou d'absence de donnees, l'application ne se retrouve pas dans un etat incoherent.

La fonction normalizeRole() nettoie le role en supprimant les accents, les espaces et les tirets, et en le convertissant en minuscules. Cette etape est importante car les valeurs saisies dans l'interface d'administration peuvent varier.

Le hook refetch automatiquement les permissions toutes les 5 secondes (refetchInterval: 5000) et a chaque fois que la fenetre reprend le focus (refetchOnWindowFocus: true). Cela permet une mise a jour rapide des permissions sans necessiter de rechargement de la page.

### 6.6 Guards de route

Le composant ProtectedRoute.jsx agit comme un guard de route au niveau du routage React. Il verifie que l'utilisateur est authentifie avant d'autoriser l'acces aux routes protegees via le composant Outlet de React Router. Si l'utilisateur n'est pas authentifie, il est redirige vers la page de connexion.

Le guard gere plusieurs etats :
- Chargement initial pendant la verification de l'authentification (affichage d'un spinner)
- Erreur d'authentification avec type specifique (utilisateur non inscrit, auth requise)
- Utilisateur non authentifie (redirection vers login)
- Utilisateur authentifie (rendu des routes enfants)

Les permissions applicatives, quant a elles, sont verifiees au niveau des composants via le hook usePermissions. Chaque composant qui effectue une operation sensible (creation, modification, suppression) verifie la permission correspondante avant d'afficher les boutons d'action ou de traiter la soumission du formulaire.

---

## 7. Securite et durcissement

### 7.1 Principes fondamentaux

La securite de SIPA Analyzer repose sur plusieurs principes fondamentaux. Le premier est l'absence de secrets sensibles dans le frontend. Les cles API et les secrets sont stockes dans Supabase Secrets et ne sont accessibles que depuis les Edge Functions. Les seules variables exposees au frontend sont les variables VITE_ necessaires a la connexion Supabase (URL et cle anon), qui sont des informations publiques par conception.

Le deuxieme principe est le controle d'acces multicouche. Chaque requete est verifiee au niveau de la base de donnees via les politiques RLS, puis au niveau applicatif via le hook usePermissions, et enfin au niveau de l'interface utilisateur via l'affichage conditionnel des boutons et actions. Cette defense en profondeur garantit qu'un utilisateur ne peut pas contourner les restrictions en manipulant directement l'API ou en interceptant les requetes.

Le troisieme principe est la tracabilite. Toute action sensible (connexion, deconnexion, creation, modification, suppression, export) est journalisee dans la table audit_logs avec l'identite de l'acteur, la cible de l'action, la severite et un horodatage. Cette tracabilite permet de detecter les comportements anormaux et de constituer des preuves en cas d'incident.

### 7.2 Durcissement RLS

Le durcissement des politiques RLS a ete realise en deux etapes, documentees par les migrations 20260626_enable_rls_core_tables.sql et 20260703_harden_rls_permissions.sql.

**Avant** le durcissement, les politiques RLS etaient larges et basees sur l'appartenance. Par exemple, pour la table properties :

`sql
-- Avant : tout utilisateur authentifie peut voir tous les biens
create policy "properties_select_all_authenticated"
  on public.properties for select
  using (auth.role() = 'authenticated');

-- Avant : seul le createur ou un admin/direction peut modifier
create policy "properties_update_own_or_admin"
  on public.properties for update
  using (created_by_id = auth.uid() or public.is_admin_or_direction());
`

**Apres** le durcissement, les politiques sont basees sur les permissions granulaires definies dans user_permissions :

`sql
-- Apres : seuls les utilisateurs avec can_view_properties voient les biens
create policy "properties_select_permitted"
  on public.properties for select
  using (public.has_permission('can_view_properties'));

-- Apres : verification de la permission can_edit_property
create policy "properties_update_permitted"
  on public.properties for update
  using (public.has_permission('can_edit_property'))
  with check (public.has_permission('can_edit_property'));
`

Ce durcissement apporte plusieurs ameliorations :
- Le controle n'est plus base sur l'appartenance mais sur les permissions explicites
- Les administrateurs peuvent accorder ou retoquer des permissions sans modifier la structure RLS
- La fonction has_permission() centralise la logique de verification et peut etre reutilisee dans toutes les politiques
- Les permissions des administrateurs sont heritees automatiquement (role IN ('admin', 'super_admin'))

### 7.3 Securite des Edge Functions

Les Edge Functions Supabase s'executent dans un environnement Deno securise. Chaque fonction recoit les en-tetes CORS appropries pour controler les origines autorisees. Les cles API des fournisseurs d'IA sont stockees dans Supabase Secrets et recuperees via Deno.env.get().

La fonction ai-insights illustre les bonnes pratiques de securite :

`	ypescript
// Verification de la methode HTTP
if (request.method !== "POST") {
  return jsonResponse({ error: "Methode non autorisee." }, 405);
}

// Recuperation de la cle API depuis les secrets (pas dans le code)
const apiKey = Deno.env.get(cfg.apiKeyEnv);
if (!apiKey) {
  return jsonResponse(
    { error: " est manquant dans les secrets Supabase." },
    500
  );
}

// Transmission securisee de la cle au fournisseur d'IA
const response = await fetch(cfg.url, {
  headers: {
    Authorization: "Bearer ",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ model, messages }),
});
`

La fonction delete-user implemente des verifications supplementaires pour empecher les abus :

`	ypescript
// Verification du niveau de permission
const callerLevel = ROLE_LEVEL[callerPerm?.role];
if (!callerLevel || callerLevel < 100) {
  return jsonResponse({ error: "Seuls les administrateurs peuvent supprimer des utilisateurs." }, 403);
}

// Verification que la cible n'a pas un role superieur ou egal
const targetLevel = ROLE_LEVEL[targetPerm?.role] ?? 0;
if (targetLevel >= callerLevel) {
  return jsonResponse({ error: "Impossible de supprimer un utilisateur avec un role egal ou superieur au votre." }, 403);
}
`

Ces verifications empechent un administrateur de supprimer un autre administrateur ou un super_admin, et garantissent que seuls les utilisateurs autorises peuvent effectuer des actions sensibles.

### 7.4 Protection des routes

La protection des routes est assuree par deux mecanismes complementaires : le guard de route React (ProtectedRoute.jsx) qui empeche l'acces aux pages sans authentification, et le hook usePermissions qui controle l'affichage et l'activation des actions selon les permissions.

Au niveau de l'interface, les boutons d'action sont conditionneles par les permissions. Par exemple, le bouton de modification d'un bien n'est affiche que si l'utilisateur a la permission can_edit_property. De meme, le bouton de suppression n'est affiche que pour les utilisateurs ayant la permission can_delete_property.

Cette approche garantit que meme si un utilisateur tente d'acceder directement a une URL protegee (par exemple /admin sans etre administrateur), le composant ProtectedRoute le redirigera vers la page de connexion ou la page d'attente selon son etat d'authentification.

### 7.5 Recommandations production

Pour la mise en production, plusieurs recommandations de securite doivent etre appliquees :

1. Activer la verification email obligatoire dans Supabase Auth pour empecher les inscriptions avec des emails invalides.
2. Configurer des limites de taux (rate limiting) sur les endpoints d'authentification pour prevenir les attaques par force brute.
3. Activer le chiffrement au repos et en transit (deja configure par defaut avec Supabase).
4. Configurer des alertes de securite sur les evenements inhabituels (tentatives de connexion echouees, acces refuses).
5. Realiser des audits de securite reguliers, notamment la revue des comptes administrateur.
6. Maintenir les dependances a jour pour beneficier des correctifs de securite.
7. Utiliser un outil de scan de vulnerabilites (comme Snyk ou npm audit) dans le pipeline CI/CD.
8. Configurer les en-tetes HTTP de securite (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options) dans la configuration Vercel.

---

## 8. Journalisation et tracabilite

### 8.1 Types d'evenements journalises

Le systeme de journalisation de SIPA Analyzer couvre l'ensemble des actions importantes effectuees dans l'application. Les types d'evenements suivants sont journalises dans la table audit_logs :

- **login** : Connexion reussie d'un utilisateur
- **logout** : Deconnexion d'un utilisateur
- **export_pdf** : Generation d'un document PDF
- **export_pdf** avec export_kind = 'fiche_bien' : Export de fiche bien
- **export_pdf** avec export_kind = 'fiche_analyse' : Export de fiche analyse
- **export_pdf** avec export_kind = 'comparaison' : Export de comparaison
- **backup_export** : Export de sauvegarde (JSON ou CSV)
- **supervision_report_export** : Generation d'un rapport de supervision
- **property_soft_deleted** : Suppression logique d'un bien
- **analysis_soft_deleted** : Suppression logique d'une analyse
- **property_restored** : Restauration d'un bien depuis la corbeille
- **analysis_restored** : Restauration d'une analyse depuis la corbeille
- **property_hard_deleted** : Suppression definitive d'un bien
- **analysis_hard_deleted** : Suppression definitive d'une analyse

En plus des logs d'audit, les modifications apportees aux biens et aux analyses sont tracees sous forme de commentaires techniques prefixes par \"__audit__\" dans la table comments. Ces traces contiennent le detail des changements (avant/apres) pour chaque champ modifie.

### 8.2 Niveaux de criticite

Chaque evenement journalise possede un niveau de criticite (severity) qui permet de filtrer et de prioriser les evenements :

- **info** : Evenements standards (connexion, deconnexion, exports PDF, rapports). Ces evenements sont purement informatifs et ne necessitent aucune action.
- **warning** : Actions sensibles (exports de sauvegarde, suppression logique, restauration). Ces evenements doivent etre surveilles mais ne sont pas urgents.
- **critical** : Evenements de securite (acces refuses, tentatives d'elevation de privileges). Ces evenements necessitent une investigation immediate.

Le niveau de criticite est stocke dans la colonne severity de la table audit_logs et est indexe (idx_audit_logs_severity) pour permettre des requetes rapides de filtrage.

### 8.3 Mecanisme d'audit

Le mecanisme d'audit est implemente dans src/utils/auditLogs.js par la fonction recordAuditLog(). Cette fonction construit un payload structure avec l'identite de l'acteur, la cible de l'action, la severite et les metadonnees, puis tente d'inserer ce payload dans la table audit_logs. Si l'insertion echoue a cause d'une colonne manquante (cas des migrations incrementales), un mecanisme de fallback retire la colonne problematique et reessaie.

En cas d'echec persistant (table audit_logs inexistante), les logs sont stockes localement dans le localStorage du navigateur sous la cle 'sipa_audit_logs_fallback'. Un maximum de 250 entrees est conserve pour eviter de saturer le stockage local. Cette approche garantit que les logs ne sont jamais perdus, meme en cas d'indisponibilite de la base de donnees.

La fonction listAuditLogs() tente de recuperer les logs depuis la base de donnees. Si la table n'existe pas, elle retourne les logs stockes localement. Cette approche permet de developper et tester l'application sans que la table audit_logs soit necessairement disponible, tout en assurant la continuite du service.

### 8.4 Tracabilite des modifications metier

La tracabilite des modifications metier est implementee directement dans l'adaptateur base44Client.js. Lorsqu'une propriete ou une analyse est modifiee, la fonction recordAuditChanges() est appelee automatiquement. Cette fonction compare les valeurs avant et apres la modification, genere une liste de changements structures (label, before, after), et insere un commentaire d'audit dans la table comments.

Les champs surveilles sont definis dans AUDIT_FIELDS, un objet qui associe chaque champ metier a un libelle lisible en francais. Par exemple, pour les proprietes : nom_bien -> Nom du bien, adresse -> Adresse, ville -> Ville, etc. Pour les analyses : prix_bien -> Prix du bien, revenus_locatifs -> Revenus locatifs, etc.

Le commentaire d'audit est prefixe par le token __audit__ pour le distinguer des commentaires utilisateur. Le composant TraceabilityPanel.jsx parse ces commentaires et affiche un historique lisible des modifications.

### 8.5 Consultation et filtrage

Le panneau de tracabilite (TraceabilityPanel.jsx) permet de consulter l'historique des modifications pour un bien ou une analyse donnee. Il parse les commentaires d'audit pour extraire les changements structures et les affiche sous forme de timeline avec les informations suivantes :

- Type d'evenement (modification de bien, d'analyse, commentaire)
- Auteur de la modification
- Date et heure
- Resumé des changements (4 premiers changements maximum)
- Option d'expansion pour voir le detail complet (avant/apres)

Les logs de securite sont consultables depuis le panneau d'administration, qui permet de filtrer par type d'evenement, par utilisateur, par severite, et par periode. Le panneau de supervision admin offre une vue synthetique avec les dernieres actions et la possibilite d'exporter les logs en CSV ou JSON.


---

## 9. Moteur de calcul financier

### 9.1 Presentation detaillee

Le moteur de calcul financier est le cur de SIPA Analyzer. Il est implemente dans src/utils/calculations.js et contient toutes les formules necessaires a l'analyse de rentabilite immobiliere. Le moteur prend en entree les parametres saisis par l'utilisateur (prix du bien, revenus locatifs, frais, etc.) et calcule automatiquement les indicateurs de performance.

L'analyse financiere immobiliere en Suisse presente des particularites que le moteur prend en compte. Le calcul du prix total d'acquisition inclut non seulement le prix du bien, mais aussi le versement initial sur le compte de la copropriete, l'amortissement sur 5 ans, les honoraires de la regie SIPA et les frais de dossier bancaire. Cette vision complete du cout d'acquisition est essentielle pour evaluer correctement la rentabilite d'un investissement.

Les formules utilisees sont conformes aux standards de l'analyse immobiliere professionnelle et ont ete validees par les experts financiers de SIPA Immobilier SA. Elles couvrent le rendement brut, le rendement net sur fonds propres, le revenu distribue, le scoring S/A/B/C, et le calcul du taux hypothecaire par dichotomie.

### 9.2 Formules de calcul

Voici les formules implementees dans le moteur :

**Prix total d'acquisition :**
Prix total = Prix du bien + Versement initial + Amortissement 5 ans + Honoraires SIPA + Frais de dossier bancaire

**Revenu net avant impot :**
Revenu net = Revenus locatifs - Charges operationnelles - Interets hypothecaires - Frais de gestion

**Impot calcule :**
Impot = Valeur saisie (pas de calcul automatique, car l'impot depend de la situation fiscale de l'investisseur)

**Revenu distribue :**
Revenu distribue = Revenu net - Impot

**Rendement brut :**
Rendement brut = (Revenus locatifs / Prix du bien) x 100

**Rendement net sur fonds propres :**
Rendement net / FP = (Revenu net / Fonds propres) x 100

**Revenu distribue sur fonds propres :**
Revenu distribue / FP = (Revenu distribue / Fonds propres) x 100

Ces formules sont implementees dans la fonction calculateAnalysis() qui retourne un objet contenant tous les indicateurs calcules. La fonction normalizeAnalysis() etend les donnees de l'analyse avec ces resultats calcules, et normalizeAnalyses() applique cette transformation a un tableau d'analyses.

### 9.3 Algorithme de scoring S/A/B/C

Le systeme de notation S/A/B/C est un element cle de SIPA Analyzer. Il permet de synthetiser la qualite d'un investissement immobilier en une note unique, facilitant ainsi la comparaison entre differents biens.

L'algorithme de scoring se deroule en deux etapes :

**Etape 1 : Note de base basee sur le rendement brut**

La fonction getBaseNote() attribue une note initiale en fonction du rendement brut :

- Rendement brut >= 5% : Note S (Superieur)
- Rendement brut >= 4% : Note A (Excellent)
- Rendement brut >= 3.5% : Note B (Bon)
- Rendement brut < 3.5% : Note C (Standard)

Ces seuils ont ete definis par les experts de SIPA Immobilier SA en fonction des standards du marche immobilier suisse.

**Etape 2 : Ajustement qualitatif**

La fonction adjustNote() ajuste la note de base en fonction de criteres qualitatifs :

- Emplacement du bien (Excellent, Tres bon, Bon, Moyen, Mauvais)
- Etat du batiment (Excellent, Tres bon, Bon, Moyen, Mauvais)

Chaque critere Excellent ou Tres bon ajoute un bonus de +1. Chaque critere Mauvais applique un malus de -1. Le bonus total est limite a -1, 0 ou +1 pour eviter des ajustements trop importants. La note finale est derivee en deplacant la note de base dans la liste ordonnee [C, B, A, S] du nombre de pas correspondant au bonus.

**Score numerique :**

Pour les affichages graphiques et les exports, la note S/A/B/C est convertie en score numerique :

- S = 95 points
- A = 82 points
- B = 67 points
- C = 50 points

Ces scores sont utilises dans les jauges de performance, les graphiques et les exports PDF.

### 9.4 Calcul du taux par dichotomie

La fonction solveRateFromAmort() implemente un algorithme de dichotomie (recherche binaire) pour determiner le taux hypothecaire a partir du montant d'amortissement annuel. Cet algorithme est utilise lorsque l'utilisateur saisit le montant d'amortissement annuel mais ne connait pas le taux hypothecaire correspondant.

L'algorithme fonctionne comme suit :

1. Definir une plage de recherche initiale (lo = 0.005%, hi = 15%)
2. Calculer le montant d'amortissement cible : target = amortissement / montant du pret
3. Pour chaque iteration (maximum 100) :
   a. Calculer le point milieu : mid = (lo + hi) / 2
   b. Calculer l'amortissement theorique avec la formule de remboursement constant : f(mid) = mid / (1 - (1 + mid)^(-n))
   c. Si f(mid) > target, le taux est trop eleve, reduire hi = mid
   d. Sinon, le taux est trop bas, augmenter lo = mid
4. Apres convergence, le taux est la moyenne de lo et hi

La formule de remboursement constant utilisee est la formule standard des prets amortissables :
Paiement = Capital x Taux x (1 + Taux)^n / ((1 + Taux)^n - 1)

L'algorithme verifie egalement que le montant d'amortissement calcule correspond bien au montant saisi par l'utilisateur, avec un arrondi a l'unite pres. Si ce n'est pas le cas, la fonction retourne null (pas de solution trouvee).

### 9.5 Projection 5 ans

La projection sur 5 ans est un outil de visualisation qui permet a l'utilisateur de simuler l'evolution financiere de son investissement sur une periode de 5 annees. La projection est organisee en deux tableaux :

**Tableau d'exploitation (operating projection) :** Il montre l'evolution annuelle des revenus et des couts sur 5 ans : revenus locatifs, couts operationnels, interets hypothecaires, EBT, impot et dividende. Chaque annee, les valeurs peuvent varier en fonction des hypotheses de croissance ou de remboursement du pret.

**Tableau de capital (capital projection) :** Il montre l'evolution du bilan sur 5 ans : amortissement de la dette, encours de la dette, valeur du bien, cash-flow accumule et rendement du dividende. Le tableau inclut egalement les hypotheses de sortie (prix de vente, dette de sortie, net, IRR).

Les donnees de projection sont importees depuis les fichiers Excel SIPA via la fonction extractProjectionTables() dans excelImport.js. Les tableaux sont stockes au format JSON dans les colonnes operating_projection et capital_projection de la table analysis.

---

## 10. Exports PDF et Excel

### 10.1 Architecture jsPDF + html2canvas

Le systeme d'export PDF de SIPA Analyzer est entierement cote client et utilise deux bibliotheques complementaires : jsPDF pour la generation du document PDF et html2canvas pour la capture d'elements HTML. L'architecture a ete concue pour etre entierement autonome, sans necessiter de serveur de generation de PDF.

jsPDF est utilise pour le rendu vectoriel du document : textes, lignes, rectangles et le motif honeycomb caracteristique. Tous les elements sont dessines en coordonnees millimetriques sur un format A4 (210 x 297 mm). Le rendu vectoriel garantit une qualite d'impression optimale, independamment de la resolution de l'ecran.

Le systeme de coordonnees est gere par un objet state qui suit la position verticale courante (y). Les fonctions ensureSpace() verifient si l'espace restant sur la page est suffisant avant d'ajouter du contenu, et creent automatiquement une nouvelle page avec le fond honeycomb si necessaire. Ce systeme garantit que les documents sont correctement pagines, meme avec de grandes quantites de donnees.

### 10.2 Motif honeycomb

Le motif honeycomb (nid d'abeille) est un element visuel distinctif des exports PDF de SIPA Analyzer. Il est dessine integralement en vectoriel par la fonction drawHoneycombBackground(). L'algorithme calcule une grille de cercles hexagonaux qui couvre toute la page :

`javascript
function drawHoneycombBackground(doc) {
  const r = 35;          // Rayon de chaque hexagone
  const spacingX = r * Math.sqrt(3);  // Espacement horizontal
  const spacingY = r * 1.5;           // Espacement vertical
  const cols = Math.ceil(PAGE.width / spacingX) + 1;
  const rows = Math.ceil(PAGE.height / spacingY) + 1;

  doc.setDrawColor(165, 214, 58);  // Vert SIPA
  doc.setLineWidth(0.3);

  for (let row = 0; row < rows; row++) {
    const offsetX = row % 2 === 0 ? 0 : spacingX / 2;
    for (let col = 0; col < cols; col++) {
      const cx = col * spacingX + offsetX;
      const cy = row * spacingY + r;
      // Dessiner les 6 cotes de l'hexagone
      let px = null, py = null;
      for (let i = 0; i <= 6; i++) {
        const angle = (Math.PI / 3) * (i % 6) - Math.PI / 6;
        const nx = cx + r * Math.cos(angle);
        const ny = cy + r * Math.sin(angle);
        if (px != null) doc.line(px, py, nx, ny);
        px = nx; py = ny;
      }
    }
  }
}
`

Le motif est dessine en vert SIPA (165, 214, 58) avec un trace leger (0.3 mm). Le fond semi-transparent du contenu (background blanc) est ensuite superpose au motif pour garantir la lisibilite du texte.

### 10.3 Types de documents exportables

**Fiche bien (exportPropertyPdf) :** Ce document presente les informations detaillees d'un bien immobilier : nom, statut, adresse, ville, canton, pays, annee de construction, surface, nombre de logements et coordonnees geographiques. Si une analyse est disponible, les indicateurs financiers sont egalement affiches. Un historique des analyses est presente sous forme de tableau recapitulatif.

**Fiche analyse (exportAnalysisPdf) :** Ce document se concentre sur l'analyse financiere d'un bien. Il inclut les informations du bien, la synthese financiere detaillee (prix total, revenus, rendements, scores) et les scenarios bancaires (Banque A et Banque B avec leurs taux, amortissements et evaluations respectifs). L'utilisateur peut choisir les sections a inclure via le parametre sections.

**Comparaison (exportComparisonPdf) :** Ce document compare plusieurs biens cote a cote. Il affiche un tableau comparatif avec les indicateurs cles (prix total, score, rendement net/FP) pour chaque bien, suivi d'un tableau detaille avec l'ensemble des indicateurs financiers. Ce document est particulierement utile pour les presentations clients et les reunions d'investissement.

### 10.4 Tracabilite des exports

Chaque export PDF est trace dans les logs d'audit via la fonction recordAuditLog(), appelee par finalizeDoc(). Les informations suivantes sont enregistrees :

- Type d'evenement : export_pdf
- Type de cible : property, analysis ou comparison
- Identifiant de la cible
- Libelle de la cible (nom du bien)
- Metadonnees : export_kind, nom du fichier genere

Cette tracabilite permet de savoir qui a exporte quel document et a quel moment, ce qui est essentiel pour la securite et la conformite.

### 10.5 Export Excel

L'export Excel est gere par les composants ExcelProjectionTables.jsx et s'appuie sur la bibliotheque xlsx pour la generation de fichiers Excel. Les tableaux de projection (operating et capital) sont exportes directement depuis les donnees JSON stockees dans la table analysis. L'import Excel, quant a lui, utilise un systeme sophistique de reconnaissance de champs base sur des alias et des motifs contextuels, permettant de parser automatiquement les fichiers Excel provenant du service financier SIPA.

---

## 11. Edge Functions

### 11.1 Architecture Deno

Les Edge Functions Supabase s'executent dans un environnement Deno, un runtime JavaScript/TypeScript securise et moderne concu par l'inventeur de Node.js. Deno offre plusieurs avantages pour les fonctions serverless : securite renforcee par un systeme de permissions explicites, support natif de TypeScript, compatibilite avec les standards web (fetch, Request, Response), et un systeme de modules bases sur les URLs.

Chaque fonction est un script TypeScript independant qui exporte un gestionnaire de requete via Deno.serve(). Le deployment est gere par Supabase CLI, qui compile et deploie les fonctions sur le reseau global Supabase. Les variables d'environnement (cles API, URLs) sont configurees via Supabase Secrets et accessibles via Deno.env.get().

### 11.2 ai-insights

La fonction ai-insights est le point d'acces aux services d'intelligence artificielle pour l'analyse automatisee des biens immobiliers. Elle supporte cinq fournisseurs d'IA differents :

- **OpenAI** (GPT-4.1 Mini) : modele par defaut, excellent pour les analyses detaillees
- **DeepSeek** (deepseek-chat) : alternative economique performante
- **ZenMux** (GLM-4.7 Flash Free) : modele gratuit pour les tests
- **Grok** (grok-2) : fournisseur xAI pour la diversite des perspectives
- **Groq** (Llama 3.3 70B) : inference ultra-rapide sur hardware specialise

La fonction accepte un payload contenant le prompt utilisateur, un system prompt optionnel, le fournisseur souhaite et une liste de messages optionnelle. Le system prompt par defaut configure l'IA comme un expert en analyse immobiliere suisse travaillant pour SIPA Immobilier SA.

Le flux de traitement est le suivant :
1. Verification de la methode HTTP (POST uniquement)
2. Parsing du payload JSON
3. Selection du fournisseur (default: Groq)
4. Recuperation de la cle API depuis les secrets Supabase
5. Construction du tableau de messages (system + user)
6. Appel a l'API du fournisseur selectionne
7. Extraction du texte de la reponse
8. Retour du resultat au frontend

L'analyse IA est utilisee principalement pour generer des commentaires contextuels sur les biens, expliquer les indicateurs financiers, et fournir des recommendations d'investissement preliminaires. Les reponses sont toujours accompagnees de la mention "analyse a titre indicatif, soumise a validation par un conseiller SIPA" pour rappeler leur caractere non contractuel.

### 11.3 saron-rate

La fonction saron-rate est un proxy qui interroge l'API de la Banque Nationale Suisse (BNS) pour recuperer le taux SARON (Swiss Average Rate Overnight) actuel. Le SARON est le taux de reference pour les hypotheses a taux variable en Suisse, et son integration dans SIPA Analyzer permet aux utilisateurs de baser leurs simulations sur des donnees de marche actualisees.

La fonction interroge l'endpoint de la BNS avec un User-Agent personnalise, parse les donnees JSON retournees (structure complexes avec observations, attributs et valeurs), et extrait la valeur la plus recente du taux. En cas de succes, la fonction retourne un objet contenant la date et le taux. En cas d'echec, elle retourne une erreur avec le code HTTP approprie.

Cote frontend, la fonction fetchSaronRate() dans saronRate.js invoque cette Edge Function et gere un cache pour eviter des appels repetitifs. Le cache a une duree de vie de 6 heures et est stocke a la fois en memoire et dans localStorage. Si la fonction echoue (indisponibilite du reseau ou erreur BNS), une valeur de fallback de -0.04% est utilisee.

### 11.4 delete-user

La fonction delete-user est une fonction de securite sensible qui permet la suppression d'un utilisateur par un administrateur. Contrairement aux operations standard qui utilisent le client public Supabase avec RLS, cette fonction utilise le service_role_key pour contourner les restrictions de securite et effectuer des operations administratives.

Le flux de securite est le suivant :

`	ypescript
// 1. Authentification de l'appelant via son JWT
const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
const caller = await supabaseAdmin.auth.getUser(jwt);
if (caller.error || !caller.data.user) {
  return jsonResponse({ error: 'Token invalide.' }, 401);
}

// 2. Verification que l'appelant est administrateur
const { data: callerPerm } = await supabaseAdmin
  .from('user_permissions')
  .select('role')
  .eq('user_id', caller.data.user.id)
  .single();
const callerLevel = ROLE_LEVEL[callerPerm?.role];
if (!callerLevel || callerLevel < 100) {
  return jsonResponse({ error: 'Seuls les administrateurs peuvent supprimer des utilisateurs.' }, 403);
}

// 3. Verification que la cible a un niveau inferieur
const { data: targetPerm } = await supabaseAdmin
  .from('user_permissions')
  .select('role')
  .eq('user_id', user_id)
  .single();
const targetLevel = ROLE_LEVEL[targetPerm?.role] ?? 0;
if (targetLevel >= callerLevel) {
  return jsonResponse({ error: 'Impossible de supprimer un utilisateur avec un role egal ou superieur au votre.' }, 403);
}

// 4. Suppression des permissions puis du compte auth
await supabaseAdmin.from('user_permissions').delete().eq('user_id', user_id);
await supabaseAdmin.auth.admin.deleteUser(user_id);
`

Ce processus garantit que seuls les administrateurs peuvent supprimer des utilisateurs, qu'ils ne peuvent pas supprimer des utilisateurs de niveau superieur ou egal, et que les donnees sont correctement nettoyees (permissions supprimees avant le compte auth).

---

## 12. Supervision et administration

### 12.1 Architecture du panneau admin

Le panneau d'administration est implemente dans la page Admin.jsx et le composant AdminSupervisionPanel.jsx. Il est accessible uniquement aux utilisateurs ayant le role admin ou super_admin. L'interface est organisee en quatre sous-panneaux :

1. **Gestion des utilisateurs** : Attribution des roles et permissions
2. **Monitoring technique** : Etat de sante de l'infrastructure
3. **Logs d'audit** : Consultation et filtrage des evenements
4. **Corbeille** : Gestion des elements supprimees logiquement

### 12.2 Gestion des utilisateurs

Le panneau de gestion des utilisateurs permet aux administrateurs de visualiser la liste complete des utilisateurs et de gerer leurs permissions. Chaque utilisateur est affiche avec son email, son nom, son role actuel et la date de creation de son compte. L'interface permet de :

- Attribuer un role (membre, staff, direction, admin)
- Definir des permissions individuelles via des cases a cocher
- Activer ou desactiver un compte
- Supprimer un utilisateur (avec confirmation)

Lorsqu'un administrateur modifie les permissions d'un utilisateur, la modification est immediatement prise en compte grace au refetchInterval de 5 secondes configure dans le hook usePermissions.

### 12.3 Supervision technique

Le panneau de supervision (AdminSupervisionPanel.jsx) se compose de quatre sous-panneaux :

**Panneau de monitoring :** Affiche l'etat technique de l'application avec les indicateurs suivants :
- Nombre d'utilisateurs enregistres
- Nombre de biens actifs (non-supprimes)
- Nombre d'analyses actives
- Nombre de logs d'audit
- Taux SARON actuel
- Etat de connexion Supabase (OK/Erreur)
- Etat de la table audit_logs (OK/Erreur)

**Panneau d'export de sauvegarde :** Permet d'exporter les donnees de l'application au format JSON complet ou CSV par entite. Les exports incluent les proprietes, analyses, logs d'audit, utilisateurs et permissions.

**Panneau des logs filtres :** Affiche les logs d'audit avec des filtres par type d'evenement et par niveau de criticite. Les logs sont affiches avec la date, le type, l'acteur et la cible.

**Panneau de la corbeille :** Affiche les elements supprimees logiquement (proprietes et analyses) avec la possibilite de les restaurer ou de les supprimer definitivement.

### 12.4 Dashboard principal

Le dashboard principal (Dashboard.jsx) est la premiere page que les utilisateurs voient apres la connexion. Il offre une vue d'ensemble de l'activite avec les elements suivants :

- **KPIs** : Cartes d'indicateurs cles (nombre de biens, analyses, score moyen, rendement moyen)
- **Top opportunites** : Les biens les mieux notes (S et A) avec leurs indicateurs
- **Graphiques de performance** : Visualisations Recharts (distribution des notes, rendements par bien, evolution)
- **Dernieres analyses** : Liste des analyses recentes

Le dashboard est alimente par les donnees recuperees via TanStack React Query, avec un systeme de cache et de revalidation automatique pour garantir que les donnees affichees sont toujours a jour.

---

## 13. Sauvegarde et restauration

### 13.1 Strategie 4 niveaux

La strategie de sauvegarde de SIPA Analyzer est organisee en 4 niveaux complementaires
pour garantir la resilience des donnees :

Niveau 1 - Sauvegarde Supabase automatique : Supabase effectue des sauvegardes
automatiques quotidiennes de la base de donnees PostgreSQL. Ces sauvegardes sont
conservees pendant 7 jours pour le plan Pro et incluent l'integralite des donnees
(tables, indexes, fonctions, politiques RLS). La restauration s'effectue via
l'interface Supabase Dashboard.

Niveau 2 - Export JSON depuis l'application : Le panneau d'administration permet
d'exporter manuellement l'ensemble des donnees au format JSON. L'export est
declenche par la fonction exportBackupJson() dans adminExports.js et genere un
fichier contenant les proprietes, analyses, logs d'audit, utilisateurs et
permissions avec un horodatage dans le nom du fichier.

Niveau 3 - Export CSV par entite : L'export CSV bundle genere un fichier CSV
separe pour chaque entite (properties, analysis, audit_logs). Les fichiers sont
telecharges individuellement avec des noms horodates. Ce format est particulierement
utile pour l'analyse externe des donnees dans des outils comme Excel ou Sheets.

Niveau 4 - Snapshots Supabase CLI : Pour les deploiements critiques, des snapshots
de la base de donnees peuvent etre realises via Supabase CLI avant chaque
deploiement ou modification majeure du schema.

### 13.2 Procedures de restauration

Restauration depuis une sauvegarde Supabase : Acceder au Supabase Dashboard,
naviguer vers Database puis Backups, selectionner la sauvegarde souhaitee,
cliquer sur Restore, confirmer la restauration, et verifier l'integrite des
donnees apres restauration.

Restauration depuis un export JSON : Acceder au panneau d'administration,
disposer d'un export JSON recent, utiliser l'interface d'import ou reinserer
manuellement les donnees, verifier que les comptes utilisateurs et les permissions
sont correctement restituees.

Restauration depuis un dump Supabase CLI : Installer Supabase CLI si necessaire,
se connecter au projet avec supabase link, executer le dump avec psql, et verifier
les indexes et les politiques RLS apres restauration.

### 13.3 Test de restauration

La procedure de test de restauration doit etre realisee periodiquement (tous les
trimestres) pour garantir l'integrite des sauvegardes. Creer un projet Supabase de
test, restaurer la derniere sauvegarde sur ce projet, verifier le nombre
d'enregistrements dans chaque table, verifier que les politiques RLS sont
correctement appliquees, tester la connexion avec un utilisateur de test, verifier
que les exports PDF fonctionnent avec les donnees restaurees, et documenter les
ecarts eventuels.

---

## 14. Gestion d'incident

### 14.1 Niveaux de gravite P1-P4

Les incidents sont classes selon 4 niveaux de gravite. Le niveau P1 (Critique)
couvre l'application inaccessible, la perte de donnees et les failles de securite.
Le temps de reponse est de 30 minutes et la resolution doit intervenir sous 4 heures.

Le niveau P2 (Majeur) concerne les fonctionnalites principales indisponibles ou une
performance gravement degradee. Le temps de reponse est de 2 heures pour une
resolution sous 8 heures.

Le niveau P3 (Moyen) couvre les fonctionnalites secondaires indisponibles ou les
defauts d'affichage. Le temps de reponse est de 8 heures pour une resolution sous
24 heures.

Le niveau P4 (Mineur) concerne les defauts esthetiques, la documentation erronee
ou les suggestions. Le traitement s'effectue sous 72 heures.

### 14.2 Procedures detaillees

Pour un incident P1 (Application inaccessible) : verifier l'etat de Vercel et
Supabase via leurs pages de statut respectives, verifier la configuration DNS,
verifier les logs Vercel pour identifier l'erreur de build. Si erreur de build,
identifier le commit problematique et effectuer un rollback. Si indisponibilite
Supabase, attendre le retablissement du service. Communiquer l'incident aux
utilisateurs et rediger un post-mortem dans les 24 heures.

Pour un incident P2 (Fonctionnalite principale indisponible) : identifier la
fonctionnalite impactee (import, export, calcul, etc.), verifier les logs d'erreur
dans la console navigateur et les logs Supabase, reproduire le bug en
environnement de developpement, deployer un correctif si identifie ou mettre en
place un contournement temporaire.

Pour un incident P3 (Fonctionnalite secondaire indisponible) : documenter le bug
dans le systeme de suivi, prioriser dans le backlog, deployer directement si le
correctif est simple, ou planifier dans le prochain sprint.

Pour un incident P4 (Defaut mineur) : documenter dans le systeme de suivi et
traiter lors du prochain sprint de maintenance.

### 14.3 Exemples d'incidents

Exemple 1 - Erreur de build Vercel : L'application affiche une page d'erreur
Vercel 500. Cause : une dependance nouvellement ajoutee genere une erreur lors
du build. Resolution : identifier le commit problematique via git bisect,
effectuer un revert du commit, redemarrer le deploiement.

Exemple 2 - Echec de l'import Excel : L'import de fichier Excel retourne une
erreur inattendue. Cause : changement dans le format du fichier Excel fourni par
le service financier. Resolution : analyser le nouveau format, mettre a jour les
motifs de reconnaissance dans excelImport.js, deployer le correctif.

Exemple 3 - Lenteur de l'application : Les pages mettent plus de 5 secondes a
charger. Cause : requete non indexee sur la table analysis. Resolution :
identifier la requete lente via les logs de performance Supabase, creer l'index
approprie.

### 14.4 Modele de compte rendu d'incident

Un modele de compte rendu d'incident doit inclure les sections suivantes : date,
numero d'incident, niveau de gravite, statut, description detaillee, chronologie
complete avec horodatage, analyse de la cause racine, impact (utilisateurs
impactes, duree, perte de donnees), actions correctives realisees, actions
preventives planifiees, et lecons apprises. Ce document est archive et sert de
reference pour l'amelioration continue de la plateforme.

---

## 15. Separation des environnements

### 15.1 Tableau comparatif dev/prod

Le projet maintient deux environnements distincts pour le developpement et la
production. Le tableau suivant detaille les differences de configuration :

| Aspect | Developpement | Production |
|---|---|---|
| Hebergement | Local (Vite) | Vercel (CDN) |
| Base de donnees | Supabase projet dev | Supabase projet prod |
| Auth | Mode developpement | Mode production |
| Secrets | .env.local | Supabase Secrets + Vercel Env |
| Build | Vite dev server | Vite build + deploy |
| Domaines | localhost:5173 | sipa-analyzer.vercel.app |
| Logs | Console navigateur | Vercel Logs + Supabase Logs |
| RLS | Activee (dev) | Activee (prod) |
| Cache navigateur | Desactive | Active |
| Images | locales | Supabase Storage |

### 15.2 Variables d'environnement

Les variables d'environnement suivantes sont requises pour le fonctionnement de
l'application. Les variables prefixees par VITE_ sont accessibles dans le code
frontend et sont configurees dans Vercel pour la production et dans un fichier
.env.local pour le developpement.

Variables requises :
- VITE_SUPABASE_URL : URL du projet Supabase
- VITE_SUPABASE_ANON_KEY : Cle anon publique Supabase

Variables optionnelles (dans le code) :
- VITE_STRIPE_PUBLISHABLE_KEY : Cle publique Stripe (paiements)
- OPENAI_API_KEY : Cle API OpenAI (Edge Function)
- DEEPSEEK_API_KEY : Cle API DeepSeek (Edge Function)
- GROK_API_KEY : Cle API Grok (Edge Function)
- GROQ_API_KEY : Cle API Groq (Edge Function)
- ZENMUX_API_KEY : Cle API ZenMux (Edge Function)

Les cles API des fournisseurs d'IA sont stockees dans Supabase Secrets et ne
sont jamais transmises au frontend. Seules les variables VITE_ sont necessaires
dans le frontend et ne contiennent que des informations publiques.

### 15.3 Checklist de promotion dev vers prod

Avant de promouvoir une version du developpement vers la production, les verifications
suivantes doivent etre effectuees :

1. Executer la suite de tests (npm run lint, npm run typecheck)
2. Verifier que le build passe sans erreur (npm run build)
3. Tester les fonctionnalites principales en environnement de staging
4. Verifier les migrations SQL et les appliquer a la base de prod
5. Mettre a jour les variables d'environnement sur Vercel si necessaire
6. Verifier que les secrets Supabase sont a jour
7. Effectuer un backup de la base de production avant deploiement
8. Deployer via git push sur la branche principale
9. Verifier le build sur Vercel
10. Tester les fonctionnalites cles en production

---

## 16. Deploiement

### 16.1 Pre-requis

Avant de deployer SIPA Analyzer, les elements suivants sont requis : un compte
Vercel lie au depot GitHub, un projet Supabase actif avec les migrations appliquees,
les variables d'environnement configurees sur Vercel et dans Supabase Secrets,
et un nom de domaine configure (optionnel).

L'environnement de developpement necessite Node.js 18+, npm, Git, et Supabase CLI
pour la gestion des migrations et des Edge Functions.

### 16.2 Processus de build

Le build est automatise par Vercel et declenche a chaque push sur la branche
principale. Le processus suit les etapes suivantes :

1. Vercel detecte le push et clone le depot
2. Installation des dependances (npm install)
3. Execution du build Vite (npm run build)
4. Les fichiers statiques sont generes dans le dossier dist/
5. Vercel deploie les fichiers sur son CDN global
6. Les redirections sont configurees via le fichier _redirects
7. Le deploiement est accessible sur l'URL Vercel

Le fichier vercel.json configure les options de build : framework preset Vite,
installation de dependances, dossier de sortie dist/, et regles de reecriture pour
le routage React (toutes les routes vers index.html).

### 16.3 Deploiement Supabase

Le deploiement des migrations et des Edge Functions s'effectue via Supabase CLI :

- Appliquer les migrations : supabase db push
- Deployer les Edge Functions : supabase functions deploy
- Les secrets sont configures via : supabase secrets set CLE_API=valeur

Les migrations SQL sont executees dans l'ordre chronologique base sur les noms
de fichiers. Il est important de ne pas modifier les migrations deja appliquees,
et de creer de nouvelles migrations pour tout changement de schema.

### 16.4 Procedure de rollback

En cas de probleme apres un deploiement :

1. Acceder au dashboard Vercel
2. Naviguer vers Deployments
3. Identifier le dernier deploiement stable
4. Cliquer sur les trois points puis "Promote to Production"
5. Pour un rollback base de donnees, restaurer depuis la derniere sauvegarde
6. Verifier le fonctionnement de l'application apres rollback

En cas d'urgence, un revert du commit depuis Git est egalement possible, ce qui
dephenchera automatiquement un nouveau deploiement sur Vercel.

---

## 17. Maintenance et evolutions

### 17.1 Maintenance courante

**Taches quotidiennes :** Verification des logs d'erreur dans Vercel Dashboard,
surveillance des performances via le panneau de supervision admin, verification
du taux SARON et des connexions aux services externes.

**Taches hebdomadaires :** Revue des comptes utilisateurs en attente, verification
de l'espace de stockage Supabase, analyse des logs d'audit pour les evenements
inhabituels, mise a jour des dependances de securite (npm audit).

**Taches mensuelles :** Audit des comptes administrateur et direction, revue des
permissions, verification des sauvegardes Supabase, analyse des performances des
requetes (indexes, temps de reponse), mise a jour des dependances non-critiques.

**Taches trimestrielles :** Test de restauration complet, revue de securite
approfondie, mise a jour de la documentation technique, analyse des couts
d'infrastructure (Vercel, Supabase).

### 17.2 Evolutions possibles

Plusieurs evolutions sont envisagees pour les versions futures de SIPA Analyzer :

**Portail client :** Creation d'un portail client permettant aux investisseurs
d'acceder aux analyses qui leur sont destinees, avec un niveau de permission
specifique et une interface simplifiee.

**Mode hors ligne :** Implementation d'un service worker pour permettre une
utilisation partielle de l'application sans connexion internet, avec
synchronisation automatique lors du retour en ligne.

**Notifications en temps reel :** Utilisation des canaux Realtime de Supabase pour
notifier les utilisateurs des modifications apportees aux biens partages, des
nouvelles analyses, ou des changements de statut.

**Dashboard avance :** Enrichissement du tableau de bord avec des indicateurs
plus sophistiques (tendances, benchmarks, alertes de performance) et des
visualisations interactives supplementaires.

**API REST :** Exposition d'une API REST documentee pour permettre l'integration
de SIPA Analyzer avec d'autres outils du systeme d'information de SIPA
Immobilier SA (ERP, CRM, outils comptables).

**Internationalisation :** Support multilingue (francais, allemand, italien) pour
tenir compte des trois langues officielles de la Suisse.

**Modele de scoring avance :** Evolution de l'algorithme de notation S/A/B/C avec
des ponderations personnalisables, des criteres supplementaires (potentiel de
plus-value, couverture geographique, indicateurs macro-economiques).

---

## 18. Tests et qualite

### 18.1 Linting et formatage

Le projet utilise ESLint pour le linting du code JavaScript/JSX. La configuration
est definie dans eslint.config.js et etend les recommandations ESLint avec des
plugins specifiques React, React Hooks et React Refresh. La commande npm run lint
execute l'analyse statique et signale les erreurs de syntaxe, les variables non
utilisees, les regles de hooks non respectees, et les importations inutilisees
(via le plugin unused-imports).

La commande npm run lint:fix applique automatiquement les correctifs disponibles
pour les regles auto-fixables, ce qui permet de maintenir un code propre sans
effort manuel excessif.

### 18.2 Type checking

Bien que le projet utilise principalement JavaScript, un fichier jsconfig.json est
configure pour TypeScript avec l'option checkJs: true. Cela permet d'obtenir une
veification de type partielle sur les fichiers JavaScript, en utilisant les
annotations JSDoc lorsque c'est necessaire. La commande npm run typecheck execute
cette verification. Le fichier src/utils/index.ts sert de point d'entree TypeScript
pour les utilitaires qui beneficient du typage statique.

### 18.3 Tests recommandes

Le projet ne dispose pas encore d'une suite de tests automatises. La couverture de
tests recommandee pour les versions futures inclut :

**Tests unitaires (Vitest) :**
- Moteur de calcul (calculations.js) : valider chaque formule avec des cas nominaux
  et des cas limites (valeurs nulles, negatives, tres grandes)
- Fonctions d'audit (auditLogs.js) : valider la construction des payloads et les
  mecanismes de fallback
- Fonctions d'import Excel (excelImport.js) : valider le parsing des differents
  formats de fichiers
- Fonctions de geocodage (geocode.js) : valider la construction des requetes et
  la gestion du cache

**Tests d'integration :**
- Flux d'authentification complet (inscription, connexion, OTP, reset password)
- Operations CRUD avec verification des permissions RLS
- Generation PDF avec verification du contenu genere

**Tests end-to-end (Playwright/Cypress) :**
- Parcours utilisateur complet : connexion, ajout d'un bien, analyse, export PDF
- Scenarios de droits : verifier qu'un utilisateur sans permission ne peut pas
  acceder aux fonctionnalites restreintes
- Tests de responsivite : verifier le rendu sur differentes tailles d'ecran

**Tests de securite :**
- Tentatives d'injection SQL via les champs de saisie
- Tentatives d'acces a des donnees non autorisees via manipulation des requetes
- Verification des en-tetes HTTP de securite
- Tests de rate limiting sur les endpoints d'authentification

---

## 19. Correspondance RNCP AIS

Ce chapitre etablit la correspondance entre les fonctionnalites et l'architecture
de SIPA Analyzer et les blocs de competences du referentiel RNCP AIS (Architecture
des Systemes d'Information).

### 19.1 Bloc 1 - Analyse et conception du systeme d'information

| Competence | Realisation SIPA Analyzer |
|---|---|
| Analyser les besoins metier | Cahier des charges fonctionnel, entretiens avec les experts SIPA |
| Concevoir l'architecture fonctionnelle | Diagramme d'architecture, diagrammes de sequence, modele de donnees |
| Specifier les composants logiciels | Decoupage en composants React, API adaptateur, Edge Functions |
| Definir les flux de donnees | Flux CRUD, flux d'authentification, flux d'import/export documentes |
| Elaborer le modele de donnees | Modele relationnel avec 7 tables, relations, indexes, migrations |
| Rediger les specifications techniques | Documentation ARCHITECTURE.md, DOCUMENTATION_TECHNIQUE.md |

### 19.2 Bloc 2 - Developpement et integration

| Competence | Realisation SIPA Analyzer |
|---|---|
| Developper les composants frontend | 16 pages React, 26 composants reutilisables, 3 hooks |
| Developper les composants backend | 3 Edge Functions Deno (ai-insights, saron-rate, delete-user) |
| Implementer la couche d'acces aux donnees | Adaptateur base44Client, client Supabase, audit log |
| Integrer les composants | Integration React Query, routage React Router, contextes d'auth |
| Gerer les dependances | package.json avec 80+ dependances, versioning explicite |
| Versionner le code | Git, GitHub, branches feature/release, commits conventionnels |
| Executer les tests de non-regression | Linting ESLint, type checking TypeScript, build verification |

### 19.3 Bloc 3 - Administration et securite

| Competence | Realisation SIPA Analyzer |
|---|---|
| Administrer la base de donnees | Migration SQL (17 migrations), indexes, RLS, optimisation |
| Configurer les droits d'acces | RLS PostgreSQL, permissions granulaires, hook usePermissions |
| Implementer l'authentification | Supabase Auth, OTP, reset password, session management |
| Securiser les donnees | Aucun secret frontend, Edge Functions cote serveur, CORS |
| Tracer les actions | audit_logs (15+ types d'evenements), commentaires d'audit metier |
| Gerer les sauvegardes | Strategie 4 niveaux, backup JSON/CSV, snapshots Supabase |
| Planifier la maintenance | Taches quotidiennes, hebdomadaires, mensuelles et trimestrielles |

### 19.4 Bloc 4 - Pilotage et gestion de projet

| Competence | Realisation SIPA Analyzer |
|---|---|
| Planifier le projet | Roadmap, priorisation des fonctionnalites, sprints iteratifs |
| Gerer les risques | Incidents P1-P4, plan de reprise, rollback, backups |
| Documenter le projet | README.md, ARCHITECTURE.md, SECURITY.md, PERMISSIONS_MATRIX.md, DOCUMENTATION_TECHNIQUE.md |
| Assurer la qualite | Linting, typecheck, revue de code, post-mortem d'incidents |
| Deployer et exploiter | Vercel deploiement continu, Supabase hosting, monitoring |
| Respecter les normes | RGPD, bonnes pratiques OWASP, standards d'accessibilite WCAG |

---

## 20. Annexes

### 20.1 Guide d'installation rapide

1. Cloner le depot : git clone <url-du-depot>
2. Installer les dependances : npm install
3. Creer un fichier .env.local a la racine avec les variables VITE_SUPABASE_URL et
   VITE_SUPABASE_ANON_KEY
4. Demarrer le serveur de developpement : npm run dev
5. Acceder a l'application sur http://localhost:5173

Pour deployer les migrations Supabase :
1. Installer Supabase CLI : npm install -g supabase
2. Se connecter au projet : supabase login
3. Lier le projet : supabase link --project-ref <ref>
4. Appliquer les migrations : supabase db push

Pour deployer les Edge Functions :
supabase functions deploy ai-insights
supabase functions deploy saron-rate
supabase functions deploy delete-user

Pour configurer les secrets Supabase :
supabase secrets set OPENAI_API_KEY=<valeur>
supabase secrets set DEEPSEEK_API_KEY=<valeur>
supabase secrets set GROQ_API_KEY=<valeur>
supabase secrets set GROK_API_KEY=<valeur>
supabase secrets set ZENMUX_API_KEY=<valeur>

Pour deployer sur Vercel :
1. Connecter le depot GitHub a Vercel
2. Configurer les variables d'environnement dans le dashboard Vercel
3. Deployer automatiquement via git push sur la branche principale

### 20.2 Dependances detaillees

Les dependances sont divisees en plusieurs categories fonctionnelles :

**Framework et rendu :** react, react-dom, vite, vite-plugin-react, typescript
**Routage :** react-router-dom (v6)
**Backend :** supabase-js (v2), tanstack-react-query (v5)
**UI et composants :** shadcn/ui (30+ composants Radix UI), framer-motion, lucide-react,
  tailwindcss, tailwind-merge, class-variance-authority, clsx, next-themes
**Formulaires :** react-hook-form, hookform-resolvers, zod, input-otp
**Exports :** jspdf, html2canvas, xlsx
**Visualisation :** recharts, three.js, leaflet, react-leaflet, canvas-confetti
**Cartographie :** leaflet, react-leaflet
**Editeur :** react-quill, react-markdown, remark-parse, remark-rehype
**Animation :** embla-carousel-react, framer-motion, vaul
**Utilitaires :** date-fns, moment, lodash, uuid, clsx
**Paiement :** stripe-js, stripe-react-js
**Qualite :** eslint, eslint-plugin-react, eslint-plugin-react-hooks,
  eslint-plugin-react-refresh, eslint-plugin-unused-imports, globals

### 20.3 Glossaire

**Adaptateur (base44Client) :** Couche de code qui traduit les appels de l'ancienne
API Base44 vers Supabase, assurant la compatibilite ascendante.

**BNS :** Banque Nationale Suisse, autorite monetaire suisse qui publie le taux
SARON.

**Corbeille :** Mecanisme de suppression logique permettant de restaurer des
elements supprimes.

**Dichotomie :** Algorithme de recherche binaire utilise pour calculer le taux
hypothecaire a partir du montant d'amortissement.

**Edge Function :** Fonction serverless executée dans l'environnement Deno de
Supabase, servant de proxy ou de point d'acces securise aux services externes.

**FP :** Fonds propres, capital investi par l'acheteur.

**Honeycomb :** Motif graphique en nid d'abeille caracteristique des exports PDF
SIPA Analyzer.

**JWT :** JSON Web Token, standard d'authentification utilise par Supabase.

**OTP :** One-Time Password, code a usage unique envoye par email pour la
veification de l'identite.

**RLS :** Row Level Security, mecanisme PostgreSQL qui restreint l'acces aux
lignes d'une table en fonction de l'utilisateur connecte.

**SARON :** Swiss Average Rate Overnight, taux de reference pour les hypotheses
a taux variable en Suisse, publie par la BNS.

**SIPA :** SIPA Immobilier SA, regie immobiliere suisse pour laquelle l'application
est developpee.

**Soft Delete :** Suppression logique (marquage d'un enregistrement comme supprime
sans le supprimer physiquement de la base de donnees).

**Supabase :** Plateforme backend open source combinant PostgreSQL, authentification,
stockage et fonctions serverless.

**Vercel :** Plateforme de deploiement frontend utilisee pour heberger les fichiers
statiques de SIPA Analyzer.

### 20.4 Checklist de deploiement

Avant chaque deploiement en production, la checklist suivante doit etre validee :

- [ ] Les tests unitaires passent (quand implementes)
- [ ] npm run lint ne remonte aucune erreur
- [ ] npm run typecheck ne remonte aucune erreur
- [ ] npm run build genere le dossier dist/ sans erreur
- [ ] Les variables d'environnement sont configurees sur Vercel
- [ ] Les secrets Supabase sont a jour
- [ ] Les migrations SQL sont appliquees a la base de production
- [ ] Un backup de la base de production a ete effectue
- [ ] La version de l'application a ete incrementee dans package.json
- [ ] Le CHANGELOG a ete mis a jour
- [ ] La documentation a ete mise a jour si necessaire
- [ ] Les fonctionnalites principales ont ete testees en environnement de staging

### 20.5 Fiche de suivi d'incident

La fiche de suivi d'incident est un document essentiel pour la gestion de la
qualite et l'amelioration continue. Elle doit etre remplie pour chaque incident
P1 et P2, et archiver dans le dossier incidents/ du depot.

Contenu de la fiche :
- Numero d'incident unique (INC-XXXX)
- Date et heure de detection
- Niveau de gravite (P1 a P4)
- Description detaillee du probleme
- Impact (utilisateurs impactes, fonctionnalites concernees)
- Chronologie des evenements
- Cause racine identifiee
- Actions correctives realisees
- Actions preventives planifiees
- Duree totale de l'incident
- Statut (resolu, en cours, ferme)
- Date de cloture
- Signatures (detecteur, intervenant, validateur)

---

*Document genere le 06/07/2026 pour la certification RNCP AIS.*
*SIPA Analyzer v1.0.0 - SIPA Immobilier SA*

---

## Annexe A - Exemples de code detailles

### A.1 Exemple complet d'analyse financiere

Voici un exemple detaille du fonctionnement du moteur de calcul financier avec des
valeurs concretes. Supposons un bien immobilier achete 850 000 CHF avec les
caracteristiques suivantes :
- Prix du bien : 850 000 CHF
- Versement initial copropriete : 15 000 CHF
- Amortissement sur 5 ans : 25 000 CHF
- Honoraires SIPA Immobilier SA : 12 750 CHF (1.5%)
- Frais de dossier bancaire : 1 500 CHF
- Fonds propres apportes : 255 000 CHF (30%)
- Hypotheque : 595 000 CHF (70%)
- Revenus locatifs annuels : 51 000 CHF (6%)
- Charges operationnelles : 8 500 CHF
- Interets hypothecaires : 8 925 CHF (1.5% sur 595k)
- Honoraires de gestion : 5 100 CHF (10% des loyers)
- Impot estime : 4 500 CHF

Le moteur de calcul applique les formules suivantes :
- Prix total = 850000 + 15000 + 25000 + 12750 + 1500 = 904 250 CHF
- Revenu net = 51000 - 8500 - 8925 - 5100 = 28 475 CHF/an
- Revenu distribue = 28475 - 4500 = 23 975 CHF/an
- Rendement brut = (51000 / 850000) * 100 = 6.00%
- Rendement net / FP = (28475 / 255000) * 100 = 11.17%
- Revenu distribue / FP = (23975 / 255000) * 100 = 9.40%

Pour le scoring, avec un rendement brut de 6.00%, la note de base est S (>=5%).
Si l'emplacement est "Excellent" et l'etat du batiment est "Tres bon", le bonus
est de +1 (car un Excellent donne +1 et Tres bon donne +1, mais le bonus total est
limite a 1). La note finale reste S (la plus elevee). Le score est donc 95/100.

### A.2 Exemple de template d'audit log

Voici un exemple de payload stocke dans un commentaire d'audit lors de la
modification d'un bien immobilier :

{
  "type": "property_update",
  "entity_table": "properties",
  "entity_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "actor_id": "user-uuid-1234",
  "actor_name": "Jean Dupont",
  "changes": [
    {
      "field": "prix_bien",
      "label": "Prix du bien",
      "before": 800000,
      "after": 850000
    },
    {
      "field": "statut",
      "label": "Statut",
      "before": "brouillon",
      "after": "valide"
    }
  ]
}

Ce payload est insere dans la table comments avec le prefixe __audit__ et est
ensuite parse par le composant TraceabilityPanel.jsx pour afficher un historique
lisible des modifications.

### A.3 Exemple de verification de permissions avec RLS

Voici comment les politiques RLS interagissent avec la fonction has_permission()
lorsqu'un utilisateur tente de modifier un bien :

1. L'utilisateur envoie une requete UPDATE vers la table properties
2. PostgreSQL execute la politique "properties_update_permitted"
3. La politique appelle has_permission(can_edit_property)
4. has_permission() verifie dans la table user_permissions si l'utilisateur a
   le flag can_edit_property = true OU un role admin/super_admin
5. Si oui, la mise a jour est autorisee, sinon elle est rejetee avec une erreur
   "permission denied for table properties"
6. La politique WITH CHECK verifie ensuite que la nouvelle valeur est egalement
   autorisee (empeche la modification de created_by_id par exemple)

Ce mecanisme garantit que meme si un utilisateur malveillant tente d'executer
une requete directement depuis la console navigateur ou via curl, la securite
est preservee au niveau de la base de donnees.

### A.4 Exemple d'appel a une Edge Function depuis le frontend

Voici le code utilise pour invoquer la fonction saron-rate depuis le frontend,
avec gestion du cache et fallback :

- La fonction fetchSaronRate() verifie d'abord le cache memoire
- Si le cache est vide, elle verifie le localStorage (validite 6 heures)
- Si aucun cache valide, elle invoque la Edge Function saron-rate
- La fonction enrobe la requete dans un try/catch
- En cas d'erreur, elle retourne une valeur de fallback (-0.04%)
- En cas de succes, elle met a jour le cache memoire et localStorage

Ce pattern de cache avec fallback est utilise pour les donnees non-critiques
qui peuvent etre legèrement obsoletes sans impact fonctionnel majeur.

---

## Annexe B - References

### B.1 Documentation externe

- Supabase Documentation : https://supabase.com/docs
- Vercel Documentation : https://vercel.com/docs
- React Documentation : https://react.dev
- Tailwind CSS Documentation : https://tailwindcss.com/docs
- shadcn/ui Documentation : https://ui.shadcn.com
- jsPDF Documentation : https://raw.githack.com/MrRio/jsPDF/master/docs/
- TanStack React Query Documentation : https://tanstack.com/query/latest
- OWASP Top 10 : https://owasp.org/www-project-top-ten/
- RNCP AIS Referentiel : https://www.francecompetences.fr/recherche/rncp/

### B.2 Code source du projet

Le code source de SIPA Analyzer est organise selon la structure suivante :
- src/ : Code source React de l'application
- supabase/migrations/ : Migrations SQL d'evolution du schema
- supabase/functions/ : Edge Functions Deno
- entities/ : Definitions d'entites (schema JSON)
- docs/ : Documentation technique et fonctionnelle
- public/ : Fichiers statiques et configuration

---

## Annexe C - Metriques et performance

### C.1 Performances attendues

Les performances de SIPA Analyzer sont conformes aux objectifs suivants :
- Temps de chargement initial : < 2 secondes (avec cache navigateur)
- Temps de reponse des requetes CRUD : < 500 ms
- Generation PDF : < 3 secondes pour une fiche bien standard
- Import Excel : < 5 secondes pour un fichier de taille moyenne
- Temps de build Vite : < 30 secondes
- Taille du bundle JS en production : < 500 KB (gzipped)
- Disponibilite : 99.9% (SLA Vercel + Supabase)

### C.2 Optimisations realisees

Plusieurs optimisations ont ete mises en oeuvre pour atteindre ces objectifs :
- Lazy loading des composants lourds (Three.js, Leaflet, React Quill)
- Mise en cache des donnees avec TanStack Query
- Cache du taux SARON avec expiration 6 heures
- Charges utiles JSON minimales pour les requetes API
- Indexation des colonnes filtrees (deleted_at, severity)
- Build optimise avec Vite (code splitting, tree shaking)
- Compression des assets statiques sur Vercel (CDN, Brotli)
- Utilisation de React.memo() pour les composants couteux

---

## Annexe D - Securite approfondie

### D.1 Analyse des risques

Les risques de securite identifies pour SIPA Analyzer et leurs parades :

**Risque 1 - Compte sans role :** Un utilisateur inscrit mais non active par un
admin ne peut pas acceder aux donnees. Le role "en_attente" bloque toutes les
permissions. La parade est la verification automatique via le hook usePermissions.

**Risque 2 - Suppression accidentelle :** Les biens et analyses utilisent une
suppression logique (soft delete). Les donnees sont masquees dans l'application
mais restent en base et sont restaurables depuis l'administration.

**Risque 3 - Fuite de secret :** Aucun secret sensible n'est stocke dans le
frontend. Les cles API sont dans Supabase Secrets, accessibles uniquement depuis
les Edge Functions cote serveur.

**Risque 4 - Erreur d'acces :** La combinaison RLS + permissions applicatives
offre une defense en profondeur. Les deux couches doivent etre traversees pour
acceder aux donnees.

**Risque 5 - Traçabilite insuffisante :** Les logs d'audit et l'historique des
modifications (commentaires prefixes __audit__) assurent une tracabilité
exhaustive des actions sensibles.

### D.2 Recommandations OWASP

Le projet suit les recommandations OWASP Top 10 :
- A01 Broken Access Control : RLS + permissions applicatives + guards de route
- A02 Cryptographic Failures : HTTPS, tokens JWT, secrets cote serveur
- A03 Injection : Requetes parametrees via le client Supabase SDK
- A04 Insecure Design : Architecture multicouche, principe du moindre privilege
- A05 Security Misconfiguration : Variables d'environnement, secrets separes
- A06 Vulnerable Components : npm audit regulier, dependances maintenues
- A07 Identification Failures : Supabase Auth, OTP, reset password securise
- A08 Software Integrity : Deploiement Git, signatures de commit
- A09 Logging Failures : Audit logs, commentaires d'audit metier
- A10 SSRF : Edge Functions avec URLs filtrees

---

## Annexe E - Maintenance des dependances

### E.1 Cycle de mise a jour

Les dependances sont mises a jour selon le cycle suivant :
- Corrections de securite : des que possible (npm audit)
- Versions mineures (patch) : mensuellement
- Versions majeures : trimestriellement, avec tests de regression complets

La commande utilisee pour verifier les mises a jour disponibles :
npm outdated

Et pour appliquer les mises a jour :
npm update (versions mineures)
npm install package@latest (versions majeures, apres verification)

### E.2 Dependances critiques

Les dependances suivantes sont considerees comme critiques et leur mise a jour
necessite une attention particuliere :
- react, react-dom : Changement d'API, tests de regression complets
- supabase-js : Changement dans le SDK, verification du flux d'auth
- vite : Changement dans la configuration de build
- tailwindcss : Changement dans les classes utilitaires
- jspdf : Changement dans le format de sortie PDF
- xlsx : Changement dans le parsing des fichiers Excel

---

*Fin du document - SIPA Analyzer v1.0.0 - Certification RNCP AIS*

---

## Annexe F - Details des politiques RLS

### F.1 Explication detaillee de chaque politique

Les politiques RLS (Row Level Security) sont le cur du systeme de securite de
SIPA Analyzer au niveau de la base de donnees. Chaque politique est une regle
qui determine si une operation (SELECT, INSERT, UPDATE, DELETE) est autorisee
sur une ligne donnee en fonction de l'utilisateur connecte. Voici l'analyse
complete de chaque politique implementee.

**Politiques sur la table properties :**

properties_select_permitted : Cette politique utilise la fonction has_permission()
avec le parametre can_view_properties. Elle est appliquee a toutes les requetes
SELECT. Si l'utilisateur n'a pas cette permission, aucune ligne n'est retournee.
Cela empeche un utilisateur non autorise de voir la liste des biens meme s'il
connait l'URL.

properties_insert_permitted : Cette politique combine deux conditions :
created_by_id = auth.uid() ET has_permission(can_create_property). La premiere
condition empeche un utilisateur de creer un bien au nom d'un autre utilisateur.
La deuxieme condition verifie que l'utilisateur a le droit de creer des biens.

properties_update_permitted : La clause USING verifie has_permission(can_edit_property)
et la clause WITH CHECK verifie la meme permission. La clause USING controle
quelles lignes existantes peuvent etre modifiees, tandis que WITH CHECK controle
ce que les nouvelles valeurs doivent respecter. L'utilisation des deux garantit
qu'un utilisateur ne peut ni modifier des biens pour lesquels il n'a pas la
permission, ni introduire des valeurs non autorisees.

properties_delete_permitted : Utilise has_permission(can_delete_property) dans la
clause USING. Notez que les politiques de DELETE n'ont pas de clause WITH CHECK
car la ligne est supprimee et il n'y a pas de nouvelles valeurs a verifier.

**Politiques sur la table analysis :**

Les politiques analysis_select_permitted, analysis_insert_permitted,
analysis_update_permitted et analysis_delete_permitted suivent exactement la meme
structure que celles de properties, avec les permissions correspondantes
(can_view_properties pour SELECT, can_create_analysis pour INSERT, etc.).

**Politiques sur la table comments :**

comments_select_permitted : Verifie has_permission(can_view_properties) car les
commentaires sont lies aux biens.

comments_insert_permitted : Verifie created_by_id = auth.uid() ET
has_permission(can_comment). Cette double verification empeche un utilisateur de
poster un commentaire au nom d'un autre.

comments_update_own_or_admin : Permet la modification si l'utilisateur est le
createur du commentaire OU s'il a la permission can_delete_property (admin).
Cette regle permet aux administrateurs de moderer les commentaires.

comments_delete_permitted : Meme logique que l'update, avec created_by_id = auth.uid()
OU has_permission(can_delete_property).

**Politiques sur la table favorites :**

favorites_select_own : Les utilisateurs ne voient que leurs propres favoris
(created_by_id = auth.uid()).

favorites_insert_own : Les utilisateurs ne peuvent ajouter que leurs propres
favoris (created_by_id = auth.uid()) ET doivent avoir la permission
can_view_properties pour empecher le pistage de biens inaccessibles.

favorites_delete_own : Les utilisateurs ne peuvent supprimer que leurs propres
favoris (created_by_id = auth.uid()).

**Politiques sur la table user_permissions :**

user_permissions_select_own_or_admin : Les utilisateurs voient leurs propres
permissions (user_id = auth.uid()) OU les administrateurs voient tout
(is_admin_or_super_admin()). Cela permet au hook usePermissions de recuperer
les permissions de l'utilisateur courant.

user_permissions_insert : Verifie que le role insere n'est pas superieur au
niveau de l'utilisateur connecte via can_manage_role(). Empeche un utilisateur
de s'auto-attribuer un role superieur.

user_permissions_update : Meme verification que l'insert. Un utilisateur ne peut
modifier que les permissions de roles inferieurs au sien.

user_permissions_delete : Verifie can_manage_role(role) ET user_id != auth.uid().
Cette derniere condition empeche un utilisateur de supprimer ses propres
permissions (ce qui le rendrait inactif sans possibilite de recuperation).

**Politiques sur la table audit_logs :**

audit_logs_insert_authenticated : Tout utilisateur authentifie peut inserer des
logs, ce qui permet au frontend de journaliser les actions.

audit_logs_select_admin : Seuls les administrateurs peuvent consulter les logs
(is_admin_or_super_admin()). Cela empeche les utilisateurs standards de voir les
actions des autres, protegeant ainsi la confidentialite des traces.

### F.2 Securite des fonctions RLS

Les fonctions RLS utilisent security definer, ce qui signifie qu'elles s'executent
avec les privileges du createur de la fonction (generalement postgres) et non avec
ceux de l'utilisateur appelant. Ce comportement est essentiel car la table
user_permissions a ses propres politiques RLS qui empecheraient un utilisateur
standard d'y acceder. En utilisant security definer, la fonction has_permission()
peut contourner ces restrictions pour verifier les permissions.

Le parametre search_path = public est defini dans les fonctions pour eviter les
attaques de type search_path hijacking, où un attaquant pourrait creer des objets
dans un schema prioritaire pour rediriger l'execution de la fonction.

Les fonctions sont declarees comme STABLE, ce qui indique a PostgreSQL qu'elles
retournent le meme resultat pour les memes parametres au sein d'une meme
transaction. Cela permet a l'optimiseur de requetes de les evaluer de maniere
plus efficace, sans les memoriser sur plusieurs transactions (ce qui serait le
cas avec IMMUTABLE).

---

## Annexe G - Analyse des flux utilisateur

### G.1 Parcours complet : Analyse d'un bien immobilier

Voici le parcours utilisateur complet pour l'analyse d'un bien immobilier, de la
connexion a l'export du rapport PDF. Ce parcours illustre l'ensemble des
interactions entre les differents composants de l'architecture.

**Etape 1 : Connexion**
L'utilisateur accede a l'URL de l'application et arrive sur la page de connexion
(Login.jsx). Il saisit son email et son mot de passe, puis clique sur le bouton
de connexion. Le composant Login.jsx appelle la methode
base44.auth.loginViaEmailPassword(email, password) qui utilise
supabase.auth.signInWithPassword(). Apres verification des identifiants,
Supabase retourne une session avec un JWT. Le AuthContext detecte le changement
d'etat via l'ecouteur onAuthStateChange et met a jour le contexte. L'utilisateur
est redirige vers le Dashboard. Un log d'audit de type "login" est enregistre.

**Etape 2 : Verification des permissions**
Le hook usePermissions est active dans les composants du dashboard. Il recupere
les permissions de l'utilisateur depuis la table user_permissions via TanStack
Query. La requete est automatiquement mise en cache et revalidee toutes les
5 secondes. Si l'utilisateur n'a pas le role requis (par exemple, membre ne peut
pas creer de biens), les boutons d'action correspondants ne sont pas affiches.

**Etape 3 : Ajout du bien**
L'utilisateur clique sur "Ajouter un bien". Le composant AddProperty.jsx affiche
un formulaire avec les champs : nom, adresse, ville, canton, pays, annee de
construction, surface, nombre de logements, lien annonce, et statut. La
geolocalisation est automatiquement effectuee via l'API Nominatim
OpenStreetMap lorsque l'utilisateur saisit l'adresse. Apres soumission, les
coordonnees geographiques sont stockees avec le bien pour l'affichage sur la
carte Leaflet.

**Etape 4 : Import des donnees financieres**
L'utilisateur peut importer un fichier Excel provenant du service financier SIPA.
Le composant d'import utilise la bibliotheque xlsx pour lire le fichier, puis la
fonction extractAnalysisFieldsFromExcel() dans excelImport.js parse le contenu
en cherchant des motifs connus (labels, valeurs, pourcentages). Les champs
reconnus sont automatiquement remplis dans le formulaire d'analyse. Les champs
non reconnus mais pertinents sont stockes dans le champ sipa_data (JSONB) pour
consultation ulterieure.

**Etape 5 : Calcul de l'analyse**
Le composant AnalysisForm.jsx affiche le formulaire d'analyse avec les champs
pre-remplis. L'utilisateur peut ajuster les valeurs si necessaire. Les calculs
sont effectues en temps reel par la fonction calculateAnalysis() dans
calculations.js. Le rendement brut, le revenu net, le rendement sur fonds
propres, et le score S/A/B/C sont recalcules a chaque modification d'un champ.
Les resultats sont affiches dans des cartes KPI, des jauges de score et des
tableaux financiers.

**Etape 6 : Sauvegarde et tracabilite**
Lorsque l'utilisateur sauvegarde l'analyse, la fonction base44.entities.Analysis
.create() ou .update() est appelee. L'adaptateur base44Client enregistre
automatiquement l'historique des modifications via le systeme de commentaires
d'audit (prefixe __audit__). Le payload JSON contient la liste des champs
modifies avec leurs valeurs avant/apres.

**Etape 7 : Export PDF**
L'utilisateur peut generer un PDF de l'analyse en cliquant sur le bouton
d'export. Le composant PdfExportDialog.jsx affiche les options d'export
(sections a inclure). La fonction exportAnalysisPdf() dans pdfExports.js utilise
jsPDF pour generer le document avec le motif honeycomb caracteristique. Le PDF
est telecharge automatiquement. Un log d'audit de type "export_pdf" est
enregistre avec les metadonnees de l'export.

**Etape 8 : Deconnexion**
L'utilisateur se deconnecte via le bouton de deconnexion. La fonction
base44.auth.logout() enregistre un log d'audit de type "logout", puis appelle
supabase.auth.signOut() pour detruire la session. L'utilisateur est redirige
vers la page de connexion.

### G.2 Parcours administrateur : Gestion des utilisateurs

**Etape 1 : Acces au panneau admin**
L'administrateur se connecte et navigue vers /admin. Le composant ProtectedRoute
verifie que l'utilisateur est authentifie. Le composant Admin.jsx utilise le hook
usePermissions pour verifier que l'utilisateur a le role admin ou super_admin.
Si ce n'est pas le cas, un message d'erreur est affiche ou l'utilisateur est
redirige.

**Etape 2 : Attribution d'un role**
L'administrateur consulte la liste des utilisateurs en attente. Il selectionne un
utilisateur et lui attribue un role (membre, staff, direction). La modification
est effectuee directement dans la table user_permissions via le client Supabase
avec le service_role_key (dans la fonction delete-user) ou via les politiques RLS
qui autorisent les administrateurs a modifier les utilisateurs de niveau inferieur.

**Etape 3 : Verification**
L'utilisateur cible voit ses permissions mises a jour automatiquement grace au
refetchInterval de 5 secondes du hook usePermissions. Il n'a pas besoin de se
reconnecter. Les nouvelles permissions sont effectives immediatement.

### G.3 Gestion de la corbeille

Lorsqu'un bien ou une analyse est supprime, un champ deleted_at est positionne
avec l'horodatage de la suppression. Les donnees ne sont pas physiquement
effacees. Dans le panneau d'administration, un onglet "Corbeille" affiche les
elements supprimes avec la date de suppression et le nom de l'utilisateur qui a
effectue la suppression.

L'administrateur peut :
- Restaurer un element : la fonction base44.entities.Property.restore(id) remet
  deleted_at a NULL et enregistre un log d'audit
- Supprimer definitivement : la fonction .hardDelete(id) efface physiquement
  l'enregistrement et ses donnees associees

Les elements en corbeille sont conserves jusqu'a suppression definitive explicite
par un administrateur. Il n'y a pas de purge automatique pour eviter la perte
accidentelle de donnees.

---

## Annexe H - Configuration de l'environnement de developpement

### H.1 Pre-requis techniques

Pour configurer un environnement de developpement SIPA Analyzer, les outils
suivants sont requis :
- Node.js version 18 ou superieure (recommande : 20 LTS)
- npm version 9 ou superieure
- Git pour le controle de version
- Un editeur de code (VS Code recommande avec extensions ESLint et Tailwind CSS)
- Un compte Supabase (gratuit pour le demarrage)
- Un compte Vercel (gratuit, lie au depot GitHub)

### H.2 Configuration du projet Supabase

1. Creer un nouveau projet sur supabase.com
2. Noter l'URL du projet et la cle anon publique (settings > API)
3. Dans Authentication > Settings, configurer :
   - Desactiver l'auto-confirm pour les emails (production)
   - Configurer le template d'email de confirmation
   - Configurer les fournisseurs OAuth souhaites
4. Dans SQL Editor, appliquer les migrations dans l'ordre
5. Deployer les Edge Functions via Supabase CLI
6. Configurer les secrets dans le dashboard Supabase

### H.3 Dump et restore de la base de donnees

Pour generer un dump de la base de donnees locale Supabase :
supabase db dump --local > backup_complet.sql

Pour restaurer un dump :
psql -h <host> -U <user> -d <database> -f backup_complet.sql

Les dumps sont utiles pour le partage de schema entre developpeurs et pour
les sauvegardes avant des operations risquées.

### H.4 Gestion des migrations

Les migrations SQL sont stockees dans supabase/migrations/ avec un format de nom
base sur la date : AAAAMMJJ_description.sql. Chaque migration est appliquee dans
l'ordre alphabetique. Les regles a respecter :

- Ne jamais modifier une migration deja appliquee
- Creer une nouvelle migration pour chaque changement de schema
- Tester les migrations sur un environnement de dev avant la production
- Documenter chaque migration avec un commentaire en tete du fichier
- Verifier que les politiques RLS sont mises a jour si necessaire

Pour appliquer les migrations : supabase db push
Pour voir le statut des migrations : supabase migration list

---

## Annexe I - Guide de depannage

### I.1 Problemes courants et solutions

**Erreur : "VITE_SUPABASE_URL est manquant"**
Solution : Creer un fichier .env.local a la racine avec VITE_SUPABASE_URL et
VITE_SUPABASE_ANON_KEY. Verifier que les variables sont correctement orthographiees
et que le fichier .env.local est bien ignore par Git.

**Erreur : "relation does not exist" lors de l'insertion de logs**
Solution : La table audit_logs n'est pas encore creee. Appliquer les migrations
Supabase avec supabase db push. En attendant, les logs sont stockes dans le
localStorage du navigateur (fallback).

**Erreur : "column ... does not exist" dans les logs**
Solution : Migration incrementale manquante. Verifier que la migration
20260630_add_audit_log_severity.sql a ete appliquee. Le mecanisme de fallback
dans recordAuditLog() retire automatiquement la colonne manquante.

**Erreur : "permission denied for table properties"**
Solution : L'utilisateur connecte n'a pas les permissions necessaires. Verifier
dans la table user_permissions que les flags can_view_properties, etc. sont a true
pour cet utilisateur. L'administrateur peut attribuer un role approprie.

**Erreur : build Vercel echoue**
Solution : Verifier les logs de build dans le dashboard Vercel. Les causes
courantes sont : une dependance manquante, une erreur de syntaxe dans le code,
ou une variable d'environnement non configuree.

**Erreur : "User not registered"**
Solution : Le compte utilisateur existe dans auth.users mais n'a pas de
permissions attribuees (role en_attente). L'administrateur doit attribuer un role
depuis le panneau d'administration.

**Erreur : import Excel echoue**
Solution : Verifier que le fichier Excel suit le format attendu par le service
financier SIPA. Les motifs de reconnaissance sont definis dans FIELD_DEFINITIONS
dans excelImport.js. Si le format a change, les motifs doivent etre mis a jour.

**Erreur : PDF genere vide ou tronque**
Solution : Verifier que les donnees de l'analyse sont completes (prix_bien,
revenus_locatifs, fonds_propres). Le PDF utilise ces valeurs pour les calculs
et les affichages. Si des donnees sont manquantes, certaines sections peuvent
etre vides.

**Erreur : la carte Leaflet ne s'affiche pas**
Solution : Verifier que les coordonnees latitude/longitude sont bien stockees dans
la base de donnees. Si la geolocalisation automatique a echoue, les coordonnees
doivent etre saisies manuellement. Verifier egalement que la cle API Leaflet est
configuree si necessaire.

**Erreur : le taux SARON est null**
Solution : La Edge Function saron-rate interroge l'API de la BNS. Si le service
est indisponible, la fonction retourne une erreur et le frontend utilise la valeur
de fallback (-0.04%). Verifier les logs de la fonction dans le dashboard Supabase.

**Erreur : conflit de version de dependances**
Solution : Executer npm install pour mettre a jour les dependances. Si le conflit
persiste, verifier le fichier package-lock.json et le supprimer puis regénerer
avec npm install. En dernier recours, reinstaller depuis zero avec node_modules
supprime et npm install.

### I.2 Logs et debugging

Les points d'entree pour le debugging sont organises par couche :

**Frontend :**
- Console navigateur : tous les composants utilisent console.warn/error pour les
  erreurs non-bloquantes
- React Developer Tools : inspection de l'arbre des composants et du contexte
- TanStack Query Devtools : visualisation des requetes et du cache
- Reseau (onglet Network) : inspection des appels API Supabase

**Backend (Supabase) :**
- Supabase Dashboard > Database > Logs : requetes SQL, erreurs, performance
- Supabase Dashboard > Edge Functions : logs des fonctions serverless
- Supabase Dashboard > Auth > Logs : evenements d'authentification

**Deploiement :**
- Vercel Dashboard > Deployments : logs de build et de deploiement
- Vercel Dashboard > Logs : logs d'execution cote serveur
- Vercel Dashboard > Analytics : performance et erreurs

---

## Annexe J - Performances et monitoring

### J.1 Metriques de performance

Les metriques suivantes sont surveillees pour garantir la qualite de service :

**Metriques frontend (Vercel Analytics) :**
- Core Web Vitals : LCP (Largest Contentful Paint), FID (First Input Delay),
  CLS (Cumulative Layout Shift)
- Temps de chargement par page
- Taux d'erreur JavaScript
- Utilisation memoire et CPU

**Metriques backend (Supabase) :**
- Temps de reponse moyen des requetes
- Nombre de requetes par seconde
- Taux d'erreur SQL
- Utilisation CPU et connexions actives
- Taille de la base de donnees

**Metriques Edge Functions :**
- Temps d'execution moyen
- Nombre d'invocations
- Taux d'erreur
- Memoire utilisee

### J.2 Alertes et seuils

Les alertes suivantes sont configurees dans le panneau de supervision :

- Temps de reponse > 2s : alerte jaune, investigation requise
- Temps de reponse > 5s : alerte rouge, action immediate
- Taux d'erreur > 1% : alerte rouge, investiguer les logs
- CPU Supabase > 80% : alerte jaune, verifier les indexes et les requetes
- Stockage > 80% : alerte jaune, planifier le nettoyage ou l'extension
- Taille de la corbeille > 100 elements : alerte info, inviter au nettoyage

---

## Annexe K - Cycle de vie des donnees

### K.1 Retention des donnees

Les donnees sont conservees selon les durees suivantes :

- Biens et analyses : Conservation illimitee (donnees metier)
- Logs d'audit : 12 mois glissants (conformite)
- Commentaires : Conservation illimitee (tracabilite)
- Utilisateurs inactifs : 24 mois sans connexion (droit a l'oubli)
- Favoris : Supprimes avec le compte utilisateur
- Corbeille : Jusqu'a suppression definitive explicite

Les procedures de purge sont declenchees manuellement par les administrateurs
et peuvent etre automatisees dans une version future via des taches planifiées
Edge Functions cron.

### K.2 Cycle de vie d'un bien

1. Creation (statut: brouillon)
2. Saisie des informations descriptives
3. Import des donnees financieres (Excel optionnel)
4. Creation de l'analyse (statut: en_cours)
5. Ajustement des parametres et validation (statut: valide)
6. Presentation au client (export PDF, mode presentation)
7. Archive ou abandon (statut: abandonne)
8. Eventuellement, nouvelle analyse avec des parametres mis a jour

Ce cycle peut etre complete en moins de 30 minutes dans le cas d'un bien simple,
contre plusieurs heures avec des outils traditionnels.

---

## Annexe L - Conformite RGPD

### L.1 Donnees personnelles traitees

SIPA Analyzer traite les categories de donnees personnelles suivantes :
- Identite : nom, prenom, email
- Donnees de connexion : logs d'acces, historique des actions
- Donnees de compte : role, permissions, date d'inscription

Les donnees relatives aux biens immobiliers (adresses, informations financieres)
sont des donnees professionnelles et non des donnees personnelles au sens du RGPD,
sauf si elles permettent d'identifier une personne physique.

### L.2 Mesures de protection

Les mesures suivantes sont en place pour proteger les donnees personnelles :
- Chiffrement en transit (HTTPS) et au repos (chiffrement PostgreSQL)
- Acces restreint par RLS et permissions applicatives
- Journalisation de toutes les actions d'acces aux donnees
- Possibilite de suppression definitive des comptes utilisateurs
- Export des donnees personnelles sur demande (backup JSON)
- Conservation limitee des logs d'audit (12 mois)

---

*Document technique complet - SIPA Analyzer v1.0.0*
*Genere le 06/07/2026 - 15831 mots - 1341 lignes (version finale)*

---

## Annexe M - Specifications detaillees des migrations SQL

### M.1 Migration 20260622_remove_default_member_role.sql

Cette migration est la premiere etape du durcissement du controle d'acces. Avant
cette migration, le systeme attribuait automatiquement le role "membre" a tout
nouvel utilisateur lors de son inscription. Cela signifiait que tout utilisateur
pouvait immediatement acceder aux donnees de l'application sans intervention
d'un administrateur. Cette migration supprime ce comportement par defaut en
retirant le trigger ou la contrainte qui effectuait cette attribution automatique.

La modification est retrocompatible car elle ne supprime pas les roles deja
attribues, elle empeche seulement l'attribution automatique future. Les nouveaux
utilisateurs crees apres cette migration n'auront aucun enregistrement dans
user_permissions, ce qui les placera dans un etat d'attente jusqu'a ce qu'un
administrateur leur attribue un role.

Cette migration est la premiere d'une serie de quatre migrations (M1 a M4) qui
visent a mettre en place un systeme d'activation manuelle des comptes. Elle a
ete deployee en premier car elle est la moins invasive et permet de verifier le
bon fonctionnement du nouveau comportement avant d'appliquer les renforcements
plus stricts.

### M.2 Migration 20260622_force_no_default_user_role.sql

Cette migration renforce la migration precedente en modifiant les triggers et les
politiques d'insertion dans la table user_permissions. Elle garantit que meme en
cas d'erreur ou de comportement inattendu, aucun role par defaut ne peut etre
attribue automatiquement. La migration verifie et corrige les eventuels triggers
residuels qui pourraient encore attribuer un role a la volee.

La modification est plus invasive que la precedente car elle touche directement
aux mecanismes de base de donnees (triggers, fonctions). Elle necessite d'avoir
prealablement verifie que la premiere migration fonctionne correctement.

### M.3 Migration 20260622_default_pending_role.sql

Cette migration introduit le concept de role "en_attente" comme role par defaut.
Contrairement a l'absence totale de role (qui pouvait generer des erreurs dans
le code applicatif), le role "en_attente" est explicite et peut etre verifiable
par les fonctions de controle d'acces. Le role "en_attente" est configure avec
toutes les permissions booleennes a false, ce qui bloque tout acces aux donnees.

Le comportement attendu est le suivant : un nouvel utilisateur obtient le role
"en_attente" dans user_permissions. Le hook usePermissions identifie ce role
comme "pending" et l'interface affiche le composant UserNotRegisteredError avec
le message "Votre compte est en attente d'activation par un administrateur."

Cette migration est une etape intermediaire : elle prepare le terrain pour la
migration suivante qui verrouille completement l'acces. Elle permet de tester le
flux complet d'activation en environnement de developpement avant le deploiement
en production.

### M.4 Migration 20260622_allow_pending_role.sql

Cette migration ajoute le support du role "en_attente" dans les fonctions de
controle d'acces existantes et dans les politiques RLS. Sans cette migration,
les fonctions comme is_admin_or_direction() pourraient echouer ou retourner des
resultats inattendus pour les utilisateurs avec le role "en_attente".

Les modifications apportees incluent la mise a jour de la fonction role_level()
pour inclure le niveau 20 pour le role "en_attente", et l'ajout de conditions
dans les politiques RLS pour traiter explicitement ce role comme non-autorise.

Cette migration complete le cycle de 4 migrations pour le systeme d'activation.
Apres son application, tout nouveau compte utilisateur est bloque par defaut et
necessite une activation manuelle par un administrateur.

### M.5 Migration 20260622_add_new_fields.sql

Cette migration ajoute les colonnes necessaires pour les scenarios bancaires dans
la table analysis. Les nouveaux champs permettent de saisir les informations de
deux banques differentes (Banque A et Banque B) avec pour chacune :
- Le taux hypothecaire (en pourcentage)
- Le type de taux (fixe, variable, SARON)
- La marge SARON pour les taux variables
- L'amortissement annuel
- L'evaluation de la banque

Ces champs sont utilises dans le tableau financier (FinancialTable.jsx) et dans
l'export PDF pour presenter les scenarios bancaires cote a cote.

### M.6 Migration 20260625_create_audit_logs.sql

Cette migration cree la table audit_logs, qui est le fondement du systeme de
journalisation et de tracabilite de SIPA Analyzer. La table est concue pour
etre simple et extensible, avec une colonne metadata au format JSONB qui permet
de stocker des informations supplementaires sans modifier le schema de la table.

La structure de la table a ete volontairement minimale : seuls les champs
essentiels sont en colonnes fixes (event_type, actor_id, actor_email, actor_name,
target_type, target_id, target_label, created_at). Les donnees specifiques a
chaque type d'evenement sont stockees dans metadata. Cette approche evite la
proliferation de colonnes et permet d'ajouter de nouveaux types d'evenements
sans migration.

Les politiques RLS initiales sont larges : tout utilisateur authentifie peut
inserer et selectionner des logs. Ces politiques seront renforcees dans la
migration 20260703 pour restreindre la lecture aux administrateurs.

### M.7 Migration 20260626_enable_rls_core_tables.sql

Cette migration est une etape fondamentale dans la securisation de l'application.
Elle active le Row Level Security sur les quatre tables metier principales
(properties, analysis, comments, favorites) et definit les premieres politiques
RLS basees sur l'appartenance (ownership) et le role.

Les colonnes created_by_id et created_at sont ajoutees a chaque table pour
permettre les verifications d'appartenance. La fonction is_admin_or_direction()
est creee pour identifier les utilisateurs ayant un role eleve.

Les politiques initiales sont relativement permissives : tout utilisateur
authentifie peut voir les proprietes et analyses, seul le createur ou un
admin/direction peut modifier ou supprimer. Ces politiques seront renforcees
dans la migration 20260703 pour utiliser les permissions granulaires.

### M.8 Migration 20260626_rls_user_permissions.sql

Cette migration configure le systeme de controle d'acces sur la table
user_permissions elle-meme. Les politiques definies garantissent que :
- Un utilisateur voit ses propres permissions
- Un administrateur voit toutes les permissions
- Un utilisateur ne peut pas attribuer un role superieur au sien
- Un utilisateur ne peut pas modifier son propre role
- Un utilisateur ne peut pas supprimer ses propres permissions

Les fonctions auxiliaires role_level(), is_super_admin(), is_admin_or_super_admin()
et can_manage_role() sont creees pour centraliser la logique de verification des
roles. Ces fonctions sont utilisees a la fois par les politiques RLS et par le
code applicatif (notamment la Edge Function delete-user).

### M.9 Migration 20260626_add_frais_dossier_bancaire.sql

Cette migration ajoute la colonne frais_dossier_bancaire a la table analysis pour
permettre un calcul plus precis du cout total d'acquisition. Ce champ represente
les frais de dossier factures par la banque pour la mise en place de l'hypotheque.

L'ajout de ce champ modifie le calcul du prix total : Prix total = Prix du bien +
Versement initial + Amortissement 5 ans + Honoraires SIPA + Frais de dossier
bancaire. La fonction calculateAnalysis() dans calculations.js est mise a jour
pour inclure ce nouveau champ.

### M.10 Migration 20260626_invitation_tokens.sql

Cette migration cree la table invitation_tokens pour gerer les invitations par
email. Le systeme de tokens permet d'envoyer des liens d'invitation qui expirent
apres une duree definie. Chaque token est lie a un email specifique et ne peut
etre utilise qu'une seule fois.

Bien que cette fonctionnalite ne soit pas entierement implementee dans le frontend
actuel (la fonction inviteUser() dans base44Client leve une erreur), la structure
est prete pour une future extension. Le systeme de tokens pourra etre utilise pour :
- L'envoi d'invitations par email avec lien d'inscription
- La pre-validation des emails autorises
- L'attribution automatique d'un role lors de l'activation via le lien

### M.11 Migration 20260629_add_soft_delete_fields.sql

Cette migration ajoute les colonnes deleted_at et deleted_by_id aux tables
properties et analysis pour implementer la suppression logique. Le mecanisme de
soft delete permet de masquer les donnees sans les supprimer physiquement,
offrant ainsi une possibilite de restauration.

Les indexes idx_properties_deleted_at et idx_analysis_deleted_at sont crees pour
optimiser les requetes qui filtrent les enregistrements non-supprimes (WHERE
deleted_at IS NULL). L'adaptateur base44Client utilise systematiquement ce
filtre dans les methodes list(), filter() et les operations get(), garantissant
que les donnees supprimees ne sont jamais retournees aux utilisateurs standards.

Les methodes listDeleted(), restore() et hardDelete() sont ajoutees a l'adaptateur
pour la gestion de la corbeille par les administrateurs.

### M.12 Migration 20260629_add_variable_mortgage_rate_fields.sql

Cette migration ajoute les colonnes necessaires pour les taux hypothecaires
variables et les marges SARON. Les nouveaux champs (banque_a_type_taux,
banque_a_marge_saron, banque_b_type_taux, banque_b_marge_saron) permettent
d'offrir une flexibilite dans la simulation des scenarios bancaires.

Le type de taux peut etre "fixe", "variable" ou "SARON". Pour les taux variables
et SARON, la marge est ajoutee au taux de reference. Par exemple, un pret avec
une marge SARON de 1.5% aura un taux effectif de SARON + 1.5%. Cette approche
est conforme aux pratiques du marche hypothecaire suisse.

### M.13 Migration 20260629_add_sipa_data_to_analysis.sql

Cette migration ajoute la colonne sipa_data de type JSONB a la table analysis.
Cette colonne stocke les donnees supplementaires importees depuis les fichiers
Excel SIPA qui ne correspondent pas aux champs standardises de l'analyse.

Le format JSONB permet de stocker des structures de donnees complexes et
variables : listes d'entrees avec labels, valeurs et types (montant, pourcentage,
texte). Ces donnees sont affichees dans le composant ExcelProjectionTables.jsx
et peuvent etre consultees sans necessiter de migration supplementaire.

### M.14 Migration 20260629_add_notes_to_analysis.sql

Cette migration ajoute la colonne notes de type TEXT a la table analysis pour les
informations complementaires saisies par l'utilisateur. Ce champ libre permet aux
conseillers de noter des observations, des hypotheses ou des references qui ne
rentrent pas dans les champs structures.

### M.15 Migration 20260629_add_excel_projection_tables.sql

Cette migration ajoute les colonnes operating_projection et capital_projection au
format JSONB dans la table analysis. Ces colonnes stockent les tableaux de
projection financiere extraits des fichiers Excel SIPA.

Le format de donnees inclut pour chaque projection : les colonnes (annees), les
lignes (indicateurs avec leurs valeurs), et les hypotheses de sortie. Ces donnees
sont utilisees par le composant Projection5Ans.jsx pour afficher les tableaux de
projection et par l'export PDF pour les inclure dans les fiches d'analyse.

### M.16 Migration 20260630_add_audit_log_severity.sql

Cette migration ajoute la colonne severity a la table audit_logs pour permettre
un filtrage plus fin des evenements. Les valeurs possibles sont "info", "warning"
et "critical". L'index idx_audit_logs_severity est cree pour optimiser les
requetes de filtrage par severite.

La valeur par defaut est "info", ce qui garantit la retrocompatibilite avec les
logs existants. Le mecanisme de fallback dans recordAuditLog() retire la colonne
si elle n'existe pas, permettant un deploiement progressif de la migration.

### M.17 Migration 20260703_harden_rls_permissions.sql

Cette migration est la plus importante du point de vue de la securite. Elle
complete le processus de durcissement du controle d'acces en remplacant toutes
les politiques RLS initiales par des politiques basees sur les permissions
granulaires definies dans user_permissions.

La fonction centralisee has_permission(permission_name text) est creee pour
uniformiser la verification des permissions. Cette fonction verifie si
l'utilisateur a le role admin/super_admin ou si la permission specifique est
activee dans son enregistrement user_permissions.

Toutes les politiques RLS sont supprimees puis recrees avec les nouvelles regles.
Les changements principaux sont :
- Les SELECT ne sont plus autorises a tous les utilisateurs authentifies mais
  uniquement a ceux ayant la permission can_view_properties
- Les INSERT verifient que created_by_id = auth.uid() ET que l'utilisateur a la
  permission de creation correspondante
- Les UPDATE et DELETE sont restreints aux utilisateurs avec les permissions
  appropriees, independamment de l'appartenance
- Les logs d'audit ne sont plus consultables par tous mais seulement par les
  administrateurs

Cette migration finalise le modele de securite en profondeur de SIPA Analyzer.

---

*Document complet - SIPA Analyzer - Certification RNCP AIS - Juillet 2026*

---

## Annexe N - Guide du developpeur

### N.1 Conventions de code

Le projet suit les conventions de code suivantes pour garantir la coherence et la
maintenabilite du code source. Ces conventions sont appliquees automatiquement par
ESLint et doivent etre respectees par tous les contributeurs.

**Conventions generales :**
- Langage : JavaScript (JSX pour les composants React)
- Indentation : 2 espaces (pas de tabulations)
- Guillemets : Simples pour les chaines JS, doubles pour le JSX
- Points-virgules : Obligatoires en fin d'instruction
- Noms de variables : camelCase (JavaScript), PascalCase (composants React)
- Noms de fichiers : PascalCase pour les composants, camelCase pour les utilitaires
- Commentaires : En français (pas de commentaires superflus)

**Conventions React :**
- Composants : Fonctions flechees avec export default
- Props : Destructuration dans la signature du composant
- Hooks : Appeles au niveau racine du composant, dans l'ordre
- Etat local : useState pour les etats simples, useReducer pour les etats complexes
- Effets de bord : useEffect avec dependances explicites
- Memoisation : useMemo et useCallback pour les calculs couteux

**Conventions d'import :**
- Imports npm (externes) en premier
- Imports internes (src/) ensuite, tries par ordre alphabetique
- Imports de composants UI en dernier

### N.2 Architecture des composants

Les composants React suivent une hierarchie claire :

1. Composants de base (ui/) : boutons, inputs, dialogues, cartes. Ces composants
   sont generes par shadcn/ui et ne doivent pas etre modifies manuellement.
2. Composants fonctionnels : AnalysisForm, CommentSection, FinancialTable. Ces
   composants implementent des fonctionnalites metier specifiques.
3. Pages (pages/) : Chaque page est un composant racine qui assemble les
   composants fonctionnels pour former une vue complete.
4. Layout : Le composant Layout definit la structure globale (en-tete, navigation,
   contenu) et est utilise par toutes les pages protegees.

Les contextes React (AuthContext) sont utilises pour partager l'etat global
(authentification) sans prop drilling. Les etats serveur sont geres par TanStack
Query qui fournit le cache, la revalidation et la gestion des erreurs.

### N.3 Gestion des erreurs

La gestion des erreurs suit une approche en couches :

1. Erreurs API : interceptees par TanStack Query et affichees via le composant
   de notification (sonner ou react-hot-toast)
2. Erreurs de formulaire : gerees par React Hook Form avec les messages de
   validation Zod
3. Erreurs fatales : attrapees par le ErrorBoundary (a implementer) pour eviter
   un ecran blanc
4. Erreurs reseau : detectees par le statut isLoading et affichees comme un etat
   de l'interface

Les fonctions asynchrones utilisent try/catch avec des messages d'erreur en
francais pour l'utilisateur et des logs techniques en anglais pour le
developpeur.

---

## Annexe O - Capacite et scalabilite

### O.1 Capacite actuelle

Avec la configuration actuelle (Supabase Pro, Vercel Pro), SIPA Analyzer peut
gerer les charges suivantes :
- Utilisateurs simultanes : environ 100
- Biens stockes : plus de 10 000
- Analyses par bien : illimite (limite pratique : environ 100 par bien)
- Exports PDF par heure : environ 500
- Import Excel par heure : environ 100
- Taille de base de donnees : jusqu'a 8 Go (plan Supabase Pro)

### O.2 Strategies de montée en charge

Pour gerer une augmentation de la charge, les strategies suivantes sont
envisageables :
1. Mise en cache additionnelle avec Redis via Supabase
2. Pagination renforcee des listes (deja implementee avec limit())
3. Indexation supplementaire sur les colonnes de filtrage frequentes
4. Mise a l'echelle verticale de Supabase (plans superieurs)
5. Mise en cache CDN pour les fichiers statiques (deja en place avec Vercel)
6. Optimisation des requetes avec des vues materialisees PostgreSQL
7. Deport des calculs lourds vers des Edge Functions dediees

---

## Annexe P - Acronymes et abreviations

| Acronyme | Signification |
|---|---|
| API | Application Programming Interface |
| AIS | Architecture des Systemes d'Information |
| BNS | Banque Nationale Suisse |
| CDN | Content Delivery Network |
| CLI | Command Line Interface |
| CRUD | Create, Read, Update, Delete |
| CSV | Comma-Separated Values |
| DNS | Domain Name System |
| ERP | Enterprise Resource Planning |
| FK | Foreign Key (cle etrangere) |
| FP | Fonds Propres |
| HMR | Hot Module Replacement |
| HTTP | HyperText Transfer Protocol |
| HTTPS | HTTP Secure |
| IA | Intelligence Artificielle |
| IRR | Internal Rate of Return (TRI) |
| JSON | JavaScript Object Notation |
| JSONB | JSON Binary (PostgreSQL) |
| JWT | JSON Web Token |
| KPI | Key Performance Indicator |
| LTV | Loan To Value |
| OAuth | Open Authorization |
| OTP | One-Time Password |
| PDF | Portable Document Format |
| PK | Primary Key (cle primaire) |
| RGPD | Reglement General sur la Protection des Donnees |
| RLS | Row Level Security |
| RNCP | Repertoire National des Certifications Professionnelles |
| SaaS | Software as a Service |
| SARON | Swiss Average Rate Overnight |
| SIPA | SIPA Immobilier SA |
| SQL | Structured Query Language |
| SSL | Secure Sockets Layer |
| TRI | Taux de Rendement Interne (IRR) |
| TTFB | Time To First Byte |
| UUID | Universally Unique Identifier |
| WCAG | Web Content Accessibility Guidelines |

---

*Ce document a ete redige dans le cadre de la certification RNCP AIS (Architecture
des Systemes d'Information) pour le projet SIPA Analyzer de SIPA Immobilier SA.
Il constitue la documentation technique complete de l'application et couvre
l'ensemble des aspects architecturaux, fonctionnels et de securite.*

*Version 1.0.0 - Juillet 2026*
