import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { professorName, university, department, targetColumn } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are an autonomous academic research engine.
    
    Target Professor: ${professorName}
    University: ${university}
    Department: ${department}
    
    YOUR DIRECTIVE: Find specific information regarding: "${targetColumn}".
    
    Actively deduce and cross-check using your knowledge base. If this specific detail absolutely cannot be determined for this specific professor, map its value as "NOT VERIFIED". Do not fabricate.

    Return ONLY a strict JSON object.
    Format exactly like this:
    {
      "field_value": "Extracted information or NOT VERIFIED"
    }
    `;

    const result = await model.generateContent(prompt);
    let text = await result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const extractedData = JSON.parse(text);

    return NextResponse.json({ success: true, extractedData });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}