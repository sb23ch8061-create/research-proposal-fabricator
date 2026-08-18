import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { professorName, university, department, targetColumn } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are an autonomous academic research engine.
    Target Professor: ${professorName || 'Unknown'}
    University: ${university || 'Unknown'}
    Department: ${department || 'Unknown'}
    
    YOUR DIRECTIVE: Find specific information regarding: "${targetColumn}".
    
    Actively deduce and cross-check using your knowledge base. If this detail absolutely cannot be determined, return the exact phrase "NOT VERIFIED". Do not fabricate.

    Return ONLY the raw text answer. No JSON, no formatting, no markdown. Just the plain text answer.
    `;

    const result = await model.generateContent(prompt);
    let text = await result.response.text();
    
    // Clean up any accidental markdown the AI might still try to add
    text = text.replace(/```/g, '').trim();

    return NextResponse.json({ success: true, extractedData: { field_value: text } });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}