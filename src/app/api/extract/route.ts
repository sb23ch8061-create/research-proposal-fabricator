import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    // Upgraded: Route through a public Reader API to bypass blockers and render JavaScript
    const readerUrl = `https://r.jina.ai/${url}`;
    const pageResponse = await fetch(readerUrl);
    const textContent = await pageResponse.text();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are a highly precise academic data extractor.
    Below is the text content of a university department page.
    Extract a list of the professors mentioned on this page.
    For each professor, provide their name, their academic title, and their specific research area if explicitly stated.
    
    Return ONLY a valid JSON object with this exact structure:
    {
      "professors": [
        { "name": "Jane Doe", "title": "Professor", "researchArea": "Artificial Intelligence" }
      ]
    }
    Do NOT include any markdown formatting like \`\`\`json. Return ONLY the raw JSON object.
    
    Page Content:
    ${textContent.substring(0, 35000)}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanText);

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Extraction Engine Error:", error);
    return NextResponse.json({ success: false, error: "Failed to extract professor data from the provided link." }, { status: 500 });
  }
}