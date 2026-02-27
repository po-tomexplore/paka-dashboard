import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();

const db = admin.firestore();

// Configuration Weezevent (à mettre dans Firebase Config en prod)
const WEEZEVENT_CONFIG = {
  API_KEY: 'e9eb1511be05dd576bc2eeb3562905b8',
  USERNAME: 'billetterie@pakafestival.fr',
  PASSWORD: 'rvJz3Nbyk4HDsK5',
  EVENT_ID: '1364696'
};

interface Participant {
  id_participant: number;
  barcode: string;
  create_date: string;
  deleted: string;
  paid: boolean;
  owner: {
    first_name: string;
    last_name: string;
    email: string;
  };
  control_status: {
    status: string;
    scan_date: string;
  };
  id_ticket: string;
  answers?: Array<{ label: string; value: string }>;
  buyer?: {
    id_acheteur: string;
    email_acheteur: string;
    acheteur_last_name: string;
    acheteur_first_name: string;
    answers?: Array<{ label: string; value: string }>;
  };
}

interface ParticipantResponse {
  participants: Participant[];
  server_time: string;
  counter: number;
  counter_deleted: number;
  counter_total: number;
}

// Authentification Weezevent  zef
async function authenticate(): Promise<string> {
  const formData = new URLSearchParams();
  formData.append('username', WEEZEVENT_CONFIG.USERNAME);
  formData.append('password', WEEZEVENT_CONFIG.PASSWORD);
  formData.append('api_key', WEEZEVENT_CONFIG.API_KEY);

  const response = await fetch('https://api.weezevent.com/auth/access_token', {
    method: 'POST',
    headers: {

      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`Auth error: ${response.status}`);
  }

  const data = await response.json() as { accessToken: string };
  return data.accessToken;
}

// Récupérer les participants pour un événement donné
async function fetchParticipants(token: string, eventId: string = WEEZEVENT_CONFIG.EVENT_ID): Promise<ParticipantResponse> {
  const url = `https://api.weezevent.com/participant/list?api_key=${WEEZEVENT_CONFIG.API_KEY}&access_token=${token}&id_event[]=${eventId}&full=1`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Fetch error: ${response.status}`);
  }

  return await response.json() as ParticipantResponse;
}

// Fonction principale de sync
async function syncWeezeventData(eventId: string = WEEZEVENT_CONFIG.EVENT_ID) {
  console.log(`🚀 Starting Weezevent sync for event ${eventId}...`);

  try {
    // 1. Authentification
    const token = await authenticate();
    console.log('✅ Authenticated');

    // 2. Récupérer les participants
    const data = await fetchParticipants(token, eventId);
    console.log(`📊 Fetched ${data.participants?.length || 0} participants`);

    // 3. Stocker dans Firestore
    const snapshot = {
      participants: data.participants || [],
      serverTime: data.server_time,
      counter: data.counter,
      counterDeleted: data.counter_deleted,
      counterTotal: data.counter_total,
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncedAtISO: new Date().toISOString()
    };

    await db.collection('weezevent_snapshots').add(snapshot);
    console.log('💾 Snapshot saved to Firestore');

    // 4. Mettre à jour le document "latest" pour accès rapide
    await db.collection('weezevent_snapshots').doc('latest').set(snapshot);
    console.log('✅ Latest snapshot updated');

    // 5. Also save to event-specific document
    await db.collection('weezevent_snapshots').doc(`event_${eventId}`).set(snapshot);
    console.log(`✅ Event ${eventId} snapshot updated`);

    return { success: true, count: data.participants?.length || 0 };
  } catch (error) {
    console.error('❌ Sync error:', error);
    throw error;
  }
}

// Cloud Function schedulée (2nd Gen) - tous les jours à 6h du matin (heure de Paris)
export const dailyWeezeventSync = onSchedule({
  schedule: '0 7 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
}, async () => {
  await syncWeezeventData();
});

// Cloud Function HTTP (2nd Gen) pour sync manuel
// POST / → sync l'événement courant (2026)
// POST avec { event_id, cache_only } → fetch + cache un événement passé (ne re-fetch pas si déjà en cache)
export const manualWeezeventSync = onRequest({
  region: 'europe-west1',
  cors: true,
  memory: '1GiB',
  timeoutSeconds: 120,
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const eventId = req.body?.event_id || WEEZEVENT_CONFIG.EVENT_ID;
    const cacheOnly = req.body?.cache_only === true;

    // cache_only mode: check Firestore first, only fetch if missing
    if (cacheOnly) {
      const docRef = db.collection('weezevent_snapshots').doc(`event_${eventId}`);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const data = docSnap.data();
        res.json({ cached: true, count: data?.totalParticipants || data?.participants?.length || 0 });
        return;
      }

      // Not cached — fetch from API and store as chunks
      const token = await authenticate();
      const data = await fetchParticipants(token, eventId);
      const participants = data.participants || [];

      const CHUNK_SIZE = 400;
      const chunkCount = Math.ceil(participants.length / CHUNK_SIZE);

      // Write metadata document (no participants array — stays under 1MB)
      await docRef.set({
        serverTime: data.server_time,
        counter: data.counter,
        counterDeleted: data.counter_deleted,
        counterTotal: data.counter_total,
        totalParticipants: participants.length,
        chunkCount,
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        syncedAtISO: new Date().toISOString()
      });

      // Write participant chunks to subcollection
      for (let i = 0; i < chunkCount; i++) {
        const chunk = participants.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await docRef.collection('chunks').doc(String(i)).set({ participants: chunk });
      }

      console.log(`✅ Event ${eventId} cached in ${chunkCount} chunks (${participants.length} participants)`);
      res.json({ cached: false, count: participants.length });
      return;
    }

    // Normal sync (existing behavior)
    const result = await syncWeezeventData(eventId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
