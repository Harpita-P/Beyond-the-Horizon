import Papa from 'papaparse';

export interface AthleteData {
  hometown_state: string;
  medals_gold_silver_bronze?: string;
  sport?: string;
  [key: string]: any;
}

export interface CSVDataset {
  name: string;
  category: 'paralympians' | 'olympians';
  sport: string;
  data: AthleteData[];
}

/**
 * Load a single CSV file from the public folder
 */
export async function loadCSV(filename: string): Promise<AthleteData[]> {
  try {
    const response = await fetch(`/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}`);
    }
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as AthleteData[]);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error(`Error loading CSV ${filename}:`, error);
    return [];
  }
}

/**
 * Load all available CSV files
 * Add more CSV files to this list as you create them
 */
export async function loadAllCSVData(): Promise<CSVDataset[]> {
  const csvFiles = [
    {
      filename: 'para_alpine_skiing_paralympians.csv',
      name: 'Para Alpine Skiing',
      category: 'paralympians' as const,
      sport: 'Para Alpine Skiing'
    },
    // Add more CSV files here as you create them:
    // {
    //   filename: 'swimming_olympians.csv',
    //   name: 'Swimming',
    //   category: 'olympians' as const,
    //   sport: 'Swimming'
    // },
  ];

  const datasets = await Promise.all(
    csvFiles.map(async (file) => ({
      name: file.name,
      category: file.category,
      sport: file.sport,
      data: await loadCSV(file.filename)
    }))
  );

  return datasets;
}

/**
 * Convert CSV datasets to a summary format for Gemini
 */
export function generateDataSummary(datasets: CSVDataset[]): string {
  let summary = 'AVAILABLE DATASETS:\n\n';
  
  datasets.forEach(dataset => {
    const totalAthletes = dataset.data.length;
    const states = [...new Set(dataset.data.map(d => d.hometown_state))].filter(Boolean);
    
    // Calculate total medals
    let totalGold = 0, totalSilver = 0, totalBronze = 0;
    dataset.data.forEach(athlete => {
      if (athlete.medals_gold_silver_bronze) {
        const [g, s, b] = athlete.medals_gold_silver_bronze.split('|').map(Number);
        totalGold += g || 0;
        totalSilver += s || 0;
        totalBronze += b || 0;
      }
    });

    summary += `${dataset.sport} (${dataset.category}):\n`;
    summary += `- Total Athletes: ${totalAthletes}\n`;
    summary += `- States Represented: ${states.length} (${states.slice(0, 5).join(', ')}${states.length > 5 ? '...' : ''})\n`;
    summary += `- Collective Medals: ${totalGold} Gold, ${totalSilver} Silver, ${totalBronze} Bronze\n\n`;
  });

  return summary;
}
