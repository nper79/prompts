
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateFromJSON(jsonString: string): Promise<string> {
    try {
      // Parse the JSON to ensure it's valid and extract the prompt
      let promptText = "";
      try {
        const parsed = JSON.parse(jsonString);
        // Convert JSON keys/values into a descriptive natural language prompt
        promptText = Object.entries(parsed)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join(". ");
      } catch (e) {
        // If not valid JSON, use the raw string
        promptText = jsonString;
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `Generate a high-quality visual based on these specifications: ${promptText}`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let imageUrl = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageUrl) throw new Error("No image generated in the response");
      return imageUrl;
    } catch (error) {
      console.error("Gemini Image Generation Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
