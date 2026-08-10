import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { university } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are a highly precise university research engine.
    Target Institution: "${university}"
    
    Identify the official main website URL for this institution, and provide a list of up to 6 major academic departments (e.g., Computer Science, Biology, Engineering) with their likely direct official URLs.
    
    Return ONLY a valid JSON object with this exact structure:
    {
      "domain": "https://www.example.edu",
      "departments": [
        { "name": "Department of Computer Science", "url": "https://cs.example.edu" }
      ]
    }
    Do NOT include any markdown formatting like \`\`\`json. Return ONLY the raw JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanText);

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Discovery Engine Error:", error);
    return NextResponse.json({ success: false, error: "Failed to locate institution details." }, { status: 500 });
  }
}