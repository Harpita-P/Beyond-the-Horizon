import Papa from 'papaparse';

// List of available CSV files in /public folder
// Add new CSV files here as they are added to the public folder
const AVAILABLE_CSV_FILES = [
  '/3x3_basketball_olympians.csv',
  '/alpine_skiing_olympians.csv',
  '/archery_olympians.csv',
  '/artistic_gymnastics_olympians.csv',
  '/artistic_swimming_olympians.csv',
  '/badminton_olympians.csv',
  '/baseball_olympians.csv',
  '/basketball_olympians.csv',
  '/beach_volleyball_olympians.csv',
  '/biathlon_olympians.csv',
  '/bobsled_olympians.csv',
  '/boxing_olympians.csv',
  '/canoe_kayak_olympians.csv',
  '/cross_country_skiing_olympians.csv',
  '/track_and_field_olympians.csv',
  '/curling_olympians.csv',
  '/cycling_olympians.csv',
  '/diving_olympians.csv',
  '/fencing_olympians.csv',
  '/field_hockey_olympians.csv',
  '/figure_skating_olympians.csv',
  '/golf_olympians.csv',
  '/para_alpine_skiing_paralympians.csv',
  '/para_archery_paralympians.csv',
  '/para_badminton_paralympians.csv',
  '/para_biathlon_paralympians.csv',
  '/paratriathlon_paralympians.csv',
];

// State name to code mapping
const STATE_NAME_TO_CODE: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

export interface AthleteRecord {
  name: string;
  sport: string;
  education: string;
  hometown_city: string;
  hometown_state: string;
  age: number;
  medals_gold_silver_bronze: string; // Format: "gold|silver|bronze"
  years_represented: string; // Format: "2010|2014|2018"
  [key: string]: any; // Allow other fields
}

export async function getRandomCSVData(stateCode: string): Promise<{
  csvName: string;
  athletes: AthleteRecord[];
  sport: string;
}> {
  // Pick a random CSV file from public folder
  const randomCSV = AVAILABLE_CSV_FILES[Math.floor(Math.random() * AVAILABLE_CSV_FILES.length)];
  
  console.log(`📊 Selected random CSV from public folder: ${randomCSV}`);
  
  const response = await fetch(randomCSV);
  const csvText = await response.text();
  
  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: true,
      complete: (results) => {
        // Parse all athletes from CSV with all fields
        const allAthletes: AthleteRecord[] = results.data
          .filter((row: any) => row.hometown_state && row.hometown_city && row.name)
          .map((row: any) => ({
            name: row.name || 'Unknown',
            sport: row.sport || extractSportFromFilename(randomCSV),
            education: row.education || '',
            hometown_city: row.hometown_city,
            hometown_state: row.hometown_state,
            age: parseInt(row.age) || 0,
            medals_gold_silver_bronze: row.medals_gold_silver_bronze || '0|0|0',
            years_represented: row.years_represented || '',
            ...row // Include any other CSV fields
          }));

        // Filter for the specific state
        const stateAthletes = allAthletes.filter(a => a.hometown_state === stateCode);
        
        // Determine the sport from filename or data
        const sport = extractSportFromFilename(randomCSV) || stateAthletes[0]?.sport || 'Team USA Sport';

        console.log(`✅ Parsed ${stateAthletes.length} athletes from ${randomCSV} for state ${stateCode}`);

        resolve({
          csvName: randomCSV,
          athletes: stateAthletes,
          sport: sport
        });
      }
    });
  });
}

// Helper function to extract sport name from CSV filename
function extractSportFromFilename(filename: string): string {
  const name = filename.replace('/','').replace('.csv', '');
  
  if (name.includes('alpine_skiing')) return 'Para Alpine Skiing';
  if (name.includes('swimming')) return 'Swimming';
  if (name.includes('track_and_field')) return 'Track and Field';
  if (name.includes('gymnastics')) return 'Gymnastics';
  if (name.includes('basketball')) return 'Basketball';
  if (name.includes('baseball')) return 'Baseball';
  if (name.includes('beach_volleyball')) return 'Beach Volleyball';
  if (name.includes('biathlon')) return 'Biathlon';
  if (name.includes('bobsled')) return 'Bobsled';
  if (name.includes('boxing')) return 'Boxing';
  if (name.includes('canoe_kayak')) return 'Canoe/Kayak';
  if (name.includes('cross_country_skiing')) return 'Cross-Country Skiing';
  
  // Convert underscores to spaces and capitalize
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function analyzeCSVDataForState(stateCode: string): Promise<string> {
  const { csvName, athletes, sport } = await getRandomCSVData(stateCode);
  
  if (athletes.length === 0) {
    return `No athletes found in ${csvName} for state ${stateCode}`;
  }

  // Extract insights from the data
  const cities = [...new Set(athletes.map(a => a.hometown_city))];
  const athleteNames = athletes.slice(0, 5).map(a => a.name);
  
  // Calculate medal statistics
  let totalGold = 0, totalSilver = 0, totalBronze = 0;
  athletes.forEach(a => {
    const medals = a.medals_gold_silver_bronze.split('|').map(m => parseInt(m) || 0);
    totalGold += medals[0] || 0;
    totalSilver += medals[1] || 0;
    totalBronze += medals[2] || 0;
  });
  
  // Get year range
  const allYears = athletes
    .flatMap(a => a.years_represented.split('|').filter(y => y))
    .map(y => parseInt(y))
    .filter(y => !isNaN(y));
  const yearRange = allYears.length > 0 
    ? `${Math.min(...allYears)} - ${Math.max(...allYears)}`
    : 'Unknown';
  
  // Average age
  const avgAge = athletes.length > 0
    ? Math.round(athletes.reduce((sum, a) => sum + a.age, 0) / athletes.length)
    : 0;
  
  // Build a rich data summary for Gemini to analyze
  const dataSummary = `
CSV FILE: ${csvName}
SPORT: ${sport}
STATE: ${stateCode}
TOTAL ATHLETES: ${athletes.length}
CITIES: ${cities.join(', ')}
SAMPLE ATHLETES: ${athleteNames.join(', ')}

MEDAL COUNT:
- Gold: ${totalGold}
- Silver: ${totalSilver}
- Bronze: ${totalBronze}
- Total Medals: ${totalGold + totalSilver + totalBronze}

YEARS REPRESENTED: ${yearRange}
AVERAGE AGE: ${avgAge}

SAMPLE ATHLETE DETAILS (first 3):
${athletes.slice(0, 3).map(a => `
- ${a.name} (Age ${a.age})
  City: ${a.hometown_city}
  Medals: ${a.medals_gold_silver_bronze} (G|S|B)
  Years: ${a.years_represented}
  Education: ${a.education || 'N/A'}
`).join('\n')}
`;

  return dataSummary;
}

export async function getStateSportStatistics(stateName: string, yearRange?: [number, number]): Promise<{
  sports: Array<{
    sport: string;
    athletes: number;
    gold: number;
    silver: number;
    bronze: number;
  }>;
  paralympicAthletes: number;
  olympicAthletes: number;
  minYear: number;
  maxYear: number;
  yearsRepresented: number;
  medalists: number;
  qualifiedAthletes: number;
}> {
  console.log('🔍 getStateSportStatistics called with:', stateName);
  console.log('🔍 State code lookup:', STATE_NAME_TO_CODE[stateName]);
  console.log('🔍 Processing ALL CSV files:', AVAILABLE_CSV_FILES);
  
  const sportStats: Record<string, {
    athleteNames: Set<string>;
    gold: number;
    silver: number;
    bronze: number;
  }> = {};
  
  const paralympicAthleteNames = new Set<string>();
  const olympicAthleteNames = new Set<string>();
  const medalistNames = new Set<string>();
  const allAthleteNames = new Set<string>();
  const allYears = new Set<number>();
  let minYear = Infinity;
  let maxYear = -Infinity;
  let totalRowsProcessed = 0;
  let matchedRows = 0;

  // Process all available CSV files
  for (const csvFile of AVAILABLE_CSV_FILES) {
    console.log(`📂 Processing CSV file: ${csvFile}`);
    try {
      const response = await fetch(csvFile);
      const csvText = await response.text();
      const isParalympic = csvFile.toLowerCase().includes('paralympian');
      console.log(`  🏷️  Sport type: ${isParalympic ? 'Paralympic' : 'Olympic'}`);
      
      await new Promise<void>((resolve) => {
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            // Use sport column from CSV data if available, otherwise fallback to filename
            const sport = results.data[0]?.sport || extractSportFromFilename(csvFile);
            
            results.data.forEach((row: any) => {
              totalRowsProcessed++;
              
              // Debug first few rows
              if (results.data.indexOf(row) < 3) {
                console.log('🔍 Sample row:', { 
                  name: row.name, 
                  hometown_state: row.hometown_state,
                  stateName: stateName,
                  stateCode: STATE_NAME_TO_CODE[stateName]
                });
              }
              
              // Match by state code (CSV has codes like "CO", "CA", etc.)
              // We receive full state names like "Colorado", so we convert using mapping
              const stateCode = STATE_NAME_TO_CODE[stateName] || stateName;
              const matchesState = row.hometown_state === stateCode;
              
              if (matchesState && row.name) {
                matchedRows++;
                if (matchedRows <= 3) {
                  console.log('✅ MATCHED:', row.name, 'from', row.hometown_state);
                }
                // Extract years from years_represented field
                const yearsStr = row.years_represented || '';
                const years = yearsStr.split('|').map((y: string) => parseInt(y)).filter((y: number) => !isNaN(y));
                
                // Update min/max years and track all unique years
                years.forEach((year: number) => {
                  if (year < minYear) minYear = year;
                  if (year > maxYear) maxYear = year;
                  allYears.add(year);
                });
                
                // Check if athlete competed in the specified year range
                const inYearRange = !yearRange || years.some((year: number) => 
                  year >= yearRange[0] && year <= yearRange[1]
                );
                
                if (inYearRange) {
                  if (!sportStats[sport]) {
                    sportStats[sport] = {
                      athleteNames: new Set(),
                      gold: 0,
                      silver: 0,
                      bronze: 0
                    };
                  }
                  
                  sportStats[sport].athleteNames.add(row.name);
                  
                  // Track all athletes
                  allAthleteNames.add(row.name);
                  
                  // Track Paralympic vs Olympic athletes
                  if (isParalympic) {
                    paralympicAthleteNames.add(row.name);
                  } else {
                    olympicAthleteNames.add(row.name);
                  }
                  
                  // Parse medals (format: "gold|silver|bronze" or "1|2|0")
                  const medals = (row.medals_gold_silver_bronze || '0|0|0').split('|').map((m: string) => parseInt(m) || 0);
                  const totalMedals = (medals[0] || 0) + (medals[1] || 0) + (medals[2] || 0);
                  
                  // Track medalists (athletes with at least one medal)
                  if (totalMedals > 0) {
                    medalistNames.add(row.name);
                  }
                  
                  sportStats[sport].gold += medals[0] || 0;
                  sportStats[sport].silver += medals[1] || 0;
                  sportStats[sport].bronze += medals[2] || 0;
                }
              }
            });
            
            resolve();
          }
        });
      });
    } catch (error) {
      console.error(`Error processing ${csvFile}:`, error);
    }
  }

  console.log(`📊 Processed ${totalRowsProcessed} total rows, found ${matchedRows} matches for ${stateName}`);
  console.log(`🏅 Sports found:`, Object.keys(sportStats));
  console.log(`👥 Total unique athletes: ${allAthleteNames.size}`);
  console.log(`🏆 Medalists: ${medalistNames.size}`);
  
  // Convert to array and sort by athlete count
  const sports = Object.entries(sportStats)
    .map(([sport, data]) => ({
      sport,
      athletes: data.athleteNames.size,
      gold: data.gold,
      silver: data.silver,
      bronze: data.bronze
    }))
    .sort((a, b) => b.athletes - a.athletes);

  console.log(`🏅 Returning ${sports.length} sports`);

  const totalAthletes = allAthleteNames.size;
  const medalists = medalistNames.size;
  const qualifiedAthletes = totalAthletes - medalists;

  return {
    sports,
    paralympicAthletes: paralympicAthleteNames.size,
    olympicAthletes: olympicAthleteNames.size,
    minYear: minYear === Infinity ? new Date().getFullYear() : minYear,
    maxYear: maxYear === -Infinity ? new Date().getFullYear() : maxYear,
    yearsRepresented: allYears.size,
    medalists,
    qualifiedAthletes
  };
}
