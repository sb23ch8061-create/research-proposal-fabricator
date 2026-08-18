import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { headers, sampleRow } = await request.json();

    if (!headers || !headers.length) {
      return NextResponse.json({ success: false, error: "No headers provided." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are an expert data normalization assistant. I have uploaded a dataset with the following headers:
    ${JSON.stringify(headers)}

    Here is a sample row of data to help you understand the context:
    ${JSON.stringify(sampleRow)}

    You must map these original headers to my internal database schema.
    
    My strictly required internal fields for a profile are:
    1. "professor_name"
    2. "department_name"
    3. "university_name"

    Any other headers (like email, research interests, links, phone numbers) should be mapped as "evidence_[Original Header Name]".
    If a column contains useless data (like internal ID numbers), map it as "IGNORE".

    Return ONLY a raw JSON object dictionary where the keys are the ORIGINAL headers, and the values are the MAPPED internal fields.
    Example: {"Faculty": "professor_name", "Dept": "department_name", "Email": "evidence_Email"}
    DO NOT include markdown formatting or backticks.
    `;

    const result = await model.generateContent(prompt);
    let text = await result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const mapping = JSON.parse(text);

    return NextResponse.json({ success: true, mapping });

  } catch (error: any) {
    console.error("Schema Mapping API Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to map schema." }, { status: 500 });
  }
}