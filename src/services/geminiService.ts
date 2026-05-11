/**
 * Storytelling Agent - Gemini Service
 * Handles general queries based on Team USA inspiring articles
 * Generates stories, milestones, and highlights for Team USA excellence
 */
import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

const ARTICLE_FILES = [
  "/team_usa_aapi_collective_article.txt",
  "/team_usa_hispanic_collective_article.txt",
  "/team_usa_lgbtq_collective_article.txt",
  "/team_usa_military_collective_article.txt",
  "/team_usa_women_collective_article.txt"
];

// Generate image using Gemini 2.5 Flash Image
export async function generateGeminiImage(prompt: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt.slice(0, 1500)
              }
            ]
          }
        ]
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Gemini 2.5 Flash Image error response:", data);
    throw new Error(data?.error?.message || JSON.stringify(data));
  }

  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  const base64 = imagePart?.inlineData?.data;

  return base64 ? `data:image/png;base64,${base64}` : null;
}

// Generate detailed image prompt from slide text
async function generateImagePrompt(slideText: string): Promise<string> {
  const prompt = `
    You are an expert at creating detailed image generation prompts for AI image models.

    Based on the following slide text, create a detailed, specific image prompt that will generate a beautiful, colorful illustration.

    SLIDE TEXT: ${slideText}

    IMAGE REQUIREMENTS:
    - Colorful animated illustration style like a picture book for young people
    - Warm, friendly, approachable aesthetic
    - ENCOURAGED: Animated people silhouettes (no faces, just silhouettes)
    - ENCOURAGED: Sports equipment relevant to the content
    - NO Olympic branding, logos, or Team USA branding
    - NO Olympic rings, torches, flames, or any Olympic symbols
    - Focus on achievement, unity, excellence, celebration
    - Bright, cheerful colors (vibrant blues, reds, yellows, greens)
    - Soft, inviting aesthetic suitable for children's picture books
    - Use elements like stars, ribbons, confetti, joyful shapes
    - Warm, welcoming design with gentle shading
    - Suitable for a friendly, engaging presentation

    Output ONLY the image prompt, nothing else. Keep it under 200 words.
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        responseMimeType: "text/plain",
      }
    });

    const imagePrompt = result.text.trim();
    console.log("🎨 Generated image prompt:", imagePrompt);
    return imagePrompt;
  } catch (error) {
    console.error("Error generating image prompt:", error);
    return "";
  }
}

export async function generateInspiringStory() {
  // Randomly select an article file
  const randomArticle = ARTICLE_FILES[Math.floor(Math.random() * ARTICLE_FILES.length)];

  // Fetch the article content
  let articleContent = "";
  try {
    const response = await fetch(randomArticle);
    if (!response.ok) throw new Error(`Failed to load article: ${randomArticle}`);
    articleContent = await response.text();
  } catch (error) {
    console.error("Error loading article:", error);
    // Fallback to default AAPI article
    articleContent = "Asian American and Pacific Islander athletes in Olympic & Paralympic History";
  }

  const prompt = `
    You are a professional storyteller for the U.S. Olympic & Paralympic Museum.
    Your task is to generate an inspiring story in 4 distinct slides based on the following article content.

    ARTICLE CONTENT:
    ${articleContent}

    STRICT CATEGORICAL RULES:
    1. NEVER mention individual athlete names, athlete IDs, or any individual identifiable information.
    2. Focus on collective achievements and impact of the entire group mentioned in the article.
    3. Use the specific facts, metrics, sports, regions, and details mentioned in the article.
    4. You MUST generate at least 3 distinct points in the "milestones" list based on the article.
    5. Extract the states or regions mentioned in the article for the "highlightedStates" array.

    Structure the story into exactly 4 slides/parts. Each slide MUST be a short, concise narrative sentence. Do NOT include prefixes like "Part 1:" or "Slide 1:". Each slide should be a standalone impact statement based on the article content.

    Output Format: JSON
    {
      "title": "A compelling title based on the article theme",
      "slides": [
        "Concise introduction based on article...",
        "Concise key achievement from article...",
        "Concise another key achievement from article...",
        "Concise legacy/impact from article..."
      ],
      "milestones": ["...", "...", "..."],
      "highlightedStates": ["State1", "State2"]
    }
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = result.text;
    if (!text) throw new Error("No text returned from Gemini");
    const story = JSON.parse(text);

    // Generate images for each slide using two-step process
    const slidesWithImages = await Promise.all(
      story.slides.map(async (slide: string) => {
        // Step 1: Generate detailed image prompt from slide text
        const imagePrompt = await generateImagePrompt(slide);

        // Step 2: Generate image using the detailed prompt
        const imageUrl = imagePrompt ? await generateGeminiImage(imagePrompt) : null;

        return {
          text: slide,
          image: imageUrl
        };
      })
    );

    return {
      ...story,
      slides: slidesWithImages
    };
  } catch (error) {
    console.error("Error generating story:", error);
    // Fallback
    return {
      title: "Team USA Excellence",
      slides: [
        { text: "The history of Team USA is defined by the trailblazing spirit of athletes who shattered global records.", image: "" },
        { text: "In the Olympic arena, these pioneers secured historic victories and dominated various sports with excellence.", image: "" },
        { text: "Parallel to this, Paralympians achieved unprecedented success, securing numerous medals and rewriting history.", image: "" },
        { text: "Together, these legends have won collective medals, ensuring that Team USA remains a symbol of resilience and unified excellence.", image: "" }
      ],
      milestones: [
        "Record-breaking achievements in Olympic and Paralympic competition",
        "Historic team victories across multiple sports",
        "Representation milestones that inspired future generations"
      ],
      highlightedStates: ["California", "Texas"]
    };
  }
}
