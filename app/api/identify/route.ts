import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { DishResult } from '../../types';

// Type for the expected JSON response structure
type GeminiResponse = {
  name: string;
  region: string;
  ingredients: string[];
  instructions: string[];
  funFacts: string[];
};

// Helper function to extract sections from text
const extractSection = (text: string, sectionMarker: string): string[] => {
  const sectionStart = text.indexOf(sectionMarker);
  if (sectionStart === -1) return [];
  
  const nextSection = text.slice(sectionStart + sectionMarker.length);
  const lines = nextSection.split('\n')
    .map(line => line.trim())
    .filter(line => line && (line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line)))
    .map(line => line.replace(/^[-•]|^\d+\./, '').trim());
  
  return lines;
};

// Helper function to create a structured response from text
const createStructuredResponse = (text: string): DishResult => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  // Extract name and region using regex
  const nameMatch = text.match(/name:?\s*([^\n]+)/i);
  const regionMatch = text.match(/region:?\s*([^\n]+)/i);
  
  return {
    name: nameMatch?.[1]?.trim() || 'Unknown Dish',
    region: regionMatch?.[1]?.trim() || 'Origin not specified',
    ingredients: extractSection(text, 'Ingredients'),
    instructions: extractSection(text, 'Instructions'),
    funFacts: extractSection(text, 'Fun Facts')
  };
};

// Helper function to validate JSON response
const isValidDishResult = (data: any): data is GeminiResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.name === 'string' &&
    (typeof data.region === 'string' || data.region === undefined) &&
    Array.isArray(data.ingredients) &&
    Array.isArray(data.instructions) &&
    Array.isArray(data.funFacts)
  );
};

export async function POST(request: NextRequest) {
  try {
    // 1. Extract and validate the image from the request
    const data = await request.formData();
    const image = data.get('image');
    
    if (!image || !(image instanceof Blob)) {
      return NextResponse.json(
        { error: 'No valid image provided' },
        { status: 400 }
      );
    }

    // 2. Convert image to base64
    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // 3. Initialize Gemini AI
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 4. Prepare the prompt
    const prompt = `
      Analyze this dish image and provide detailed information in JSON format about:
      1. The name of the dish
      2. Its regional origin/cuisine
      3. Required ingredients
      4. Step-by-step cooking instructions
      5. 3-4 unique and interesting facts about its history or cultural significance

      Please provide the response in this exact JSON format:
      {
        "name": "Full Dish Name",
        "region": "Specific Region/Cuisine Origin",
        "ingredients": ["Complete ingredient 1", "Complete ingredient 2", ...],
        "instructions": ["Detailed step 1", "Detailed step 2", ...],
        "funFacts": ["Detailed fact 1", "Detailed fact 2", "Detailed fact 3"]
      }
    `.trim();

    // 5. Generate content
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64
        }
      }
    ]);

    const responseText = result.response.text();

    // 6. Try to parse JSON response
    try {
      // First attempt: Find and parse JSON object
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        if (isValidDishResult(parsedResponse)) {
          return NextResponse.json({
            ...parsedResponse,
            region: parsedResponse.region || 'Origin not specified'
          });
        }
      }

      // Second attempt: Parse structured text
      const structuredResponse = createStructuredResponse(responseText);
      
      // Validate the structured response has at least some content
      if (structuredResponse.name !== 'Unknown Dish' || 
          structuredResponse.ingredients.length > 0 || 
          structuredResponse.instructions.length > 0) {
        return NextResponse.json(structuredResponse);
      }

      // If both attempts fail, return a basic response
      return NextResponse.json({
        name: 'Unable to identify dish',
        region: 'Origin not specified',
        ingredients: [],
        instructions: ['No instructions available'],
        funFacts: ['No information available']
      });

    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      throw new Error('Failed to parse AI response');
    }

  } catch (error) {
    console.error('API Error:', error);
    
    // Return appropriate error responses based on error type
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Service configuration error' },
          { status: 503 }
        );
      }
      if (error.message.includes('parse')) {
        return NextResponse.json(
          { error: 'Failed to process AI response' },
          { status: 422 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}