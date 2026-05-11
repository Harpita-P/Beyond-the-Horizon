import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeCSVDataForState } from './csvDataService';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

// Cache the model name so we only fetch it once
let cachedModelName: string | null = null;

async function getAvailableModel(): Promise<string> {
  if (cachedModelName) {
    return cachedModelName;
  }

  try {
    console.log('🔍 Fetching available Gemini models...');
    
    // Try to list models via REST API
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
      console.warn('⚠️ Could not list models, using fallback: gemini-1.5-pro');
      cachedModelName = 'gemini-1.5-pro';
      return cachedModelName;
    }
    
    const data = await response.json();
    
    // Find first model that supports generateContent
    for (const model of data.models || []) {
      const methods = model.supportedGenerationMethods || [];
      if (methods.includes('generateContent')) {
        // Extract model name (e.g., "models/gemini-1.5-pro" -> "gemini-1.5-pro")
        const modelName = model.name.replace('models/', '');
        console.log(`✅ Using model: ${modelName}`);
        cachedModelName = modelName;
        return modelName;
      }
    }
    
    // Fallback if no model found
    console.warn('⚠️ No model with generateContent found, using fallback: gemini-1.5-pro');
    cachedModelName = 'gemini-1.5-pro';
    return cachedModelName;
  } catch (error) {
    console.error('❌ Error fetching models:', error);
    cachedModelName = 'gemini-1.5-pro';
    return cachedModelName;
  }
}

interface GeminiLocationResponse {
  lat: number;
  lng: number;
  hint: string;
  locationName: string;
}

export async function getGeminiHidingLocation(
  stateCode: string,
  stateName: string
): Promise<GeminiLocationResponse | null> {
  try {
    const modelName = await getAvailableModel();
    const model = genAI.getGenerativeModel({ model: modelName });

    // Get CSV data analysis
    const csvData = await analyzeCSVDataForState(stateCode);

    const prompt = `You are playing a geographic hide-and-seek game! 

TASK 1: Analyze the Team USA athlete data below
TASK 2: Pick an interesting location in ${stateName}
TASK 3: Create a hint that blends geography/climate with the athlete data

${csvData}

INSTRUCTIONS:
1. ANALYZE the CSV data above - understand the sport, athletes, and cities
2. PICK a specific location in ${stateName} with Street View coverage (landmark, park, downtown, etc.)
3. CREATE a hint that combines:
   - Geography: mountains, coast, desert, plains, climate, weather, terrain
   - Team USA Facts: Use the ACTUAL data above (sport, athlete count, medals)
   - Make it cryptic but solvable
   - DO NOT mention the state name
   - DO NOT mention city names, county names, or specific town names
   - DO NOT mention specific landmarks by name
   - Use only general geographic features (mountains, valleys, rivers, climate, elevation)

Example: "Where Rocky Mountain peaks touch the sky and winter snows blanket alpine slopes, 12 Para Alpine Skiing champions have conquered both elevation and excellence, earning 3 Paralympic medals."

Return ONLY a JSON object:
{
  "lat": 39.7392,
  "lng": -104.9903,
  "hint": "Your creative hint here",
  "locationName": "Red Rocks Amphitheatre, Morrison"
}`;

    console.log('🤖 Asking Gemini to analyze CSV and pick location...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('📝 Gemini response:', text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Could not parse JSON from Gemini response');
      return null;
    }

    const locationData: GeminiLocationResponse = JSON.parse(jsonMatch[0]);
    
    console.log('✅ Gemini picked location:', locationData.locationName);
    console.log('📍 Coordinates:', locationData.lat, locationData.lng);
    console.log('💡 Hint:', locationData.hint);

    return locationData;
  } catch (error) {
    console.error('❌ Error getting Gemini location:', error);
    return null;
  }
}

export async function getGeminiHints(
  stateCode: string,
  stateName: string,
  locationName: string
): Promise<string[]> {
  try {
    const modelName = await getAvailableModel();
    const model = genAI.getGenerativeModel({ model: modelName });

    // Get CSV data analysis
    const csvData = await analyzeCSVDataForState(stateCode);

    const prompt = `Generate 4 progressive hints for a geographic guessing game.

LOCATION: ${stateName} near ${locationName}

TEAM USA DATA TO ANALYZE:
${csvData}

TASK:
1. ANALYZE the CSV data above - understand the sport, athlete count, medals
2. CREATE 4 hints that get progressively more specific
3. BLEND geography/climate with the ACTUAL Team USA data

HINT 1 (Vague): Geography + general athletic achievement
Example: "Where desert sun meets determination, this region has shaped champions who thrive in extreme winter conditions."

HINT 2 (Geographic + Sport): Natural features + specific sport from data
Example: "The high peaks and winter climate here have produced Para Alpine Skiing athletes who dominate on snow-covered slopes."

HINT 3 (More Specific): Terrain + medal count
Example: "From mountain ranges to alpine valleys, athletes have brought home 3 Paralympic medals in winter competitions."

HINT 4 (Most Specific): Exact athlete count + medal breakdown
Example: "This state has contributed 12 Para Alpine Skiing Paralympians, earning 1 gold, 2 silver, and 3 bronze medals across multiple Games."

CRITICAL RULES:
- Use ONLY the data provided above
- DO NOT make up facts
- DO NOT mention the state name (except "this state" in hint 4)
- DO NOT mention city names, county names, or town names
- DO NOT mention specific landmarks by name
- DO NOT mention athlete names
- Use only: geography, climate, terrain, elevation, athlete count, sport, medals, years

Return ONLY a JSON array:
["Hint 1", "Hint 2", "Hint 3", "Hint 4"]`;

    console.log('🤖 Asking Gemini to analyze CSV and create hints...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('📝 Gemini hints response:', text);

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('❌ Could not parse JSON array from Gemini response');
      return [
        'This region has produced Team USA athletes who excel in their sport.',
        'The local terrain and climate have shaped champions.',
        'Athletes from this area have brought home medals.',
        'This state has contributed to Team USA\'s athletic legacy.'
      ];
    }

    const hints: string[] = JSON.parse(jsonMatch[0]);
    console.log('✅ Generated hints:', hints);

    return hints;
  } catch (error) {
    console.error('❌ Error getting Gemini hints:', error);
    return [
      'This region has produced Team USA athletes who excel in their sport.',
      'The local terrain and climate have shaped champions.',
      'Athletes from this area have brought home medals.',
      'This state has contributed to Team USA\'s athletic legacy.'
    ];
  }
}
