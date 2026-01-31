import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();

const db = admin.firestore();

// Configuration Weezevent (à mettre dans Firebase Config en prod)
const WEEZEVENT_CONFIG = {
  API_KEY: 'e9eb1511be05dd576bc2eeb3562905b8',
  USERNAME: 'billeterie@pakafestival.fr',
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

// Authentification Weezevent
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

// Récupérer les participants
async function fetchParticipants(token: string): Promise<ParticipantResponse> {
  const url = `https://api.weezevent.com/participant/list?api_key=${WEEZEVENT_CONFIG.API_KEY}&access_token=${token}&id_event[]=${WEEZEVENT_CONFIG.EVENT_ID}&full=1`;
  
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Fetch error: ${response.status}`);
  }

  return await response.json() as ParticipantResponse;
}

// Fonction principale de sync
async function syncWeezeventData() {
  console.log('🚀 Starting Weezevent sync...');
  
  try {
    // 1. Authentification
    const token = await authenticate();
    console.log('✅ Authenticated');

    // 2. Récupérer les participants
    const data = await fetchParticipants(token);
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

    return { success: true, count: data.participants?.length || 0 };
  } catch (error) {
    console.error('❌ Sync error:', error);
    throw error;
  }
}

// Cloud Function schedulée (2nd Gen) - tous les jours à 6h du matin (heure de Paris)
export const dailyWeezeventSync = onSchedule({
  schedule: '0 6 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
}, async () => {
  await syncWeezeventData();
});

// Cloud Function HTTP (2nd Gen) pour sync manuel
export const manualWeezeventSync = onRequest({
  region: 'europe-west1',
  cors: true,
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const result = await syncWeezeventData();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
