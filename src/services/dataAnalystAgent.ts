import Papa from 'papaparse';

export interface ChartData {
  years: number[];
  counts: number[];
  sport: string;
  category: 'olympians' | 'paralympians';
}

export interface RegionalData {
  region: string;
  count: number;
  percentage: number;
}

export interface PieChartData {
  regions: RegionalData[];
  sport: string;
  category: 'olympians' | 'paralympians';
  totalAthletes: number;
}

export interface MedalData {
  type: string;
  count: number;
  percentage: number;
}

export interface MedalDistributionData {
  medals: MedalData[];
  sport: string;
  category: 'olympians' | 'paralympians';
  totalMedals: number;
}

export interface HometownStateData {
  state: string;
  count: number;
}

export interface HometownDistributionData {
  states: HometownStateData[];
  sport: string;
  category: 'olympians' | 'paralympians';
  totalAthletes: number;
}

/**
 * Data Analyst Agent - Processes CSV and generates chart data
 */
export async function generateChartData(
  csvFilePath: string,
  sport: string,
  category: 'paralympians' | 'olympians'
): Promise<ChartData | null> {
  try {
    const res = await fetch(csvFilePath);
    if (!res.ok) throw new Error(`Failed to load ${csvFilePath}`);
    const csvText = await res.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const yearCounts: Record<number, number> = {};

          results.data.forEach((row: any) => {
            if (!row.years_represented) return;
            
            // Parse years (format: "2018|2022|2026")
            const years = row.years_represented.split('|').map((y: string) => parseInt(y.trim()));
            
            years.forEach((year: number) => {
              if (!isNaN(year)) {
                yearCounts[year] = (yearCounts[year] || 0) + 1;
              }
            });
          });

          // Sort years and get counts
          const sortedYears = Object.keys(yearCounts)
            .map(Number)
            .sort((a, b) => a - b);
          
          const counts = sortedYears.map(year => yearCounts[year]);

          resolve({
            years: sortedYears,
            counts,
            sport,
            category,
          });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Data Analyst Agent error:", error);
    return null;
  }
}

/**
 * Get US region from state abbreviation
 */
function getRegion(state: string): string {
  const west = ["CA","CO","WA","OR","UT","AK","ID","NV","AZ","NM","HI","WY","MT"];
  const midwest = ["IL","IN","MI","WI","MN","IA","MO","ND","SD","NE","KS","OH"];
  const south = ["TX","FL","GA","TN","NC","SC","AL","MS","LA","KY","AR","VA","WV"];
  const northeast = ["NY","NJ","PA","MA","CT","RI","VT","NH","ME","DE","MD"];

  if (west.includes(state)) return "West";
  if (midwest.includes(state)) return "Midwest";
  if (south.includes(state)) return "South";
  if (northeast.includes(state)) return "Northeast";
  return "Other";
}

/**
 * Generate hometown state distribution data for horizontal bar chart
 */
export async function generateHometownDistributionData(
  csvFilePath: string,
  sport: string,
  category: 'paralympians' | 'olympians'
): Promise<HometownDistributionData | null> {
  try {
    const response = await fetch(csvFilePath);
    const csvData = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        complete: (results) => {
          const stateCounts: Record<string, number> = {};
          let totalAthletes = 0;

          results.data.forEach((row: any) => {
            const state = row.hometown_state;
            if (state) {
              stateCounts[state] = (stateCounts[state] || 0) + 1;
              totalAthletes++;
            }
          });

          const states: HometownStateData[] = Object.entries(stateCounts)
            .map(([state, count]) => ({ state, count }))
            .sort((a, b) => a.count - b.count); // Sort ascending for horizontal bar chart

          resolve({
            states,
            sport,
            category,
            totalAthletes
          });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Hometown Distribution Data Analyst Agent error:", error);
    return null;
  }
}

/**
 * Generate regional distribution data for pie chart
 */
export async function generateRegionalData(
  csvFilePath: string,
  sport: string,
  category: 'paralympians' | 'olympians'
): Promise<PieChartData | null> {
  try {
    const response = await fetch(csvFilePath);
    const csvData = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        complete: (results) => {
          const regionCounts: Record<string, number> = {};
          let totalAthletes = 0;

          results.data.forEach((row: any) => {
            const state = row.hometown_state;
            if (state) {
              const region = getRegion(state);
              regionCounts[region] = (regionCounts[region] || 0) + 1;
              totalAthletes++;
            }
          });

          const regions: RegionalData[] = Object.entries(regionCounts).map(([region, count]) => ({
            region,
            count,
            percentage: (count / totalAthletes) * 100
          }));

          // Sort by count descending
          regions.sort((a, b) => b.count - a.count);

          resolve({
            regions,
            sport,
            category,
            totalAthletes
          });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Regional Data Analyst Agent error:", error);
    return null;
  }
}

/**
 * Generate medal distribution data for pie chart
 */
export async function generateMedalDistributionData(
  csvFilePath: string,
  sport: string,
  category: 'paralympians' | 'olympians'
): Promise<MedalDistributionData | null> {
  try {
    const response = await fetch(csvFilePath);
    const csvData = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        complete: (results) => {
          let gold = 0;
          let silver = 0;
          let bronze = 0;

          results.data.forEach((row: any) => {
            if (row.medals_gold_silver_bronze) {
              const medals = row.medals_gold_silver_bronze.split('|').map(Number);
              if (medals.length === 3) {
                gold += medals[0] || 0;
                silver += medals[1] || 0;
                bronze += medals[2] || 0;
              }
            }
          });

          const totalMedals = gold + silver + bronze;

          const medals: MedalData[] = [
            { type: 'Gold', count: gold, percentage: totalMedals > 0 ? (gold / totalMedals) * 100 : 0 },
            { type: 'Silver', count: silver, percentage: totalMedals > 0 ? (silver / totalMedals) * 100 : 0 },
            { type: 'Bronze', count: bronze, percentage: totalMedals > 0 ? (bronze / totalMedals) * 100 : 0 }
          ];

          resolve({
            medals,
            sport,
            category,
            totalMedals
          });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Medal Distribution Data Analyst Agent error:", error);
    return null;
  }
}
