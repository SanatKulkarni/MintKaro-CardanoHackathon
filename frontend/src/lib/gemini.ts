import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

async function generateNanoBananaImage() {
  const apiKey = process.env.GEMINI_API_KEY!;

  // Initialize Gemini client with API key
  const ai = new GoogleGenAI({ apiKey });

  const prompt = "A fantasy-style illustration of a golden banana, with magical glowing runes, floating above a dark forest at twilight";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,  // or [prompt] 
      config: {
        responseModalities: ["Image"],
        imageConfig: {
          aspectRatio: "1:1"
        }
      },
    });

    // The API returns Base64-encoded image data
    if (response.candidates && response.candidates[0]?.content?.parts?.[0]) {
      const part = response.candidates[0].content.parts[0];
      if (part.inlineData && part.inlineData.data) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        fs.writeFileSync("nano_banana_image.png", buffer);
        console.log("Image saved to nano_banana_image.png");
      } else {
        console.error("No image data returned");
      }
    } else {
      console.error("No candidates returned from the API");
    }
  } catch (err) {
    console.error("Error generating image:", err);
  }
}

generateNanoBananaImage();
