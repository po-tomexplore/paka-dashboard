import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import type { Participant, ParticipantResponse } from '../types'

const firebaseConfig = {
  apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // À remplacer
  authDomain: "portfolio-d0bfe.firebaseapp.com",
  projectId: "portfolio-d0bfe",
  storageBucket: "portfolio-d0bfe.appspot.com",
  messagingSenderId: "xxxxxxxxxxxx", // À remplacer
  appId: "1:xxxxxxxxxxxx:web:xxxxxxxxxxxx" // À remplacer
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

interface FirestoreSnapshot {
  participants: Participant[]
  serverTime: string
  counter: number
  counterDeleted: number
  counterTotal: number
  syncedAt: Timestamp
  syncedAtISO: string
}

export const fetchParticipantsFromFirestore = async (): Promise<ParticipantResponse & { syncedAt: string }> => {
  const docRef = doc(db, 'weezevent_snapshots', 'latest')
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    throw new Error('Aucune donnée disponible. Le sync initial n\'a pas encore été effectué.')
  }

  const data = docSnap.data() as FirestoreSnapshot

  return {
    participants: data.participants || [],
    server_time: data.serverTime,
    counter: data.counter,
    counter_deleted: data.counterDeleted,
    counter_total: data.counterTotal,
    syncedAt: data.syncedAtISO
  }
}

// URL de la Cloud Function pour le sync manuel (2nd Gen)
const MANUAL_SYNC_URL = 'https://manualweezeventsync-ix53plx36q-ew.a.run.app'

export const triggerManualSnapshot = async (): Promise<{ success: boolean; count: number }> => {
  const response = await fetch(MANUAL_SYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Erreur lors du snapshot: ${error}`)
  }

  return await response.json()
}

// Types pour les événements du graphique
export interface GraphEvent {
  id: string
  date: string
  label: string
}

// Récupérer tous les événements
export const fetchGraphEvents = async (): Promise<GraphEvent[]> => {
  const eventsRef = collection(db, 'graph_events')
  const snapshot = await getDocs(eventsRef)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as GraphEvent[]
}

// Ajouter un événement
export const addGraphEvent = async (event: Omit<GraphEvent, 'id'>): Promise<GraphEvent> => {
  const eventsRef = collection(db, 'graph_events')
  const docRef = await addDoc(eventsRef, event)
  
  return {
    id: docRef.id,
    ...event
  }
}

// Supprimer un événement
export const deleteGraphEvent = async (eventId: string): Promise<void> => {
  const eventRef = doc(db, 'graph_events', eventId)
  await deleteDoc(eventRef)
}

export { db }
