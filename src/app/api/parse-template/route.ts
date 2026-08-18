import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('template_file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "application/pdf";

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are an expert academic template structural parser. Your task is to extract the structure and template characteristics from the provided document.
    DO NOT hallucinate. 
    
    Analyze the document and extract its structural hierarchy, headings, subheadings, required sections, and general flow.
    Wherever you detect a placeholder, instruction, or dynamic field that needs to be filled (e.g., "[Insert Name]", "Date", "Summary of research"), replace it strictly with the exact format: [INSERTION: precise description of what goes here].

    Return ONLY a raw JSON object with no markdown formatting or backticks.
    JSON Format:
    {
      "title": "A logical title for this template based on its contents",
      "draft_content": "The full reconstructed template text preserving the structure, with [INSERTION: ...] tags replacing dynamic fields."
    }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    let text = await result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const extractedData = JSON.parse(text);

    return NextResponse.json({ success: true, extractedData });

  } catch (error: any) {
    console.error("Template Parse API Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to parse template." }, { status: 500 });
  }
}