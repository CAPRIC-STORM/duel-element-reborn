# Duel d'Élément Reborn

Nouvelle fondation du TCG, séparée en quatre responsabilités :

- `packages/game-data` : catalogue canonique des runes et Spirits.
- `packages/game-core` : règles déterministes sans React ni PixiJS.
- `apps/client` : deckbuilder React et table de duel PixiJS.
- `apps/server` : rooms Colyseus autoritaires.

## Démarrage

```bash
npm install
npm run dev
```

Client : `http://localhost:5174`

Serveur Colyseus : `ws://localhost:2567`

## Jeu entre amis

Depuis l’accueil, **Ouvrir un salon** crée une room privée et affiche son code. Le second joueur saisit ce code avec son propre grimoire et son propre Spirit. Le serveur valide les commandes, synchronise le duel et ne transmet jamais le contenu de la main ou de la pioche adverse.

Les grimoires contiennent de 5 à 20 runes. Chaque rune possède une version Standard et une version Alter ; les deux versions partagent la limite de trois exemplaires et alimentent le même élément de Spirit.

## Mise en ligne

Le client statique peut être déployé sur Firebase Hosting. Le serveur Colyseus doit être hébergé sur un service acceptant les WebSockets persistants, par exemple Render, Railway, Fly.io ou Colyseus Cloud ; Firebase Hosting ne peut pas exécuter cette room.

1. Construire l’image serveur avec `docker build -f Dockerfile.server -t duel-element-server .`.
2. Déployer cette image en exposant la variable `PORT` fournie par l’hébergeur.
3. Copier `apps/client/.env.example` vers `apps/client/.env.production` et remplacer l’adresse par l’URL `wss://` du serveur.
4. Lancer `npm run build -w @duel/client`, puis publier `apps/client/dist` sur Firebase Hosting.

### Publication de test recommandée

1. Publier ce dossier dans un dépôt GitHub.
2. Dans Render, choisir **New > Blueprint**, connecter le dépôt et sélectionner `render.yaml`.
3. Attendre que Render affiche une adresse du type `https://duel-element-server.onrender.com`.
4. Créer `apps/client/.env.production` avec :

```env
VITE_DUEL_SERVER_URL=wss://duel-element-server.onrender.com
```

5. Depuis la racine du projet, lancer :

```bash
firebase login
npm run deploy:client
```

Le site devient alors accessible sur `https://duel-de-runes.web.app`. Le plan gratuit de Render peut endormir le serveur après une période sans activité ; la première ouverture d’un salon peut donc demander un court réveil.

## Contrat du moteur

Le client envoie une commande. Le core la valide et retourne un nouvel état accompagné d'événements. PixiJS anime ces événements mais ne décide jamais des règles.

```text
Command -> validate -> reduce -> { state, events } -> presentation
```
