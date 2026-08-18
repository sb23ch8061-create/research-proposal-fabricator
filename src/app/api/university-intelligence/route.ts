import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { universityName } = await request.json();

    if (!universityName) {
       return NextResponse.json({ success: true, intelligenceData: getFallback("Target institution not specified.") });
    }

    const apiKey = process.env.GEMINI_API_KEY as string;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    Target Institution: ${universityName}
    Return ONLY a strict JSON object exactly matching this schema:
    {
      "phd_admission_process": "Brief explanation.",
      "phd_funding": "Grant based, scholarship based, or mixed?",
      "direct_phd_possible": "YES, NO, or DEPARTMENT DEPENDENT.",
      "phd_criteria": "Core academic criteria...",
      "masters_admission": "Master's admission process...",
      "masters_funding": "Available scholarships...",
      "departments": ["List of 10-15 major relevant departments"]
    }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    let intelligenceData;
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : text;
        intelligenceData = JSON.parse(cleanJson);
    } catch (e) {
        intelligenceData = getFallback("Data extraction formatting mismatch.");
    }

    return NextResponse.json({ success: true, intelligenceData });

  } catch (error: any) {
    return NextResponse.json({ success: true, intelligenceData: getFallback(error.message) });
  }
}

function getFallback(reason: string) {
    return {
        phd_admission_process: `SYSTEM OVERRIDE NOTIFICATION: ${reason}`,
        phd_funding: "VERIFICATION REQUIRED",
        direct_phd_possible: "VERIFICATION REQUIRED",
        phd_criteria: "VERIFICATION REQUIRED",
        masters_admission: "VERIFICATION REQUIRED",
        masters_funding: "VERIFICATION REQUIRED",
        departments: ["Computer Science", "Physics", "Chemistry", "Biology", "Engineering", "Business", "Law", "Medicine"]
    };
}