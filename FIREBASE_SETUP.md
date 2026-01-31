# Configuration Firebase pour Paka Dashboard

## 1. Activer Firestore et Cloud Functions

Dans la console Firebase (https://console.firebase.google.com/project/portfolio-d0bfe):

1. **Activer Firestore Database**
   - Aller dans "Build" > "Firestore Database"
   - Cliquer "Create database"
   - Choisir "Start in production mode"
   - Sélectionner la région `europe-west1`

2. **Activer Cloud Functions** (nécessite plan Blaze - pay as you go)
   - Aller dans "Build" > "Functions"
   - Upgrader vers le plan Blaze si pas déjà fait

## 2. Récupérer la configuration Firebase pour le front-end

1. Aller dans "Project settings" (icône engrenage)
2. Descendre jusqu'à "Your apps"
3. Si pas d'app web, cliquer "Add app" > Web
4. Copier la configuration `firebaseConfig`

Puis mettre à jour le fichier `src/services/firebase.ts` avec les vraies valeurs:

```typescript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "portfolio-d0bfe.firebaseapp.com",
  projectId: "portfolio-d0bfe",
  storageBucket: "portfolio-d0bfe.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
}
```

## 3. Déployer les Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

## 4. Déployer les règles Firestore

```bash
firebase deploy --only firestore:rules
```

## 5. Faire un premier sync manuel

Après le déploiement, appeler la fonction HTTP pour le premier sync:

```bash
curl -X POST https://europe-west1-portfolio-d0bfe.cloudfunctions.net/manualWeezeventSync
```

Ou utiliser l'URL dans le navigateur (mais en POST).

## 6. Vérifier le scheduler

La fonction `dailyWeezeventSync` s'exécutera automatiquement tous les jours à 6h du matin (heure de Paris).

Pour vérifier les logs:
```bash
firebase functions:log
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Weezevent     │────▶│  Cloud Function  │────▶│    Firestore    │
│      API        │     │  (daily sync)    │     │   (snapshots)   │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │   Front-end     │
                                                 │   (React SPA)   │
                                                 └─────────────────┘
```

## Sécurité

- Les credentials Weezevent sont dans la Cloud Function (côté serveur)
- Le front-end ne peut que LIRE les données Firestore
- Les règles Firestore empêchent l'écriture depuis le client
