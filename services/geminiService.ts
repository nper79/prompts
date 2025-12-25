
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateTags(jsonString: string): Promise<string[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this image generation JSON prompt and return exactly 5 descriptive tags (single words or short phrases) representing the style, subject, and mood. Return ONLY the tags separated by commas.
        Prompt JSON: ${jsonString}`,
      });
      
      const text = response.text || "";
      return text.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .slice(0, 5);
    } catch (error) {
      console.error("Tag Generation Error:", error);
      return ["ai-generated", "json-prompt"];
    }
  }

  async generateFromJSON(jsonString: string): Promise<string> {
    try {
      let promptText = "";
      try {
        const parsed = JSON.parse(jsonString);
        promptText = Object.entries(parsed)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join(". ");
      } catch (e) {
        promptText = jsonString;
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `Generate a high-quality visual based on these specifications: ${promptText}` }],
        },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let imageUrl = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageUrl) throw new Error("No image generated");
      return imageUrl;
    } catch (error) {
      console.error("Gemini Image Generation Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
