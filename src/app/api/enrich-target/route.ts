import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sparseData = formData.get('sparseData') as string | null;
    const targetUrl = formData.get('targetUrl') as string | null;
    const file = formData.get('file') as File | null;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    let promptContext = "";
    let inlineData: any = undefined;

    if (targetUrl) {
      promptContext = `Extract the academic professor/target from this specific URL: ${targetUrl}.`;
    } else if (file) {
       const buffer = Buffer.from(await file.arrayBuffer());
       inlineData = { data: buffer.toString("base64"), mimeType: file.type || 'image/jpeg' };
       promptContext = `Extract the academic target(s) from this provided screenshot or image document.`;
    } else if (sparseData) {
      promptContext = `Here is a partial academic record: ${sparseData}.`;
    }

    const prompt = `
    You are an autonomous academic research engine. 
    ${promptContext}
    
    YOUR CORE OBJECTIVE: You must automatically act as a web-researcher. Do NOT just return the sparse data I gave you. You must actively deduce, cross-check, and fill in the missing details (like Email, Department, Official Profile URL, Research Group, and Research Focus) using your vast internal knowledge base of academic institutions.
    
    If a detail absolutely cannot be determined or cross-checked, map its value as "NOT VERIFIED". Do not fabricate.

    Return ONLY a strict JSON array of objects representing the fully enriched and cross-checked profiles.
    Format exactly like this:
    [
      {
        "professor_name": "Full Name",
        "university_name": "University Name",
        "department_name": "Department Name",
        "evidence": [
          { "field_name": "Email", "field_value": "email@domain.edu or NOT VERIFIED" },
          { "field_name": "Official_Profile", "field_value": "URL or NOT VERIFIED" },
          { "field_name": "Research_Group", "field_value": "Group Name or NOT VERIFIED" },
          { "field_name": "Research_Focus", "field_value": "Detailed focus areas..." }
        ]
      }
    ]
    `;

    const payload: any[] = [prompt];
    if (inlineData) payload.push({ inlineData });

    const result = await model.generateContent(payload);
    let text = await result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const enrichedProfiles = JSON.parse(text);

    return NextResponse.json({ success: true, enrichedProfiles });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}