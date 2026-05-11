import Papa from 'papaparse';
import { getGeminiHidingLocation, getGeminiHints } from './geminiGeoService';

export interface GeoSeekerLocation {
  city: string;
  state: string;
  lat: number;
  lng: number;
  olympic_count_state: number;
  paralympic_count_state: number;
  sports_represented: string[];
  dominant_sports: string[];
  region: string;
  clue_facts: string[];
}

interface AthleteData {
  name: string;
  sport: string;
  hometown_city: string;
  hometown_state: string;
  category: 'olympians' | 'paralympians';
}

export const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

const STATE_COORDS: Record<string, { lat: number; lng: number }> = {
  'AL': { lat: 32.806671, lng: -86.791130 },
  'AK': { lat: 61.370716, lng: -152.404419 },
  'AZ': { lat: 33.729759, lng: -111.431221 },
  'AR': { lat: 34.969704, lng: -92.373123 },
  'CA': { lat: 36.116203, lng: -119.681564 },
  'CO': { lat: 39.059811, lng: -105.311104 },
  'CT': { lat: 41.597782, lng: -72.755371 },
  'DE': { lat: 39.318523, lng: -75.507141 },
  'FL': { lat: 27.766279, lng: -81.686783 },
  'GA': { lat: 33.040619, lng: -83.643074 },
  'HI': { lat: 21.094318, lng: -157.498337 },
  'ID': { lat: 44.240459, lng: -114.478828 },
  'IL': { lat: 40.349457, lng: -88.986137 },
  'IN': { lat: 39.849426, lng: -86.258278 },
  'IA': { lat: 42.011539, lng: -93.210526 },
  'KS': { lat: 38.526600, lng: -96.726486 },
  'KY': { lat: 37.668140, lng: -84.670067 },
  'LA': { lat: 31.169546, lng: -91.867805 },
  'ME': { lat: 44.693947, lng: -69.381927 },
  'MD': { lat: 39.063946, lng: -76.802101 },
  'MA': { lat: 42.230171, lng: -71.530106 },
  'MI': { lat: 43.326618, lng: -84.536095 },
  'MN': { lat: 45.694454, lng: -93.900192 },
  'MS': { lat: 32.741646, lng: -89.678696 },
  'MO': { lat: 38.456085, lng: -92.288368 },
  'MT': { lat: 46.921925, lng: -110.454353 },
  'NE': { lat: 41.125370, lng: -98.268082 },
  'NV': { lat: 38.313515, lng: -117.055374 },
  'NH': { lat: 43.452492, lng: -71.563896 },
  'NJ': { lat: 40.298904, lng: -74.521011 },
  'NM': { lat: 34.840515, lng: -106.248482 },
  'NY': { lat: 42.165726, lng: -74.948051 },
  'NC': { lat: 35.630066, lng: -79.806419 },
  'ND': { lat: 47.528912, lng: -99.784012 },
  'OH': { lat: 40.388783, lng: -82.764915 },
  'OK': { lat: 35.565342, lng: -96.928917 },
  'OR': { lat: 44.572021, lng: -122.070938 },
  'PA': { lat: 40.590752, lng: -77.209755 },
  'RI': { lat: 41.680893, lng: -71.511780 },
  'SC': { lat: 33.856892, lng: -80.945007 },
  'SD': { lat: 44.299782, lng: -99.438828 },
  'TN': { lat: 35.747845, lng: -86.692345 },
  'TX': { lat: 31.054487, lng: -97.563461 },
  'UT': { lat: 40.150032, lng: -111.862434 },
  'VT': { lat: 44.045876, lng: -72.710686 },
  'VA': { lat: 37.769337, lng: -78.169968 },
  'WA': { lat: 47.400902, lng: -121.490494 },
  'WV': { lat: 38.491226, lng: -80.954453 },
  'WI': { lat: 44.268543, lng: -89.616508 },
  'WY': { lat: 42.755966, lng: -107.302490 }
};

const REGIONS: Record<string, string> = {
  'CT': 'Northeast', 'ME': 'Northeast', 'MA': 'Northeast', 'NH': 'Northeast', 'RI': 'Northeast', 'VT': 'Northeast',
  'NJ': 'Northeast', 'NY': 'Northeast', 'PA': 'Northeast',
  'IL': 'Midwest', 'IN': 'Midwest', 'MI': 'Midwest', 'OH': 'Midwest', 'WI': 'Midwest',
  'IA': 'Midwest', 'KS': 'Midwest', 'MN': 'Midwest', 'MO': 'Midwest', 'NE': 'Midwest', 'ND': 'Midwest', 'SD': 'Midwest',
  'DE': 'South', 'FL': 'South', 'GA': 'South', 'MD': 'South', 'NC': 'South', 'SC': 'South', 'VA': 'South', 'WV': 'South',
  'AL': 'South', 'KY': 'South', 'MS': 'South', 'TN': 'South', 'AR': 'South', 'LA': 'South', 'OK': 'South', 'TX': 'South',
  'AZ': 'West', 'CO': 'West', 'ID': 'West', 'MT': 'West', 'NV': 'West', 'NM': 'West', 'UT': 'West', 'WY': 'West',
  'AK': 'West', 'CA': 'West', 'HI': 'West', 'OR': 'West', 'WA': 'West'
};

export async function generateGeoSeekerLocations(singleStateOnly: boolean = false): Promise<GeoSeekerLocation[]> {
  const csvPath = '/para_alpine_skiing_paralympians.csv';
  
  const response = await fetch(csvPath);
  const csvText = await response.text();
  
  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: true,
      complete: async (results) => {
        const athleteData: AthleteData[] = results.data
          .filter((row: any) => row.hometown_state && row.hometown_city)
          .map((row: any) => ({
            name: row.name,
            sport: row.sport || 'Para Alpine Skiing',
            hometown_city: row.hometown_city,
            hometown_state: row.hometown_state,
            category: 'paralympians' as const
          }));

        const stateStats = new Map<string, {
          cities: Set<string>;
          sports: Set<string>;
          olympicCount: number;
          paralympicCount: number;
        }>();

        athleteData.forEach(athlete => {
          const state = athlete.hometown_state;
          if (!stateStats.has(state)) {
            stateStats.set(state, {
              cities: new Set(),
              sports: new Set(),
              olympicCount: 0,
              paralympicCount: 0
            });
          }
          
          const stats = stateStats.get(state)!;
          stats.cities.add(athlete.hometown_city);
          stats.sports.add(athlete.sport);
          if (athlete.category === 'paralympians') {
            stats.paralympicCount++;
          } else {
            stats.olympicCount++;
          }
        });

        const locations: GeoSeekerLocation[] = [];

        // If singleStateOnly, pick one random state
        const statesToProcess = singleStateOnly 
          ? [Array.from(stateStats.entries())[Math.floor(Math.random() * stateStats.size)]]
          : Array.from(stateStats.entries());

        console.log(`🎲 Processing ${statesToProcess.length} state(s)...`);

        // Use Gemini to pick locations for each state
        for (const [state, stats] of statesToProcess) {
          const coords = STATE_COORDS[state];
          if (!coords) continue;

          const sportsArray = Array.from(stats.sports);
          const citiesArray = Array.from(stats.cities);
          const region = REGIONS[state] || 'Unknown';
          const totalAthletes = stats.olympicCount + stats.paralympicCount;
          const stateName = STATE_NAMES[state] || state;

          // Ask Gemini to analyze CSV and pick a location
          const geminiLocation = await getGeminiHidingLocation(
            state,
            stateName
          );

          let lat = coords.lat;
          let lng = coords.lng;
          let locationName = stateName;

          if (geminiLocation) {
            lat = geminiLocation.lat;
            lng = geminiLocation.lng;
            locationName = geminiLocation.locationName;
          }

          // Get Gemini-generated hints (Gemini will analyze CSV data)
          const hints = await getGeminiHints(
            state,
            stateName,
            locationName
          );

          const location: GeoSeekerLocation = {
            city: locationName,
            state: state,
            lat: lat,
            lng: lng,
            olympic_count_state: stats.olympicCount,
            paralympic_count_state: stats.paralympicCount,
            sports_represented: sportsArray,
            dominant_sports: sportsArray.slice(0, 2),
            region: region,
            clue_facts: hints
          };

          locations.push(location);
        }

        resolve(locations);
      }
    });
  });
}

function generateClueFacts(
  state: string,
  stats: { cities: Set<string>; sports: Set<string>; olympicCount: number; paralympicCount: number },
  region: string,
  sports: string[]
): string[] {
  const facts: string[] = [];
  
  const totalAthletes = stats.olympicCount + stats.paralympicCount;
  
  facts.push(`This state has contributed ${totalAthletes} Team USA athletes to the collective story.`);
  
  if (stats.paralympicCount > 0) {
    facts.push(`The dataset shows strong Paralympic representation from this state.`);
  }
  
  if (sports.length > 1) {
    facts.push(`Athletes from this state appear across ${sports.length} different sports.`);
  } else {
    facts.push(`This state shows concentrated representation in ${sports[0]}.`);
  }
  
  facts.push(`This location is in the ${region} region of the United States.`);
  
  if (stats.cities.size > 3) {
    facts.push(`Multiple hometowns across this state contribute to Team USA.`);
  }
  
  return facts;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateScore(distance: number, guessesUsed: number, cluesUsed: number): number {
  const maxScore = 1000;
  const distancePenalty = Math.min(distance * 2, 500);
  const guessPenalty = (guessesUsed - 1) * 50;
  const cluePenalty = cluesUsed * 30;
  
  return Math.max(0, maxScore - distancePenalty - guessPenalty - cluePenalty);
}

export function getNearestState(cameraX: number, cameraZ: number, threshold: number = 50): string | null {
  let nearestState: string | null = null;
  let minDistance = threshold;
  let closestDistance = Infinity;
  let closestState = '';

  console.log(`🔍 Checking camera position: (${cameraX.toFixed(1)}, ${cameraZ.toFixed(1)}) with threshold ${threshold}`);

  Object.entries(STATE_COORDS).forEach(([stateCode, coords]) => {
    const stateLat = coords.lat;
    const stateLng = coords.lng;
    
    const stateX = stateLng * 5;
    const stateZ = -stateLat * 5;
    
    const distance = Math.sqrt(
      Math.pow(cameraX - stateX, 2) + 
      Math.pow(cameraZ - stateZ, 2)
    );
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestState = stateCode;
    }
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestState = stateCode;
    }
  });

  console.log(`   Closest state: ${closestState} at distance ${closestDistance.toFixed(1)}`);
  if (nearestState) {
    console.log(`   ✅ Within threshold! State: ${nearestState}`);
  } else {
    console.log(`   ❌ No state within threshold of ${threshold}`);
  }

  return nearestState;
}

export function getStateCentroid(stateCode: string): { lat: number; lng: number } | null {
  return STATE_COORDS[stateCode] || null;
}
