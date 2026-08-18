import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { universityName } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are an autonomous academic research engine.
    
    Target Institution: ${universityName}
    
    YOUR DIRECTIVE: Conduct deep web research to extract the official academic structure and admission intelligence for this specific university. 
    If a specific detail varies heavily by department, state "Department Dependent". Do not hallucinate generic answers if the official structure is unknown; use "NOT VERIFIED".
    
    Return ONLY a strict JSON object exactly matching this schema:
    {
      "phd_admission_process": "Brief explanation of how PhD admission works here (e.g., advertised positions vs. cold emailing).",
      "phd_funding": "Is it primarily professor-grant based, scholarship based, or mixed?",
      "direct_phd_possible": "YES, NO, or DEPARTMENT DEPENDENT.",
      "phd_criteria": "Core academic criteria for PhD...",
      "masters_admission": "Brief Master's admission process...",
      "masters_funding": "Available scholarships or funding routes...",
      "departments": ["List of 10-15 major relevant departments, schools, or faculties at this university"]
    }
    `;

    const result = await model.generateContent(prompt);
    let text = await result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const intelligenceData = JSON.parse(text);

    return NextResponse.json({ success: true, intelligenceData });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}