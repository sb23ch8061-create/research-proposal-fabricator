import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sparseData = formData.get('sparseData') as string | null;
    const targetUrl = formData.get('targetUrl') as string | null;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    // Utilizing the exact model you specified as working
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    let promptContext = "";
    if (targetUrl) {
      promptContext = `Extract the academic professor/target from this specific URL: ${targetUrl}.`;
    } else if (sparseData) {
      promptContext = `Here is a partial academic record: ${sparseData}.`;
    }

    const prompt = `
    You are an expert academic research engine. 
    ${promptContext}
    
    Your strict directive is to actively cross-check this information using your knowledge base. If the provided data is sparse (e.g., missing an email, department, research group, or current focus), you must identify the professor and deduce the missing details accurately. 
    
    If a detail absolutely cannot be verified, map its value as "NOT VERIFIED". Do not fabricate.

    Return ONLY a strict JSON array of objects representing the enriched profiles.
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

    const result = await model.generateContent(prompt);
    let text = await result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const enrichedProfiles = JSON.parse(text);

    return NextResponse.json({ success: true, enrichedProfiles });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}