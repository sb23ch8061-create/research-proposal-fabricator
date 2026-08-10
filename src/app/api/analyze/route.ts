import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { draft, insertions } = body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are a highly precise research proposal extraction engine.
    I will provide a proposal draft and a list of placeholders (e.g. [Name]).
    For each placeholder, analyze the surrounding sentence to understand exactly what information is missing.

    Draft:
    """${draft}"""

    Placeholders:
    ${JSON.stringify(insertions)}

    Return ONLY a valid JSON array of objects. Each object must have exactly these fields:
    - "id": (the exact id number provided in the placeholder list)
    - "question": (A highly specific question asking what needs to be researched to fill this blank, e.g., "What is the title of the professor's most recent paper on materials science?")
    - "source": (The most reliable source to find this, e.g., "Official University Profile", "Google Scholar", or "Official Laboratory Page")
    - "type": (e.g., "Factual Lookup", "Research Paper Analysis", or "Contextual Generation")

    Do NOT include any markdown formatting like \`\`\`json. Return ONLY the raw JSON array.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const analyzedData = JSON.parse(cleanText);

    return NextResponse.json({ success: true, data: analyzedData });

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ success: false, error: "Failed to analyze draft with AI." }, { status: 500 });
  }
}