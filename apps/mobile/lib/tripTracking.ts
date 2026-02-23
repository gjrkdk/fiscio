import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

export const GPS_TASK = 'FISCIO_GPS_TASK'
const COORDS_KEY = 'fiscio_trip_coords'
const TRIP_META_KEY = 'fiscio_trip_meta'

export type Coord = { lat: number; lon: number; ts: number }

export type TripMeta = {
  startedAt: string // ISO
  description: string
}

// Haversine formule: afstand in km tussen twee GPS-punten
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function berekenTotaalKm(coords: Coord[]): number {
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i - 1]!.lat, coords[i - 1]!.lon, coords[i]!.lat, coords[i]!.lon)
  }
  return Math.round(total * 100) / 100
}

// Background task — ontvangt locatie-updates en slaat op in AsyncStorage
TaskManager.defineTask(GPS_TASK, async ({ data, error }) => {
  if (error) { console.error('GPS task fout:', error); return }
  const { locations } = data as { locations: Location.LocationObject[] }
  if (!locations?.length) return

  try {
    const raw = await AsyncStorage.getItem(COORDS_KEY)
    const coords: Coord[] = raw ? JSON.parse(raw) : []
    for (const loc of locations) {
      coords.push({
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
        ts: loc.timestamp,
      })
    }
    await AsyncStorage.setItem(COORDS_KEY, JSON.stringify(coords))
  } catch (e) {
    console.error('Coords opslaan mislukt:', e)
  }
})

export async function startTracking(description: string): Promise<void> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync()
  if (fg !== 'granted') throw new Error('Locatie-toegang geweigerd')

  const { status: bg } = await Location.requestBackgroundPermissionsAsync()
  if (bg !== 'granted') throw new Error('Achtergrond-locatie geweigerd — ga naar Instellingen')

  // Storage leegmaken voor nieuwe rit
  await AsyncStorage.removeItem(COORDS_KEY)

  const meta: TripMeta = { startedAt: new Date().toISOString(), description }
  await AsyncStorage.setItem(TRIP_META_KEY, JSON.stringify(meta))

  await Location.startLocationUpdatesAsync(GPS_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,       // elke 5 seconden
    distanceInterval: 10,     // of elke 10 meter
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Fiscio — Rit actief',
      notificationBody: 'Ritregistratie loopt...',
      notificationColor: '#2563eb',
    },
  })
}

export async function stopTracking(): Promise<{
  distanceKm: number
  duurSec: number
  coords: Coord[]
  meta: TripMeta
} | null> {
  const isActive = await Location.hasStartedLocationUpdatesAsync(GPS_TASK)
  if (isActive) {
    await Location.stopLocationUpdatesAsync(GPS_TASK)
  }

  const [coordsRaw, metaRaw] = await Promise.all([
    AsyncStorage.getItem(COORDS_KEY),
    AsyncStorage.getItem(TRIP_META_KEY),
  ])

  if (!metaRaw) return null

  const coords: Coord[] = coordsRaw ? JSON.parse(coordsRaw) : []
  const meta: TripMeta = JSON.parse(metaRaw)
  const distanceKm = berekenTotaalKm(coords)
  const duurSec = Math.floor((Date.now() - new Date(meta.startedAt).getTime()) / 1000)

  return { distanceKm, duurSec, coords, meta }
}

export async function slaRitOp(
  meta: TripMeta,
  distanceKm: number,
  eindtijd: Date,
  startAddress: string,
  endAddress: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const { error } = await supabase.from('trips').insert({
    user_id: user.id,
    description: meta.description || 'Zakelijke rit',
    start_address: startAddress,
    end_address: endAddress,
    distance_km: distanceKm.toFixed(2),
    started_at: meta.startedAt,
    ended_at: eindtijd.toISOString(),
    is_business_trip: true,
  })

  if (error) throw new Error(error.message)

  await Promise.all([
    AsyncStorage.removeItem(COORDS_KEY),
    AsyncStorage.removeItem(TRIP_META_KEY),
  ])
}

export async function isTrackingActief(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(GPS_TASK)
  } catch {
    return false
  }
}

export async function getLiveCoords(): Promise<Coord[]> {
  const raw = await AsyncStorage.getItem(COORDS_KEY)
  return raw ? JSON.parse(raw) : []
}

export async function getActiveMeta(): Promise<TripMeta | null> {
  const raw = await AsyncStorage.getItem(TRIP_META_KEY)
  return raw ? JSON.parse(raw) : null
}
