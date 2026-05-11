/**
 * Hometown Info Service
 * Hometown information generation for Team USA athletes
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

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

export async function getHometownSupportInfo(stateName: string): Promise<string> {
  try {
    const modelName = await getAvailableModel();
    const model = genAI.getGenerativeModel({ 
      model: modelName
    });

    const prompt = `Write a brief, engaging narrative about ${stateName}'s role as a hometown support hub for Team USA in Olympic and Paralympic sports.

STYLE:
- Write as if you're exploring Team USA history and discovering this state's contributions
- Use a storytelling tone, not a list
- Make it flow naturally like a short story paragraph

CONTENT REQUIREMENTS:
- Name SPECIFIC training facilities, centers, or sites
- Mention what sports are trained there
- Keep it to ONE short paragraph (3-4 sentences max)
- Be concrete and specific, not generic
- DO NOT use markdown formatting (no **, no ##, no bullets)
- DO NOT mention athlete names
- DO NOT mention specific games (e.g., "Paris 2024")

Example: "As you explore ${stateName}, you discover it serves as a vital training ground for Team USA. The state is home to [Facility Name], where athletes train for [sport]. [Another facility] provides specialized support for [sport], while [location/facility] draws athletes for [sport] training."

Return ONLY plain text with no markdown formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Strip any markdown formatting that might have slipped through
    text = text.replace(/\*\*/g, ''); // Remove bold **
    text = text.replace(/\*/g, '');   // Remove italic *
    text = text.replace(/#{1,6}\s/g, ''); // Remove headers
    text = text.replace(/^\s*[-*+]\s/gm, ''); // Remove bullet points
    
    return text.trim();
  } catch (error) {
    console.error('Error fetching hometown info:', error);
    return `Welcome to ${stateName}. This state has been a proud supporter of Team USA athletes, providing training facilities and infrastructure that help develop Olympic and Paralympic talent. The region's commitment to sports excellence continues to shape the next generation of elite athletes.`;
  }
}
