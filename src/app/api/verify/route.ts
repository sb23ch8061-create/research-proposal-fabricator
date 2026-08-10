import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { name, title, researchArea, contextUrl } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are a highly precise academic verification engine.
    Verify the following professor based on your training data and academic records:
    Name: ${name}
    Title: ${title}
    Stated Research Area: ${researchArea}
    Department URL context: ${contextUrl}
    
    Cross-reference this academic. Identify their verified primary research fields and a likely recent publication topic or specific methodology they use.
    
    Return ONLY a valid JSON object with this exact structure:
    {
      "verified": true,
      "evidence": "Verified academic at this institution focusing on [Topic].",
      "verifiedResearch": "Specific Area 1, Specific Area 2",
      "recentPublicationTopic": "Title or Topic of recent work"
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
    console.error("Verification Engine Error:", error);
    return NextResponse.json({ success: false, error: "Failed to verify professor identity." }, { status: 500 });
  }
}