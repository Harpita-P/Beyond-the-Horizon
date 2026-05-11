/**
 * Gemini State Selector
 * State selection and filtering for Team USA athlete data
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeCSVDataForState } from './csvDataService';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

// Cache the model name
let cachedModelName: string | null = null;

async function getAvailableModel(): Promise<string> {
  if (cachedModelName) return cachedModelName;

  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
      cachedModelName = 'gemini-1.5-pro';
      return cachedModelName;
    }
    
    const data = await response.json();
    for (const model of data.models || []) {
      const methods = model.supportedGenerationMethods || [];
      if (methods.includes('generateContent')) {
        const modelName = model.name.replace('models/', '');
        console.log(`✅ Using model: ${modelName}`);
        cachedModelName = modelName;
        return modelName;
      }
    }
    
    cachedModelName = 'gemini-1.5-pro';
    return cachedModelName;
  } catch (error) {
    cachedModelName = 'gemini-1.5-pro';
    return cachedModelName;
  }
}

export async function geminiPickRandomState(availableStates: string[]): Promise<string> {
  try {
    const modelName = await getAvailableModel();
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are helping with a geography game. Pick ONE random US state from this list of states that have Team USA Paralympic athletes:

AVAILABLE STATES: ${availableStates.join(', ')}

Pick ONE state randomly. Return ONLY the 2-letter state code, nothing else.

Example response: CO`;

    console.log('🎲 Asking Gemini to pick a random state...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract just the state code (in case Gemini adds extra text)
    const stateMatch = text.match(/\b([A-Z]{2})\b/);
    const selectedState = stateMatch ? stateMatch[1] : availableStates[0];
    
    console.log(`✅ Gemini selected state: ${selectedState}`);
    return selectedState;
  } catch (error) {
    console.error('❌ Error with Gemini state selection, using random:', error);
    return availableStates[Math.floor(Math.random() * availableStates.length)];
  }
}

export async function geminiPickLocationInState(
  stateCode: string,
  stateName: string
): Promise<{ lat: number; lng: number; locationName: string; hint: string } | null> {
  try {
    const modelName = await getAvailableModel();
    const model = genAI.getGenerativeModel({ model: modelName });

    const csvData = await analyzeCSVDataForState(stateCode);

    const prompt = `Pick a Street View location in ${stateName} for a geography game.

TEAM USA DATA:
${csvData}

TASK:
1. Pick a specific location in ${stateName} with Street View coverage (landmark, park, downtown area, scenic viewpoint)
2. Create a hint that blends geography/climate with Team USA athlete data

RULES:
- DO NOT mention state name
- DO NOT mention city names, county names, or town names
- DO NOT mention specific landmarks by name
- DO NOT mention athlete names
- Use only: terrain, climate, elevation, athlete count, sport, medals, years

Return ONLY a JSON object:
{
  "lat": 39.7392,
  "lng": -104.9903,
  "hint": "Where towering peaks meet winter excellence, 11 Para Alpine Skiing champions have earned 3 Paralympic medals across two decades.",
  "locationName": "Red Rocks Amphitheatre"
}`;

    console.log(`🗺️ Asking Gemini to pick location in ${stateName}...`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const locationData = JSON.parse(jsonMatch[0]);
    console.log(`✅ Gemini picked: ${locationData.locationName}`);
    
    return locationData;
  } catch (error) {
    console.error('❌ Error picking location:', error);
    return null;
  }
}

export async function geminiGenerateHints(
  stateCode: string,
  stateName: string
): Promise<string[]> {
  try {
    const modelName = await getAvailableModel();
    const model = genAI.getGenerativeModel({ model: modelName });

    const csvData = await analyzeCSVDataForState(stateCode);

    const prompt = `Generate 4 progressive hints for ${stateName}.

TEAM USA DATA:
${csvData}

Create 4 hints from vague to specific:

HINT 1: Geography + general achievement
HINT 2: Natural features + specific sport
HINT 3: Terrain + medal count
HINT 4: Exact athlete count + medal breakdown

RULES:
- DO NOT mention state name (except "this state" in hint 4)
- DO NOT mention city/county/town names
- DO NOT mention landmarks by name
- DO NOT mention athlete names
- Use only: geography, climate, terrain, elevation, athlete count, sport, medals, years

Return ONLY a JSON array:
["Hint 1", "Hint 2", "Hint 3", "Hint 4"]`;

    console.log('💡 Asking Gemini to generate hints...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [
        'This region has produced Team USA athletes.',
        'The terrain here has shaped champions.',
        'Athletes from this area have earned medals.',
        'This state has contributed to Team USA.'
      ];
    }

    const hints: string[] = JSON.parse(jsonMatch[0]);
    console.log('✅ Generated hints');
    return hints;
  } catch (error) {
    console.error('❌ Error generating hints:', error);
    return [
      'This region has produced Team USA athletes.',
      'The terrain here has shaped champions.',
      'Athletes from this area have earned medals.',
      'This state has contributed to Team USA.'
    ];
  }
}
