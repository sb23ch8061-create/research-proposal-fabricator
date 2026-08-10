import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { name, title, department_url } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are a strict, exhaustive academic verification engine.
    Target Professor: ${name}
    Title: ${title}
    Anchor Institution URL: ${department_url}

    Your task is to comprehensively research this professor and return ONLY a strictly formatted JSON object. 
    You must NOT fabricate information. You must disambiguate this professor from others with similar names using the Anchor Institution URL.

    For each category (email, identity, lab, research, recruitment), you must provide:
    1. "value": The extracted information.
    2. "status": Must be EXACTLY one of: "VERIFIED", "PARTIALLY VERIFIED", "CONFLICTING", or "NOT FOUND".
    3. "sources": An array of specific URL strings used as evidence.

    Status Logic Rules:
    - VERIFIED: Confirmed by official Tier 1 institutional sources (.edu, official department/lab pages).
    - PARTIALLY VERIFIED: Found on a lab page but missing from the main university page, or vice versa.
    - CONFLICTING: Different sources provide contradictory information.
    - NOT FOUND: No reliable information exists, or an email is only inferred (inferred emails MUST be marked NOT FOUND).

    Output EXACTLY this JSON structure and nothing else (no markdown, no backticks):
    {
      "email_data": { "value": "email@univ.edu", "status": "VERIFIED", "sources": ["https://..."] },
      "identity_data": { "value": "Full Name, Affiliation", "status": "VERIFIED", "sources": ["https://..."] },
      "lab_data": { "value": "Lab Name or PI Status", "status": "NOT FOUND", "sources": [] },
      "research_data": { "value": "Specific Research Topics", "status": "VERIFIED", "sources": ["https://..."] },
      "recruitment_data": { "value": "Currently open PhD positions...", "status": "NOT FOUND", "sources": [] }
    }
    `;

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    try {
      const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleanText);
      return NextResponse.json({ success: true, data });
    } catch (parseError) {
      console.error("DIAGNOSTIC: AI failed to return valid JSON. Raw output was:", text);
      return NextResponse.json({ success: false, error: "AI formatting error. See terminal for raw output." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("DIAGNOSTIC: Exhaustive Engine Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to connect to AI model." }, { status: 500 });
  }
}