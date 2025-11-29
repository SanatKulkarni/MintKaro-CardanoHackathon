import { GoogleGenAI } from "@google/genai";
import { PinataSDK } from "pinata";
import dotenv from "dotenv";

dotenv.config();

const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY!,
});

async function generateAndUploadImage(prompt: string, imageNumber: number) {
  const apiKey = process.env.GEMINI_API_KEY!;

  // Initialize Gemini client with API key
  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log(`\n[Image ${imageNumber}] Generating image with Gemini...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
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
        
        console.log(`[Image ${imageNumber}] Image generated successfully. Uploading to Pinata...`);
        
        // Convert buffer to File object for Pinata upload
        const file = new File([buffer], `generated-image-${imageNumber}.png`, { type: "image/png" });
        const upload = await pinata.upload.public.file(file);
        
        console.log(`[Image ${imageNumber}] Upload successful!`);
        console.log(`[Image ${imageNumber}] CID:`, upload.cid);
        const gatewayUrl = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${upload.cid}?pinataGatewayToken=${process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN}`;
        console.log(`[Image ${imageNumber}] Gateway URL:`, gatewayUrl);
        
        return {
          success: true,
          imageNumber,
          ipfsHash: upload.cid,
          gatewayUrl,
          upload
        };
      } else {
        console.error(`[Image ${imageNumber}] No image data returned`);
        return { success: false, imageNumber, error: "No image data returned" };
      }
    } else {
      console.error(`[Image ${imageNumber}] No candidates returned from the API`);
      return { success: false, imageNumber, error: "No candidates returned from the API" };
    }
  } catch (err) {
    console.error(`[Image ${imageNumber}] Error generating or uploading image:`, err);
    return { success: false, imageNumber, error: err };
  }
}

async function generateMultipleImages(basePrompt: string, count: number = 5) {
  console.log(`\n🎨 Starting generation of ${count} images...`);
  console.log(`Base prompt: "${basePrompt}"\n`);
  
  const variations = [
    "with vibrant neon colors and a cyberpunk aesthetic",
    "in a minimalist style with pastel colors and soft lighting",
    "with dramatic dark tones and intense contrast, mysterious atmosphere",
    "in a whimsical cartoon style with bright cheerful colors",
    "with realistic photographic detail and natural lighting"
  ];
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const variation = variations[i] || variations[i % variations.length];
    const fullPrompt = `${basePrompt}, ${variation}`;
    console.log(`\n📝 Prompt for Image ${i + 1}: "${fullPrompt}"`);
    
    const result = await generateAndUploadImage(fullPrompt, i + 1);
    results.push(result);
    
    // Add a small delay between requests to avoid rate limiting
    if (i < count - 1) {
      console.log("\n⏳ Waiting 2 seconds before next generation...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

// Example usage
async function main() {
  // Sample prompt for testing - user can modify this
  const userPrompt = "A majestic dragon soaring through the clouds";
  
  const results = await generateMultipleImages(userPrompt, 5);
  
  console.log("\n\n" + "=".repeat(80));
  console.log("📊 SUMMARY OF GENERATED IMAGES");
  console.log("=".repeat(80) + "\n");
  
  const successfulUploads = results.filter(r => r.success);
  const failedUploads = results.filter(r => !r.success);
  
  console.log(`✅ Successfully generated and uploaded: ${successfulUploads.length}/${results.length} images\n`);
  
  if (successfulUploads.length > 0) {
    console.log("🖼️  Access your images at:");
    successfulUploads.forEach((result: any) => {
      console.log(`\n${result.imageNumber}. CID: ${result.ipfsHash}`);
      console.log(`   URL: ${result.gatewayUrl}`);
    });
  }
  
  if (failedUploads.length > 0) {
    console.log(`\n\n❌ Failed uploads: ${failedUploads.length}`);
    failedUploads.forEach((result: any) => {
      console.log(`   Image ${result.imageNumber}: ${result.error}`);
    });
  }
  
  console.log("\n" + "=".repeat(80) + "\n");
}

main();

export { generateAndUploadImage, generateMultipleImages };
