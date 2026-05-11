import { Suspense, useState, useEffect, useCallback, useRef, useMemo, startTransition } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Environment, ContactShadows, PerspectiveCamera, MapControls } from '@react-three/drei';
import * as THREE from 'three';
import { USMap3D, stateAbbreviations } from './USMap3D';
import { Falcon } from './Falcon';
import { Clouds } from './Clouds';
import { SportMarkers } from './SportMarkers';
import { Banner } from './Banner';
import { MilestoneChart } from './MilestoneChart';
import { ChartPanel } from './ChartPanel';
import { PieChartPanel } from './PieChartPanel';
import { HometownBarChart } from './HometownBarChart';
import { CameraTracker } from './CameraTracker';
import { FlightPaths } from './FlightPaths';
import { cn } from '../../lib/utils';
import { useGeminiLive } from '../../hooks/useGeminiLive';
import { Mic, RotateCcw, Volume2, Sparkles, Filter, Users, Trophy, BarChart3, Target } from 'lucide-react';
import { generateInspiringStory } from '../../services/geminiService';
import { StoryPanel } from '../StoryPanel';
import { GeoSeekerPanel } from '../GeoSeekerPanel';
import { GeoSeekerGuessDialog } from '../GeoSeekerGuessDialog';
import { GeoSeekerResultDialog } from '../GeoSeekerResultDialog';
import { GeoSeekerLoader } from '../GeoSeekerLoader';
import { TutorialPanel } from '../TutorialPanel';
import Papa from 'papaparse';
import { loadAllCSVData, generateDataSummary } from '../../utils/csvLoader';
import { ChartData, PieChartData, HometownDistributionData, MedalDistributionData, generateChartData, generateRegionalData, generateHometownDistributionData, generateMedalDistributionData } from '../../services/dataAnalystAgent';
import { generateGeoSeekerLocations, getNearestState, calculateDistance, calculateScore, getStateCentroid, STATE_NAMES, type GeoSeekerLocation } from '../../services/geoSeekerService';
import { getHometownSupportInfo } from '../../services/hometownInfoService';
import { getStateSportStatistics } from '../../services/csvDataService';

interface StateStats {
  athleteCount: number;
  gold: number;
  silver: number;
  bronze: number;
  totalMedals: number;
}

export function Scene() {
  const [loaded, setLoaded] = useState(false);
  const [statePositions, setStatePositions] = useState<{ name: string, pos: [number, number, number] }[]>([]);
  const [activePitStop, setActivePitStop] = useState<string | null>(null);
  const [hometownInfo, setHometownInfo] = useState<string>('');
  const [isHometownInfoLoading, setIsHometownInfoLoading] = useState(false);
  const [stateSportData, setStateSportData] = useState<Array<{sport: string, athletes: number, gold: number, silver: number, bronze: number}>>([]);
  const [paralympicCount, setParalympicCount] = useState(0);
  const [olympicCount, setOlympicCount] = useState(0);
  const [yearsRepresented, setYearsRepresented] = useState(0);
  const [medalistCount, setMedalistCount] = useState(0);
  const [qualifiedAthleteCount, setQualifiedAthleteCount] = useState(0);
  const [minYear, setMinYear] = useState(1900);
  const [maxYear, setMaxYear] = useState(new Date().getFullYear());
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [highlightedStates, setHighlightedStates] = useState<string[]>([]);
  const [activeSports, setActiveSports] = useState<string[]>([]);
  const [currentHighlightColor, setCurrentHighlightColor] = useState("#f72585");
  const [skyMode, setSkyMode] = useState<'day' | 'sunset' | 'night'>('day');
  const [viewMode, setViewMode] = useState<'flight' | 'map'>('flight');
  const [activeStory, setActiveStory] = useState<any>(null);
  const [approachingState, setApproachingState] = useState<string | null>(null);
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [sportFilter, setSportFilter] = useState('Para Alpine Skiing');
  const [athleteCategory, setAthleteCategory] = useState<'olympians' | 'paralympians' | null>(null);
  const [pendingCategory, setPendingCategory] = useState<'olympians' | 'paralympians' | 'none'>('none');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showStartPrompter, setShowStartPrompter] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [stateStats, setStateStats] = useState<Record<string, StateStats>>({});
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [pieChartData, setPieChartData] = useState<PieChartData | null>(null);
  const [hometownDistributionData, setHometownDistributionData] = useState<HometownDistributionData | null>(null);
  const [medalDistributionData, setMedalDistributionData] = useState<MedalDistributionData | null>(null);
  const [geoSeekerMode, setGeoSeekerMode] = useState(false);
  const [geoSeekerLoading, setGeoSeekerLoading] = useState(false);
  const [geoSeekerLocation, setGeoSeekerLocation] = useState<GeoSeekerLocation | null>(null);
  const [geoSeekerClueIndex, setGeoSeekerClueIndex] = useState(0);
  const [nearbyState, setNearbyState] = useState<string | null>(null);
  const [showGuessDialog, setShowGuessDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [guessResult, setGuessResult] = useState<{ guessed: string; distance: number; score: number } | null>(null);
  
  // Best of 3 game state
  const [currentRound, setCurrentRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [roundsWon, setRoundsWon] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const colorIndex = useRef(0);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Load CSV data on mount
  useEffect(() => {
    loadAllCSVData().then(datasets => {
      const summary = generateDataSummary(datasets);
      console.log('CSV Data Summary:', summary);
    });
  }, []);

  // Vibrant Scale: Warm Yellow -> Green -> Pink -> Purple
  const getPlasmaColor = (count: number, max: number) => {
    if (max === 0) return "#475569";
    const t = count / max;
    const colors = ["#FCD34D", "#34D399", "#F472B6", "#A78BFA"];
    const idx = Math.min(Math.floor(t * (colors.length - 1)), colors.length - 1);
    return colors[idx];
  };

  const maxAthletes = useMemo(() => {
    const counts = Object.values(stateStats).map(s => s.athleteCount);
    return counts.length > 0 ? Math.max(...counts) : 0;
  }, [stateStats]);

  const handleDiscover = async () => {
    console.log("Discover clicked with category:", pendingCategory);
    // Clear old charts before loading new data
    setChartData(null);
    setMedalDistributionData(null);
    setHometownDistributionData(null);
    
    if (pendingCategory === 'paralympians') {
      try {
        const res = await fetch('/para_alpine_skiing_paralympians.csv');
        if (!res.ok) throw new Error("Failed to load CSV");
        const csvData = await res.text();
        
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log("CSV Parsed, rows:", results.data.length);
            const stats: Record<string, StateStats> = {};
            const names = new Set<string>();
            
            results.data.forEach((row: any) => {
              if (!row.hometown_state) return;
              const stateRef = row.hometown_state.trim();
              
              // Get full name for highlighting consistency
              let stateFullName = stateRef;
              Object.entries(stateAbbreviations).forEach(([full, abbr]) => {
                if (abbr === stateRef) stateFullName = full;
              });

              const stateKey = stateAbbreviations[stateFullName] || stateFullName;
              
              if (!stats[stateKey]) {
                stats[stateKey] = { athleteCount: 0, gold: 0, silver: 0, bronze: 0, totalMedals: 0 };
              }
              
              stats[stateKey].athleteCount += 1;
              
              if (row.medals_gold_silver_bronze) {
                const medals = row.medals_gold_silver_bronze.split('|').map(Number);
                if (medals.length === 3) {
                  const [g, s, b] = medals;
                  stats[stateKey].gold += g || 0;
                  stats[stateKey].silver += s || 0;
                  stats[stateKey].bronze += b || 0;
                  stats[stateKey].totalMedals += (g || 0) + (s || 0) + (b || 0);
                }
              }
              names.add(stateFullName);
            });
            
            console.log("Extracted stats for states:", Object.keys(stats));
            setStateStats(stats);
            setHighlightedStates(Array.from(names));
            setAthleteCategory('paralympians');
            setIsFilterPanelOpen(false);
          }
        });
      } catch (err) {
        console.error("Discovery failed:", err);
      }
    } else if (pendingCategory === 'olympians') {
      try {
        // Determine CSV file based on selected sport
        let csvFile;
        if (sportFilter === '3x3 Basketball') {
          csvFile = '/3x3_basketball_olympians.csv';
        } else if (sportFilter === 'Alpine Skiing') {
          csvFile = '/alpine_skiing_olympians.csv';
        } else if (sportFilter === 'Archery') {
          csvFile = '/archery_olympians.csv';
        } else if (sportFilter === 'Artistic Gymnastics') {
          csvFile = '/artistic_gymnastics_olympians.csv';
        } else if (sportFilter === 'Artistic Swimming') {
          csvFile = '/artistic_swimming_olympians.csv';
        } else if (sportFilter === 'Badminton') {
          csvFile = '/badminton_olympians.csv';
        } else if (sportFilter === 'Baseball') {
          csvFile = '/baseball_olympians.csv';
        } else if (sportFilter === 'Basketball') {
          csvFile = '/basketball_olympians.csv';
        } else if (sportFilter === 'Beach Volleyball') {
          csvFile = '/beach_volleyball_olympians.csv';
        } else if (sportFilter === 'Biathlon') {
          csvFile = '/biathlon_olympians.csv';
        } else if (sportFilter === 'Bobsled') {
          csvFile = '/bobsled_olympians.csv';
        } else if (sportFilter === 'Boxing') {
          csvFile = '/boxing_olympians.csv';
        } else if (sportFilter === 'Canoe/Kayak') {
          csvFile = '/canoe_kayak_olympians.csv';
        } else if (sportFilter === 'Cross-Country Skiing') {
          csvFile = '/cross_country_skiing_olympians.csv';
        } else if (sportFilter === 'Track and Field') {
          csvFile = '/track_and_field_olympians.csv';
        } else {
          csvFile = '/para_alpine_skiing_paralympians.csv';
        }
        
        const res = await fetch(csvFile);
        if (!res.ok) throw new Error(`Failed to load CSV: ${csvFile}`);
        const csvData = await res.text();
        
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log("CSV Parsed, rows:", results.data.length);
            const stats: Record<string, StateStats> = {};
            const names = new Set<string>();
            
            results.data.forEach((row: any) => {
              if (!row.hometown_state) return;
              const stateRef = row.hometown_state.trim();
              
              // Get full name for highlighting consistency
              let stateFullName = stateRef;
              Object.entries(stateAbbreviations).forEach(([full, abbr]) => {
                if (abbr === stateRef) stateFullName = full;
              });

              const stateKey = stateAbbreviations[stateFullName] || stateFullName;
              
              if (!stats[stateKey]) {
                stats[stateKey] = { athleteCount: 0, gold: 0, silver: 0, bronze: 0, totalMedals: 0 };
              }
              
              stats[stateKey].athleteCount += 1;
              
              if (row.medals_gold_silver_bronze) {
                const medals = row.medals_gold_silver_bronze.split('|').map(Number);
                if (medals.length === 3) {
                  const [g, s, b] = medals;
                  stats[stateKey].gold += g || 0;
                  stats[stateKey].silver += s || 0;
                  stats[stateKey].bronze += b || 0;
                  stats[stateKey].totalMedals += (g || 0) + (s || 0) + (b || 0);
                }
              }
              names.add(stateFullName);
            });
            
            console.log("Extracted stats for states:", Object.keys(stats));
            setStateStats(stats);
            setHighlightedStates(Array.from(names));
            setAthleteCategory('olympians');
            setIsFilterPanelOpen(false);
          }
        });
      } catch (err) {
        console.error("Discovery failed:", err);
      }
    } else if (pendingCategory === 'none') {
      setStateStats({});
      setHighlightedStates([]);
      setAthleteCategory(null);
      setIsFilterPanelOpen(false);
    }
  };

  const skyThemes = {
    day: {
      sunPosition: [100, 20, 100] as [number, number, number],
      turbidity: 0.1,
      rayleigh: 0.5,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.7,
      atmosphere: 'radial-gradient(circle at 50% 120%, #7DD3FC 0%, transparent 70%)',
      env: 'city',
      opacity: 0.5
    },
    sunset: {
      sunPosition: [100, 2, 50] as [number, number, number],
      turbidity: 0, 
      rayleigh: 0,
      mieCoefficient: 0,
      mieDirectionalG: 0,
      atmosphere: 'linear-gradient(135deg, #ff5f6d 0%, #ffc371 40%, #7d5fff 100%)',
      env: 'sunset',
      opacity: 0.85,
      lightColor: "#ffc371",
      ambientColor: "#ff5f6d"
    },
    night: {
      sunPosition: [2, -10, 2] as [number, number, number],
      turbidity: 0,
      rayleigh: 0.1,
      mieCoefficient: 0,
      mieDirectionalG: 0,
      atmosphere: 'radial-gradient(circle at 50% 120%, #1a2a6c 0%, #000000 70%)',
      env: 'night',
      opacity: 0.6,
      lightColor: "#7e96e0",
      ambientColor: "#2a3d7d"
    }
  };

  const dayTheme = {
    sunPosition: [100, 20, 100] as [number, number, number],
    turbidity: 0.1,
    rayleigh: 0.5,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    atmosphere: 'radial-gradient(circle at 50% 120%, #7DD3FC 0%, transparent 70%)',
    env: 'city',
    opacity: 0.5,
    lightColor: "#ffffff",
    ambientColor: "#ffffff"
  };

  const currentTheme = skyMode === 'day' ? dayTheme : skyThemes[skyMode];

  const highlightPalette = [
    "#FFB81C", // Gold
    "#BF0A30", // Red
    "#00A651", // Green
    "#002868", // Deep Blue
  ];

  // Handle get_sport_data tool call from Gemini Live
  const handleGetSportData = async (sport: string): Promise<string> => {
    try {
      const sportLower = sport.toLowerCase();
      let csvFile;

      if (sportLower.includes('3x3')) {
        csvFile = '/3x3_basketball_olympians.csv';
      } else if (sportLower.includes('alpine') && !sportLower.includes('para')) {
        csvFile = '/alpine_skiing_olympians.csv';
      } else if (sportLower.includes('archery')) {
        csvFile = '/archery_olympians.csv';
      } else if (sportLower.includes('artistic') && sportLower.includes('gymnastics')) {
        csvFile = '/artistic_gymnastics_olympians.csv';
      } else if (sportLower.includes('artistic') && sportLower.includes('swimming')) {
        csvFile = '/artistic_swimming_olympians.csv';
      } else if (sportLower.includes('badminton')) {
        csvFile = '/badminton_olympians.csv';
      } else if (sportLower.includes('baseball')) {
        csvFile = '/baseball_olympians.csv';
      } else if (sportLower.includes('basketball')) {
        csvFile = '/basketball_olympians.csv';
      } else if (sportLower.includes('beach') && sportLower.includes('volleyball')) {
        csvFile = '/beach_volleyball_olympians.csv';
      } else if (sportLower.includes('biathlon')) {
        csvFile = '/biathlon_olympians.csv';
      } else if (sportLower.includes('bobsled')) {
        csvFile = '/bobsled_olympians.csv';
      } else if (sportLower.includes('boxing')) {
        csvFile = '/boxing_olympians.csv';
      } else if (sportLower.includes('canoe') || sportLower.includes('kayak')) {
        csvFile = '/canoe_kayak_olympians.csv';
      } else if (sportLower.includes('cross') && sportLower.includes('country') && sportLower.includes('skiing')) {
        csvFile = '/cross_country_skiing_olympians.csv';
      } else if (sportLower.includes('track') || sportLower.includes('field')) {
        csvFile = '/track_and_field_olympians.csv';
      } else if (sportLower.includes('para') || sportLower.includes('paralympic')) {
        csvFile = '/para_alpine_skiing_paralympians.csv';
      } else {
        csvFile = '/para_alpine_skiing_paralympians.csv';
      }

      const response = await fetch(csvFile);
      if (!response.ok) {
        throw new Error(`Failed to load CSV: ${csvFile}`);
      }
      const csvData = await response.text();

      // Parse CSV and generate summary
      let totalAthletes = 0;
      let totalGold = 0, totalSilver = 0, totalBronze = 0;
      const stateCounts: Record<string, number> = {};

      return new Promise<string>((resolve, reject) => {
        Papa.parse(csvData, {
          header: true,
          complete: (results) => {
            results.data.forEach((row: any) => {
              if (row.name) {
                totalAthletes++;
                if (row.hometown_state) {
                  stateCounts[row.hometown_state] = (stateCounts[row.hometown_state] || 0) + 1;
                }
                if (row.medals_gold_silver_bronze) {
                  const medals = row.medals_gold_silver_bronze.split('|').map(Number);
                  if (medals.length === 3) {
                    totalGold += medals[0] || 0;
                    totalSilver += medals[1] || 0;
                    totalBronze += medals[2] || 0;
                  }
                }
              }
            });

            const topStates = Object.entries(stateCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([state, count]) => `${state} (${count})`)
              .join(', ');

            const summary = `SPORT: ${sport}
TOTAL ATHLETES: ${totalAthletes}
TOTAL MEDALS: ${totalGold + totalSilver + totalBronze}
- Gold: ${totalGold}
- Silver: ${totalSilver}
- Bronze: ${totalBronze}
TOP STATES: ${topStates}
`;
            resolve(summary);
          },
          error: (err) => {
            reject(err);
          }
        });
      });
    } catch (error) {
      console.error('Error in handleGetSportData:', error);
      return `Error loading data for sport: ${sport}`;
    }
  };

  const { startSession, stopSession, isActive, isConnecting } = useGeminiLive(async (states, sports) => {
    console.log("Gemini Live callback - States:", states, "Sports:", sports);
    console.log("Gemini Live - Sports array:", JSON.stringify(sports));
    
    // Load CSV data directly like handleDiscover does
    if (sports && sports.length > 0) {
      const inferredSport = sports[0].toLowerCase();
      console.log("Gemini Live - Inferred sport:", inferredSport);
      
      // Determine CSV file and category
      let csvFile;
      let sportName = 'Para Alpine Skiing';
      let category: 'olympians' | 'paralympians' = 'paralympians';
      
      if (inferredSport.includes('3x3')) {
        csvFile = '/3x3_basketball_olympians.csv';
        sportName = '3x3 Basketball';
        category = 'olympians';
      } else if (inferredSport.includes('alpine') && !inferredSport.includes('para')) {
        csvFile = '/alpine_skiing_olympians.csv';
        sportName = 'Alpine Skiing';
        category = 'olympians';
      } else if (inferredSport.includes('archery')) {
        csvFile = '/archery_olympians.csv';
        sportName = 'Archery';
        category = 'olympians';
      } else if (inferredSport.includes('artistic') && inferredSport.includes('gymnastics')) {
        csvFile = '/artistic_gymnastics_olympians.csv';
        sportName = 'Artistic Gymnastics';
        category = 'olympians';
      } else if (inferredSport.includes('artistic') && inferredSport.includes('swimming')) {
        csvFile = '/artistic_swimming_olympians.csv';
        sportName = 'Artistic Swimming';
        category = 'olympians';
      } else if (inferredSport.includes('badminton')) {
        csvFile = '/badminton_olympians.csv';
        sportName = 'Badminton';
        category = 'olympians';
      } else if (inferredSport.includes('baseball')) {
        csvFile = '/baseball_olympians.csv';
        sportName = 'Baseball';
        category = 'olympians';
      } else if (inferredSport.includes('basketball') && !inferredSport.includes('3x3')) {
        csvFile = '/basketball_olympians.csv';
        sportName = 'Basketball';
        category = 'olympians';
      } else if (inferredSport.includes('beach') && inferredSport.includes('volleyball')) {
        csvFile = '/beach_volleyball_olympians.csv';
        sportName = 'Beach Volleyball';
        category = 'olympians';
      } else if (inferredSport.includes('biathlon')) {
        csvFile = '/biathlon_olympians.csv';
        sportName = 'Biathlon';
        category = 'olympians';
      } else if (inferredSport.includes('bobsled')) {
        csvFile = '/bobsled_olympians.csv';
        sportName = 'Bobsled';
        category = 'olympians';
      } else if (inferredSport.includes('boxing')) {
        csvFile = '/boxing_olympians.csv';
        sportName = 'Boxing';
        category = 'olympians';
      } else if (inferredSport.includes('canoe') || inferredSport.includes('kayak')) {
        csvFile = '/canoe_kayak_olympians.csv';
        sportName = 'Canoe/Kayak';
        category = 'olympians';
      } else if (inferredSport.includes('cross') && inferredSport.includes('country') && inferredSport.includes('skiing')) {
        csvFile = '/cross_country_skiing_olympians.csv';
        sportName = 'Cross-Country Skiing';
        category = 'olympians';
      } else if (inferredSport.includes('track') || inferredSport.includes('field')) {
        csvFile = '/track_and_field_olympians.csv';
        sportName = 'Track and Field';
        category = 'olympians';
      } else if (inferredSport.includes('para') || inferredSport.includes('paralympic')) {
        csvFile = '/para_alpine_skiing_paralympians.csv';
        sportName = 'Para Alpine Skiing';
        category = 'paralympians';
      }
      
      console.log("Gemini Live - Loading CSV:", csvFile);
      console.log("Gemini Live - Sport name:", sportName);
      console.log("Gemini Live - Category:", category);
      
      // Load and parse CSV
      try {
        const res = await fetch(csvFile);
        if (!res.ok) throw new Error(`Failed to load CSV: ${csvFile}`);
        const csvData = await res.text();
        
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log("Gemini Live - CSV parsed, rows:", results.data.length);
            const stats: Record<string, StateStats> = {};
            const names = new Set<string>();
            
            results.data.forEach((row: any) => {
              if (!row.hometown_state) return;
              const stateRef = row.hometown_state.trim();
              
              // Get full name for highlighting consistency
              let stateFullName = stateRef;
              Object.entries(stateAbbreviations).forEach(([full, abbr]) => {
                if (abbr === stateRef) stateFullName = full;
              });
              
              // Get abbreviation for stats key
              let stateKey = stateRef;
              Object.entries(stateAbbreviations).forEach(([full, abbr]) => {
                if (full === stateFullName) stateKey = abbr;
              });
              
              if (!stats[stateKey]) {
                stats[stateKey] = { athleteCount: 0, gold: 0, silver: 0, bronze: 0, totalMedals: 0 };
              }
              
              stats[stateKey].athleteCount += 1;
              
              // Parse medals
              const medalStr = row.medals_gold_silver_bronze || '';
              if (medalStr) {
                const parts = medalStr.split('|');
                const g = parseInt(parts[0]) || 0;
                const s = parseInt(parts[1]) || 0;
                const b = parseInt(parts[2]) || 0;
                stats[stateKey].gold += g || 0;
                stats[stateKey].silver += s || 0;
                stats[stateKey].bronze += b || 0;
                stats[stateKey].totalMedals += (g || 0) + (s || 0) + (b || 0);
              }
              
              names.add(stateFullName);
            });
            
            console.log("Gemini Live - Extracted stats for states:", Object.keys(stats));
            console.log("Gemini Live - Setting stateStats with", Object.keys(stats).length, "states");
            
            // Update all states
            setStateStats(stats);
            setHighlightedStates(Array.from(names));
            setAthleteCategory(category);
            setSportFilter(sportName);
            
            // Clear chart data
            setChartData(null);
            setMedalDistributionData(null);
            setHometownDistributionData(null);
            
            if (sports && sports.length > 0) {
              setActiveSports(sports);
            }
            
            console.log("Gemini Live - All state updates completed");
          }
        });
      } catch (err) {
        console.error("Gemini Live CSV loading failed:", err);
      }
    } else {
      // Fallback: just highlight states
      console.log("Gemini Live - No sport inferred, just highlighting states");
      setHighlightedStates(states);
    }
  }, handleGetSportData);

  const handleReset = () => {
    setAthleteCategory(null);
    setPendingCategory('none');
    setStateStats({});
    setChartData(null);
    setPieChartData(null);
    setMedalDistributionData(null);
    setHometownDistributionData(null);
    setActiveStory(null);
    setHighlightedStates([]);
    setCurrentHighlightColor("#f72585");
  };

  const handleVisualizeData = async () => {
    // Toggle charts - if already showing, hide them
    if (chartData || medalDistributionData || hometownDistributionData) {
      setChartData(null);
      setMedalDistributionData(null);
      setHometownDistributionData(null);
    } else {
      try {
        // Determine CSV file and category based on selected sport
        let csvFile, category;
        if (sportFilter === '3x3 Basketball') {
          csvFile = '/3x3_basketball_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Alpine Skiing') {
          csvFile = '/alpine_skiing_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Archery') {
          csvFile = '/archery_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Artistic Gymnastics') {
          csvFile = '/artistic_gymnastics_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Artistic Swimming') {
          csvFile = '/artistic_swimming_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Badminton') {
          csvFile = '/badminton_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Baseball') {
          csvFile = '/baseball_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Basketball') {
          csvFile = '/basketball_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Beach Volleyball') {
          csvFile = '/beach_volleyball_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Biathlon') {
          csvFile = '/biathlon_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Bobsled') {
          csvFile = '/bobsled_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Boxing') {
          csvFile = '/boxing_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Canoe/Kayak') {
          csvFile = '/canoe_kayak_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Cross-Country Skiing') {
          csvFile = '/cross_country_skiing_olympians.csv';
          category = 'olympians';
        } else if (sportFilter === 'Track and Field') {
          csvFile = '/track_and_field_olympians.csv';
          category = 'olympians';
        } else {
          csvFile = '/para_alpine_skiing_paralympians.csv';
          category = 'paralympians';
        }
        
        console.log('Loading chart data for:', sportFilter, 'from:', csvFile);
        
        // Generate all chart types when user clicks Visualize Data button
        const lineData = await generateChartData(csvFile, sportFilter, category);
        const medalData = await generateMedalDistributionData(csvFile, sportFilter, category);
        const hometownData = await generateHometownDistributionData(csvFile, sportFilter, category);
        
        if (lineData) setChartData(lineData);
        if (medalData) setMedalDistributionData(medalData);
        if (hometownData) setHometownDistributionData(hometownData);
        
        console.log('Chart data loaded successfully');
      } catch (error) {
        console.error('Error loading chart data:', error);
        alert('Failed to load chart data. Please check the console for details.');
      }
    }
  };

  const startGeoSeekerGame = async () => {
    try {
      console.log('🎮 Starting GeoSeeker Mode...');
      
      // Show loader
      setGeoSeekerLoading(true);
      setGeoSeekerMode(true);
      setViewMode('flight');
      
      // Step 1: Parse CSV to get list of states (NO Gemini calls)
      const response = await fetch('/para_alpine_skiing_paralympians.csv');
      const csvText = await response.text();
      const lines = csvText.split('\n').slice(1); // Skip header
      const states = new Set<string>();
      
      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length > 4 && parts[4]) {
          states.add(parts[4]); // hometown_state column
        }
      });
      
      const stateArray = Array.from(states);
      console.log(`📊 Found ${stateArray.length} states with athletes`);
      
      // Step 2: Pick ONE random state (instant)
      const selectedState = stateArray[Math.floor(Math.random() * stateArray.length)];
      console.log(`🎲 Randomly selected state: ${selectedState}`);
      
      // Step 3: Gemini picks a location within that state
      const { geminiPickLocationInState, geminiGenerateHints } = await import('../../services/geminiStateSelector');
      const locationData = await geminiPickLocationInState(selectedState, selectedState);
      
      if (!locationData) {
        console.error('❌ Could not pick location');
        setGeoSeekerLoading(false);
        return;
      }
      
      // Step 4: Gemini generates hints
      const hints = await geminiGenerateHints(selectedState, selectedState);
      
      // Create the final location (coordinates from Gemini)
      const finalLocation = {
        city: locationData.locationName,
        state: selectedState,
        lat: locationData.lat,
        lng: locationData.lng,
        olympic_count_state: 0,
        paralympic_count_state: 0,
        sports_represented: ['Para Alpine Skiing'],
        dominant_sports: ['Para Alpine Skiing'],
        region: 'USA',
        clue_facts: hints
      };
      
      console.log(`📍 Location: ${locationData.locationName}`);
      console.log('✈️ GeoSeeker ready!');
      
      setGeoSeekerLocation(finalLocation);
      setGeoSeekerClueIndex(0);
      setNearbyState(null);
      setShowGuessDialog(false);
      setShowResultDialog(false);
      setGuessResult(null);
      setGeoSeekerLoading(false); // Hide loader
      
      console.log('✅ GeoSeeker mode active - fly around to find the state!');
    } catch (error) {
      console.error('❌ Error starting GeoSeeker:', error);
      setGeoSeekerLoading(false);
    }
  };

  const handleGeoSeekerGuess = (guessedState: string) => {
    if (!geoSeekerLocation) {
      console.error('❌ No geoSeekerLocation');
      return;
    }

    // Convert full state name to state code (e.g., "South Dakota" -> "SD")
    const guessedStateCode = Object.keys(STATE_NAMES).find(
      code => STATE_NAMES[code] === guessedState
    ) || guessedState;

    console.log(`🎯 Processing guess: ${guessedState} (${guessedStateCode}) vs ${geoSeekerLocation.state}`);

    const guessedCentroid = getStateCentroid(guessedStateCode);
    const hiddenCentroid = getStateCentroid(geoSeekerLocation.state);

    if (!guessedCentroid || !hiddenCentroid) {
      console.error('❌ Could not get centroids');
      return;
    }

    const distance = calculateDistance(
      guessedCentroid.lat,
      guessedCentroid.lng,
      hiddenCentroid.lat,
      hiddenCentroid.lng
    );

    const score = calculateScore(distance, 1, geoSeekerClueIndex);
    const isCorrect = guessedStateCode === geoSeekerLocation.state;

    console.log(`📊 Distance: ${Math.round(distance)} mi, Correct: ${isCorrect}, Score: ${score}`);

    const roundScore = isCorrect ? score : 0;
    
    // Update total score
    setTotalScore(prev => prev + roundScore);
    if (isCorrect) {
      setRoundsWon(prev => prev + 1);
    }

    setGuessResult({
      guessed: guessedStateCode,
      distance,
      score: roundScore
    });

    setShowGuessDialog(false);
    setShowResultDialog(true);
    
    console.log(`✅ Round ${currentRound}/3 complete. Total score: ${totalScore + roundScore}`);
  };

  const nextRound = async () => {
    // Enable 20-second cooldown
    setIsOnCooldown(true);
    console.log('🚫 Answer trigger disabled for 20 seconds');
    console.log('🦅 Bird flying unpaused');
    
    setTimeout(() => {
      setIsOnCooldown(false);
      console.log('✅ Answer trigger re-enabled');
    }, 20000);
    
    if (currentRound < 3) {
      // Start next round
      setCurrentRound(prev => prev + 1);
      setShowResultDialog(false);
      setGuessResult(null);
      setNearbyState(null);
      
      // Generate new location
      await startGeoSeekerGame();
    } else {
      // Game over - reset for new game
      setCurrentRound(1);
      setTotalScore(0);
      setRoundsWon(0);
      setShowResultDialog(false);
      setGuessResult(null);
      setNearbyState(null);
      await startGeoSeekerGame();
    }
  };

  const closeGeoSeeker = () => {
    setGeoSeekerMode(false);
    setGeoSeekerLocation(null);
    setNearbyState(null);
    setShowGuessDialog(false);
    setShowResultDialog(false);
    setGuessResult(null);
    setCurrentRound(1);
    setTotalScore(0);
    setRoundsWon(0);
  };

  const handleCameraNearState = (state: string | null) => {
    if (!geoSeekerMode) return;
    if (showResultDialog) return;
    if (isOnCooldown) return; // Ignore during cooldown
    
    if (state && state !== nearbyState) {
      setNearbyState(state);
      setShowGuessDialog(true);
    } else if (!state && nearbyState) {
      setNearbyState(null);
      setShowGuessDialog(false);
    }
  };

  const handleLoaded = useCallback(() => {
    // Keep loader visible for 3 seconds
    setTimeout(() => setLoaded(true), 3000);
  }, []);
  const handleStatesReady = useCallback((states: any) => setStatePositions(states), []);
  const handlePitStop = useCallback(async (name: string) => {
    if (geoSeekerMode) return; // Disable state arrival panel in GeoSeeker mode
    setActivePitStop(name);
    setActiveStory(null); // Close story if state selected
    
    if (name) {
      setIsHometownInfoLoading(true);
      setHometownInfo('');
      setStateSportData([]);
      
      try {
        // Fetch hometown info (only once, won't reload on slider change)
        const infoPromise = getHometownSupportInfo(name);
        
        // Fetch sport statistics
        const statsPromise = getStateSportStatistics(name);
        
        const [info, statsData] = await Promise.all([infoPromise, statsPromise]);
        
        console.log('📊 Stats Data:', statsData);
        console.log('🏅 Sports:', statsData.sports);
        
        setHometownInfo(info);
        setStateSportData(statsData.sports);
        setParalympicCount(statsData.paralympicAthletes);
        setOlympicCount(statsData.olympicAthletes);
        setYearsRepresented(statsData.yearsRepresented);
        setMedalistCount(statsData.medalists);
        setQualifiedAthleteCount(statsData.qualifiedAthletes);
        setMinYear(statsData.minYear);
        setMaxYear(statsData.maxYear);
        setSelectedYearRange([statsData.minYear, statsData.maxYear]);
      } catch (error) {
        console.error('Error loading hometown info:', error);
        setHometownInfo(`Welcome to ${name}. This state has been a proud supporter of Team USA athletes.`);
      } finally {
        setIsHometownInfoLoading(false);
      }
    }
  }, [geoSeekerMode]);

  const handleYearRangeChange = useCallback(async (newRange: [number, number]) => {
    if (!activePitStop) return;
    
    setSelectedYearRange(newRange);
    
    try {
      const statsData = await getStateSportStatistics(activePitStop, newRange);
      setStateSportData(statsData.sports);
      setParalympicCount(statsData.paralympicAthletes);
      setOlympicCount(statsData.olympicAthletes);
      setYearsRepresented(statsData.yearsRepresented);
      setMedalistCount(statsData.medalists);
      setQualifiedAthleteCount(statsData.qualifiedAthletes);
    } catch (error) {
      console.error('Error filtering by year:', error);
    }
  }, [activePitStop]);

  const closePitStop = () => {
    setActivePitStop(null);
  };

  useEffect(() => {
    if (loaded) {
      const timer = setTimeout(() => {
        setShowStartPrompter(false);
        setTutorialStep(1); // Start tutorial after prompter disappears
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loaded]);

  const handleTutorialNext = () => {
    if (tutorialStep === 2) {
      setTutorialStep(0); // End tutorial
    } else {
      setTutorialStep(tutorialStep + 1);
    }
  };

  const handleTutorialSkip = () => {
    setTutorialStep(0);
  };

  const handleStartStory = async () => {
    setIsStoryLoading(true);
    setActivePitStop(null); // Close state panel if story starts

    try {
      const story = await generateInspiringStory();
      setActiveStory(story);
      // No state highlighting for inspiring stories
    } catch (err) {
      console.error(err);
    } finally {
      setIsStoryLoading(false);
    }
  };

  const closeStory = () => {
    setActiveStory(null);
    setHighlightedStates([]);
    setCurrentHighlightColor("#f72585"); 
  };

  return (
    <div className={cn(
      "w-full h-screen font-sans relative overflow-hidden flex flex-col transition-colors duration-1000",
      skyMode === 'day' 
        ? (viewMode === 'map' ? "bg-[#F8FAFC]" : "bg-[#BAE6FD]") 
        : "bg-white"
    )}>
      {/* Background Atmospheric Layer */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-all duration-1000" 
        style={{ 
          background: skyMode === 'day' && viewMode === 'map' 
            ? 'radial-gradient(circle at 50% 120%, #F1F5F9 0%, transparent 70%)' 
            : (currentTheme as any).atmosphere,
          opacity: skyMode === 'day' && viewMode === 'map' ? 0.2 : (currentTheme as any).opacity 
        }} 
      ></div>

      {/* Discover Panel */}
      {isFilterPanelOpen && (
        <div className="fixed top-24 left-6 w-80 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-[#002868]/10 p-6 z-40 animate-in fade-in slide-in-from-top-4">
          <div className="mb-6">
            <h3 className="text-[#002868] font-black uppercase tracking-[0.2em] text-xs">Discovery Center</h3>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#002868] uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-3 h-3" />
                Sport
              </label>
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BF0A30]/30 focus:border-[#BF0A30] transition-all"
              >
                <option value="3x3 Basketball">3x3 Basketball</option>
                <option value="Alpine Skiing">Alpine Skiing</option>
                <option value="Archery">Archery</option>
                <option value="Artistic Gymnastics">Artistic Gymnastics</option>
                <option value="Artistic Swimming">Artistic Swimming</option>
                <option value="Badminton">Badminton</option>
                <option value="Baseball">Baseball</option>
                <option value="Basketball">Basketball</option>
                <option value="Beach Volleyball">Beach Volleyball</option>
                <option value="Biathlon">Biathlon</option>
                <option value="Bobsled">Bobsled</option>
                <option value="Boxing">Boxing</option>
                <option value="Canoe/Kayak">Canoe/Kayak</option>
                <option value="Cross-Country Skiing">Cross-Country Skiing</option>
                <option value="Track and Field">Track and Field</option>
                <option value="Para Alpine Skiing">Para Alpine Skiing</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#002868] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3 h-3" />
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPendingCategory('paralympians')}
                  disabled={!sportFilter.startsWith('Para')}
                  className={cn(
                    "px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border-2",
                    pendingCategory === 'paralympians'
                      ? "bg-[#BF0A30] text-white border-[#BF0A30] shadow-lg shadow-[#BF0A30]/30"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#BF0A30]/30 hover:bg-slate-50",
                    !sportFilter.startsWith('Para') ? "opacity-50 cursor-not-allowed" : ""
                  )}
                >
                  Paralympics
                </button>
                <button
                  onClick={() => setPendingCategory('olympians')}
                  disabled={sportFilter.startsWith('Para')}
                  className={cn(
                    "px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border-2",
                    pendingCategory === 'olympians'
                      ? "bg-[#BF0A30] text-white border-[#BF0A30] shadow-lg shadow-[#BF0A30]/30"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#BF0A30]/30 hover:bg-slate-50",
                    sportFilter.startsWith('Para') ? "opacity-50 cursor-not-allowed" : ""
                  )}
                >
                  Olympics
                </button>
              </div>
            </div>

            <button
              onClick={handleDiscover}
              className="w-full bg-gradient-to-r from-[#BF0A30] to-[#D91E3E] hover:from-[#A00828] hover:to-[#BF0A30] text-white font-black py-4 rounded-xl shadow-xl shadow-[#BF0A30]/30 transition-all uppercase tracking-[0.2em] text-xs transform hover:scale-[1.02]"
            >
              🔍 Discover
            </button>

            {highlightedStates.length > 0 && (
              <button
                onClick={handleReset}
                className="w-full bg-[#002868] hover:bg-[#001a4d] text-white font-bold py-3 rounded-xl shadow-lg shadow-[#002868]/20 transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Map
              </button>
            )}

            <button
              onClick={() => setIsFilterPanelOpen(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all uppercase tracking-wider text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Side Panel Popup */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 w-[620px] bg-white/95 backdrop-blur-md border-l border-[#002868]/20 transition-transform duration-500 ease-out shadow-2xl flex flex-col pointer-events-auto",
          activePitStop ? "translate-x-0 visible z-[2000]" : "translate-x-full invisible z-0"
        )}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Highlighted Banner */}
          <div className="bg-gradient-to-r from-[#002868] to-[#003080] p-6 relative">
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <img 
                src="/images/hometown_pin.png" 
                alt="Hometown Pin" 
                className="w-16 h-16 object-contain mt-1"
              />
              <button 
                onClick={closePitStop}
                className="p-2 hover:bg-white/10 rounded-full transition-colors pointer-events-auto"
              >
                <span className="text-xl text-white">×</span>
              </button>
            </div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FFFACD] mb-2">Hometown Hub Arrival</p>
            <h2 className="text-3xl font-serif italic text-white">Welcome to {activePitStop}</h2>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#002868] mb-3">Potential Training Sites & Support Systems</h3>
              
              {isHometownInfoLoading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="w-8 h-8 border-4 border-[#002868]/10 border-t-[#002868] rounded-full animate-spin" />
                  <p className="text-sm text-slate-500 animate-pulse">Discovering hometown support...</p>
                </div>
              ) : (
                <div className="text-sm leading-relaxed text-slate-700 space-y-3">
                  {hometownInfo.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>

            {stateSportData.length > 0 ? (
              <div className="border-t border-slate-200 pt-6 space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#002868] mb-4">Hometown Athletic Identity Overview</h3>
                
                {/* Timeline Explorer */}
                <div className="space-y-3">
                  <div className="text-xs font-bold tracking-wider text-slate-600 mb-1">Discover Milestones Over The Years</div>
                  
                  {/* Sleek Pill Container */}
                  <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2rem] p-4 shadow-lg border border-slate-200">
                    {/* Year Range Display */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] text-slate-500">From</div>
                        <div className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-full shadow-sm">
                          {minYear}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] text-slate-500">To</div>
                        <div className="text-xl font-black text-[#BF0A30] bg-white px-3 py-1.5 rounded-full shadow-md">
                          {selectedYearRange[1]}
                        </div>
                      </div>
                    </div>
                    
                    {/* Visual Timeline Bars */}
                    <div className="relative mb-3">
                      <div className="flex gap-0.5 h-8 items-end">
                        {Array.from({ length: 20 }).map((_, i) => {
                          const yearProgress = (selectedYearRange[1] - minYear) / (maxYear - minYear);
                          const barProgress = i / 20;
                          const isActive = barProgress <= yearProgress;
                          const height = 40 + (i % 3) * 20;
                          
                          return (
                            <div
                              key={i}
                              className={`flex-1 rounded-t-lg transition-all duration-300 ${
                                isActive 
                                  ? 'bg-gradient-to-t from-[#BF0A30] via-[#FF6B35] to-[#FFB81C]' 
                                  : 'bg-slate-200'
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Slider */}
                    <div className="relative mb-2">
                      <input
                        type="range"
                        min={minYear}
                        max={maxYear}
                        value={selectedYearRange[1]}
                        onChange={(e) => handleYearRangeChange([minYear, parseInt(e.target.value)])}
                        className="w-full h-2 bg-slate-300 rounded-full appearance-none cursor-pointer shadow-sm"
                      />
                    </div>
                    
                    <div className="text-center text-[10px] text-slate-500 italic">
                      Slide to explore how {activePitStop} evolved over time
                    </div>
                  </div>
                </div>
                
                {/* Summary Stats - Mixed Shapes */}
                <div className="space-y-4">
                  {/* Athlete Circles */}
                  <div className="flex gap-4 justify-center">
                    {/* Paralympic Circle */}
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] flex flex-col items-center justify-center text-white shadow-lg">
                        <div className="text-2xl font-black">{paralympicCount}</div>
                        <div className="text-[8px] uppercase tracking-wide opacity-90">Paralympic</div>
                        <div className="text-[8px] uppercase tracking-wide opacity-90">Athletes</div>
                      </div>
                    </div>
                    
                    {/* Olympic Circle */}
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#002868] to-[#003080] flex flex-col items-center justify-center text-white shadow-lg">
                        <div className="text-2xl font-black">{olympicCount}</div>
                        <div className="text-[8px] uppercase tracking-wide opacity-90">Olympic</div>
                        <div className="text-[8px] uppercase tracking-wide opacity-90">Athletes</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Rectangular Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Total Medals */}
                    <div className="bg-gradient-to-br from-[#BF0A30] to-[#D91E3E] rounded-xl p-4 text-white">
                      <div className="text-2xl font-black">
                        {stateSportData.reduce((sum, s) => sum + s.gold + s.silver + s.bronze, 0)}
                      </div>
                      <div className="text-xs opacity-90 uppercase tracking-wide">Total Medals</div>
                    </div>
                    
                    {/* Years Represented */}
                    <div className="bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl p-4 text-white">
                      <div className="text-2xl font-black">{yearsRepresented}</div>
                      <div className="text-xs opacity-90 uppercase tracking-wide">Years Represented</div>
                    </div>
                  </div>
                </div>

                {/* Medal Breakdown */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">Medal Breakdown</div>
                  <div className="flex justify-around">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center mb-2 mx-auto shadow-lg">
                        <span className="text-xl">🥇</span>
                      </div>
                      <div className="font-bold text-lg">{stateSportData.reduce((sum, s) => sum + s.gold, 0)}</div>
                      <div className="text-[10px] text-slate-500">Gold</div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C0C0C0] to-[#A8A8A8] flex items-center justify-center mb-2 mx-auto shadow-lg">
                        <span className="text-xl">🥈</span>
                      </div>
                      <div className="font-bold text-lg">{stateSportData.reduce((sum, s) => sum + s.silver, 0)}</div>
                      <div className="text-[10px] text-slate-500">Silver</div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#CD7F32] to-[#B8733E] flex items-center justify-center mb-2 mx-auto shadow-lg">
                        <span className="text-xl">🥉</span>
                      </div>
                      <div className="font-bold text-lg">{stateSportData.reduce((sum, s) => sum + s.bronze, 0)}</div>
                      <div className="text-[10px] text-slate-500">Bronze</div>
                    </div>
                  </div>
                </div>

                {/* Medalist vs Qualified Athletes Pie Chart */}
                {(medalistCount > 0 || qualifiedAthleteCount > 0) && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">Share of Medalists vs Qualified Athletes</div>
                    <div className="flex items-center justify-center gap-6">
                      {/* SVG Pie Chart */}
                      <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
                        {(() => {
                          const total = medalistCount + qualifiedAthleteCount;
                          const medalistPercent = total > 0 ? (medalistCount / total) * 100 : 0;
                          const qualifiedPercent = total > 0 ? (qualifiedAthleteCount / total) * 100 : 0;
                          const medalistAngle = (medalistPercent / 100) * 360;
                          
                          const radius = 60;
                          const cx = 70;
                          const cy = 70;
                          
                          // Calculate arc path for medalists
                          const medalistPath = medalistAngle > 0 ? (() => {
                            const endAngle = medalistAngle * (Math.PI / 180);
                            const x = cx + radius * Math.cos(endAngle);
                            const y = cy + radius * Math.sin(endAngle);
                            const largeArc = medalistAngle > 180 ? 1 : 0;
                            return `M ${cx} ${cy} L ${cx + radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${x} ${y} Z`;
                          })() : '';
                          
                          return (
                            <>
                              {/* Qualified Athletes (full circle or remaining) */}
                              <circle cx={cx} cy={cy} r={radius} fill="#94a3b8" />
                              {/* Medalists slice */}
                              {medalistPath && <path d={medalistPath} fill="#f59e0b" />}
                            </>
                          );
                        })()}
                      </svg>
                      
                      {/* Legend */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-sm bg-[#f59e0b]"></div>
                          <div className="text-xs">
                            <div className="font-bold">{medalistCount} Medalists</div>
                            <div className="text-[10px] text-slate-500">
                              {((medalistCount / (medalistCount + qualifiedAthleteCount)) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-sm bg-[#94a3b8]"></div>
                          <div className="text-xs">
                            <div className="font-bold">{qualifiedAthleteCount} Qualified</div>
                            <div className="text-[10px] text-slate-500">
                              {((qualifiedAthleteCount / (medalistCount + qualifiedAthleteCount)) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sports Bubbles */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">Sports Represented</div>
                  <div className="flex flex-wrap gap-2">
                    {stateSportData.map((sportData) => (
                      <div
                        key={sportData.sport}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#002868]/20 rounded-full hover:border-[#002868] transition-colors"
                      >
                        <span className="text-xs font-bold text-[#002868]">{sportData.sport}</span>
                        <span className="text-[10px] bg-[#002868] text-white px-2 py-0.5 rounded-full font-bold">
                          {sportData.athletes}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <button 
              onClick={closePitStop}
              className="w-full py-3 bg-[#BF0A30] text-white text-xs font-bold uppercase tracking-widest rounded-md hover:bg-[#a6092a] transition-colors pointer-events-auto"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      </div>

      {/* Story Panel */}
      <StoryPanel 
        story={activeStory} 
        onClose={closeStory} 
        isLoading={isStoryLoading} 
      />

      {/* Voice Chat Controls Overlay */}
      <div className="fixed top-6 left-6 flex flex-col gap-3 z-30 pointer-events-auto">
        <div className="flex gap-2 items-center flex-wrap">
          {/* Sports Discovery Button */}
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg",
              athleteCategory 
                ? "bg-white text-[#002868] border-2 border-[#002868]/20 hover:bg-slate-50 hover:border-[#002868]/40" 
                : "bg-gradient-to-r from-[#BF0A30] to-[#D91E3E] text-white hover:from-[#A00828] hover:to-[#BF0A30] shadow-[#BF0A30]/40"
            )}
          >
            <Trophy className="w-3.5 h-3.5" />
            {athleteCategory ? sportFilter : 'Discover Sports'}
          </button>

            {/* Legend Scale */}
            {athleteCategory && (
              <div className="flex bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-3 flex-col gap-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-[#002868] mb-1">Athlete Density</div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400">0</span>
                  <div className="h-2 w-32 rounded-full overflow-hidden flex">
                    {["#FCD34D", "#34D399", "#F472B6", "#A78BFA"].map((c, i) => (
                      <div key={i} style={{ backgroundColor: c }} className="flex-1 h-full" />
                    ))}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">{maxAthletes}</span>
                </div>
              </div>
            )}

          <div className="flex bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200 p-1">
            {(['flight', 'map'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  viewMode === mode 
                    ? "bg-[#BF0A30] text-white" 
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {mode === 'flight' ? 'Explorable 3D Map' : '2D Map'}
              </button>
            ))}
          </div>

          <div className="flex bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200 p-1">
            {(['day', 'sunset', 'night'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSkyMode(mode)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                  skyMode === mode 
                    ? "bg-[#002868] text-white" 
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg",
              isActive 
                ? "bg-red-500 text-white hover:bg-red-600 animate-pulse" 
                : "bg-[#002868] text-white hover:bg-[#001d4d]",
              isConnecting && "opacity-50 cursor-not-allowed"
            )}
          >
            {isConnecting ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : isActive ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            {isConnecting ? "Connecting..." : isActive ? "End Voice Chat" : "Start Voice Chat"}
          </button>

          {isActive && (
            <button
              onClick={handleVisualizeData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg bg-[#60A5FA] text-white hover:bg-[#3B82F6]"
            >
              <BarChart3 className="w-4 h-4" />
              {chartData || pieChartData ? 'Hide Charts' : 'Visualize Data'}
            </button>
          )}

          <button
            onClick={handleStartStory}
            disabled={isStoryLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-[#002868] text-xs font-bold uppercase tracking-widest transition-all shadow-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            <Sparkles className={cn("w-4 h-4 text-[#FFB81C]", isStoryLoading && "animate-spin")} />
            {isStoryLoading ? "Crafting Story..." : "Inspiring Stories"}
          </button>

          <button
            onClick={geoSeekerMode ? closeGeoSeeker : startGeoSeekerGame}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all shadow-xl text-white hover:shadow-2xl hover:scale-105 border-2 border-white/30 ${
              geoSeekerMode 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            <span className="text-base">{geoSeekerMode ? '✖️' : '🌎'}</span>
            {geoSeekerMode ? 'Exit Quest' : 'Geo Quest Mode'}
          </button>

          {highlightedStates.length > 0 && !isActive && (
            <button
              onClick={handleVisualizeData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg bg-[#60A5FA] text-white hover:bg-[#3B82F6]"
            >
              <BarChart3 className="w-4 h-4" />
              {chartData || pieChartData ? 'Hide Charts' : 'Visualize Data'}
            </button>
          )}

        </div>

        {isActive && !isConnecting && (
          <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-200 shadow-xl max-w-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Gemini Live Active</p>
            </div>
            <p className="text-sm text-[#002868] font-medium leading-snug">
              Explore the collective achievements of Team USA athletes across numerous sports and where they call home
            </p>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center bg-gradient-to-b from-sky-100 via-blue-50 to-white z-50 pointer-events-none transition-opacity duration-1000",
        loaded ? "opacity-0" : "opacity-100"
      )}>
        <div className="text-center space-y-6 max-w-3xl px-8 relative z-10">
          <div className="text-5xl font-serif italic text-[#002868] animate-pulse">Beyond the Horizon</div>
          <p className="text-sm font-bold tracking-wider uppercase text-[#BF0A30]">Discover Team USA</p>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Powered by Gemini, Beyond the Horizon is an interactive, voice-driven 3D journey where you can fly across the U.S. to explore 126 years from 1900 to 2026 of Team USA's diverse Olympic and Paralympic history through immersive storytelling, dynamic maps, 3D data visualizations, and gamified discovery!
          </p>
          <div className="flex justify-center gap-4 pt-4 relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 animate-spin">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500"></div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600"></div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Overlay */}
      {viewMode === 'flight' && (
        <div className="fixed bottom-6 left-6 p-4 bg-white/50 backdrop-blur-md rounded-2xl border-2 border-white/30 shadow-2xl pointer-events-none z-30 transition-all duration-500">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-700 font-sans">Controls</p>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-xs text-[#002868] font-bold">
              <div className="flex items-center gap-2">
                <kbd className="min-w-[28px] h-7 px-2 flex items-center justify-center bg-[#002868] text-white rounded border-2 border-[#002868] text-xs font-bold shadow-md">W</kbd>
                <kbd className="min-w-[28px] h-7 px-2 flex items-center justify-center bg-[#002868] text-white rounded border-2 border-[#002868] text-xs font-bold shadow-md">S</kbd>
              </div>
              <span className="font-semibold whitespace-nowrap">up / down</span>

              <div className="flex items-center gap-2">
                <kbd className="min-w-[28px] h-7 px-2 flex items-center justify-center bg-[#002868] text-white rounded border-2 border-[#002868] text-xs font-bold shadow-md">A</kbd>
                <kbd className="min-w-[28px] h-7 px-2 flex items-center justify-center bg-[#002868] text-white rounded border-2 border-[#002868] text-xs font-bold shadow-md">D</kbd>
              </div>
              <span className="font-semibold whitespace-nowrap">turn left / right</span>

              <div className="flex items-center gap-2">
                <kbd className="min-w-[60px] h-7 px-2 flex items-center justify-center bg-[#002868] text-white rounded border-2 border-[#002868] text-xs font-bold shadow-md">ARROWS</kbd>
              </div>
              <span className="font-semibold whitespace-nowrap">forward / backward</span>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#002868]">MOUSE</span>
              </div>
              <span className="font-semibold whitespace-nowrap">look around</span>

              <div className="flex items-center gap-2">
                <kbd className="min-w-[28px] h-7 px-2 flex items-center justify-center bg-[#002868] text-white rounded border-2 border-[#002868] text-xs font-bold shadow-md">P</kbd>
              </div>
              <span className="font-semibold whitespace-nowrap">pause / resume</span>

              <div className="flex items-center gap-2">
                <kbd className="min-w-[28px] h-7 px-2 flex items-center justify-center bg-[#002868] text-white rounded border-2 border-[#002868] text-xs font-bold shadow-md">R</kbd>
              </div>
              <span className="font-semibold whitespace-nowrap">restart flight</span>
            </div>
          </div>
        </div>
      )}

      {/* Tap to Start Prompter */}
      {showStartPrompter && loaded && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none animate-in fade-in duration-1000">
          <div className="py-6 px-10 bg-white/20 backdrop-blur-xl rounded-[2.5rem] border border-white/30 shadow-[0_0_80px_rgba(255,255,255,0.1)] flex flex-col items-center gap-4 group">
            <div className="flex flex-col items-center">
              <div className="mb-2 w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center animate-bounce">
                <div className="w-1.5 h-3 rounded-full bg-white animate-pulse" />
              </div>
              <h2 className="text-white text-lg font-black uppercase tracking-[0.4em] drop-shadow-lg">Begin Journey</h2>
            </div>
          </div>
        </div>
      )}

      {/* Main 3D Viewport Simulation */}
      <main className="flex-1 relative z-10">
        <div className="absolute inset-0">
          <Canvas 
            shadows={{ type: THREE.PCFShadowMap }}
            camera={{ fov: 60, far: 5000 }}
          >
            <CameraTracker 
              enabled={geoSeekerMode && !showResultDialog}
              statePositions={statePositions}
              onNearState={handleCameraNearState} 
            />
            
            <Suspense fallback={null}>
              {skyMode !== 'sunset' && (
                <Sky 
                  sunPosition={currentTheme.sunPosition}
                  turbidity={currentTheme.turbidity}
                  rayleigh={currentTheme.rayleigh}
                  mieCoefficient={currentTheme.mieCoefficient}
                  mieDirectionalG={currentTheme.mieDirectionalG}
                  distance={450000}
                />
              )}
              <Environment preset={currentTheme.env as any} />
              
              <ambientLight intensity={skyMode === 'night' ? 0.5 : skyMode === 'sunset' ? 0.9 : 0.6} color={(currentTheme as any).ambientColor} />
              <directionalLight
                position={currentTheme.sunPosition}
                intensity={skyMode === 'night' ? 1.0 : skyMode === 'sunset' ? 2.2 : 1.5}
                color={(currentTheme as any).lightColor}
                castShadow
                shadow-mapSize={[2048, 2048]}
              />

          <USMap3D 
            onLoaded={handleLoaded} 
            onStatesReady={handleStatesReady}
            onSelectState={handlePitStop}
            highlightedStates={highlightedStates}
            viewMode={viewMode}
            stateStats={stateStats}
            maxAthletes={maxAthletes}
            sportName={sportFilter}
          />

          <Banner
            viewMode={viewMode}
            title={activeStory?.title}
          />

          <SportMarkers 
            activeSports={activeSports}
            highlightedStates={highlightedStates}
            statePositions={statePositions}
          />

          {/* Flight Paths between highlighted states */}
          <FlightPaths 
            statePositions={statePositions}
            highlightedStates={highlightedStates}
          />

          {/* 3D Chart Panels */}
          {hometownDistributionData && (
            <HometownBarChart data={hometownDistributionData} position={[500, 30, 0]} />
          )}
          
          {chartData && (
            <ChartPanel data={chartData} position={[500, 30, 120]} />
          )}
          
          {medalDistributionData && (
            <PieChartPanel data={medalDistributionData} position={[500, 30, 240]} />
          )}

          {viewMode === 'flight' ? (
            <>
              <Clouds />
              <Falcon 
                statePositions={statePositions}
                onPitStop={handlePitStop}
                isSimulationPaused={!!activePitStop || showGuessDialog || showResultDialog}
              />
            </>
          ) : (
            <>
              <PerspectiveCamera 
                makeDefault 
                position={[0, 500, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fov={50}
                up={[0, 0, -1]}
              />
              <MapControls 
                enableRotate={false}
                screenSpacePanning={true}
                maxDistance={1200}
                minDistance={5}
              />
            </>
          )}

          {/* Ocean Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
            <planeGeometry args={[2000, 2000, 150, 150]} />
            <meshStandardMaterial 
              color={
                skyMode === 'day' 
                  ? (viewMode === 'map' ? "#22D3EE" : "#06B6D4")
                  : skyMode === 'sunset'
                    ? "#0EA5E9"
                    : "#1E3A5F"
              } 
              roughness={0.95}
              metalness={0.05}
              opacity={skyMode === 'day' ? (viewMode === 'map' ? 0.4 : 0.7) : 0.8} 
              transparent
              flatShading
            />
          </mesh>
            </Suspense>
          </Canvas>
        </div>
      </main>

      {/* GeoSeeker Mode - Loader or Panels */}
      {geoSeekerMode && geoSeekerLoading && <GeoSeekerLoader />}
      
      {geoSeekerMode && !geoSeekerLoading && geoSeekerLocation && (
        <GeoSeekerPanel
          hiddenState={geoSeekerLocation.state}
          hiddenLat={geoSeekerLocation.lat}
          hiddenLng={geoSeekerLocation.lng}
          onClose={closeGeoSeeker}
          onGuessLocked={handleGeoSeekerGuess}
          clues={geoSeekerLocation.clue_facts}
          currentRound={currentRound}
          totalScore={totalScore}
          roundsWon={roundsWon}
        />
      )}

      {/* Guess Confirmation Dialog */}
      {showGuessDialog && nearbyState && (
        <GeoSeekerGuessDialog
          nearbyState={nearbyState}
          onConfirm={() => handleGeoSeekerGuess(nearbyState)}
          onCancel={() => setShowGuessDialog(false)}
        />
      )}

      {/* Tutorial Panels */}
      <TutorialPanel
        step={tutorialStep}
        onNext={handleTutorialNext}
        onSkip={handleTutorialSkip}
      />

      {/* Result Dialog */}
      {showResultDialog && guessResult && geoSeekerLocation && (
        <GeoSeekerResultDialog
          guessedState={guessResult.guessed}
          hiddenState={geoSeekerLocation.state}
          distance={guessResult.distance}
          isCorrect={guessResult.guessed === geoSeekerLocation.state}
          score={guessResult.score}
          onPlayAgain={nextRound}
          onClose={closeGeoSeeker}
        />
      )}
    </div>
  );
}
