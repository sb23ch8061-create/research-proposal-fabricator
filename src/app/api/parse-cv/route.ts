import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('cv_file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No CV file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are a strict academic CV data extractor. Your job is to extract verified facts from the attached CV document.
    DO NOT hallucinate. If information for a field is not explicitly stated in the document, leave it as an empty string "".

    CRITICAL INSTRUCTION FOR MULTIPLE ITEMS:
    If the CV contains multiple publications, projects, or internships, you MUST extract ALL of them and format them as a numbered list within the string (e.g., "1. [Item One]\\n2. [Item Two]\\n3. [Item Three]").

    Map the extracted data to the following JSON structure exactly:
    {
      "full_name": "",
      "current_title": "",
      "research_focus": "",
      "methodologies": "",
      "academic_background": "",
      "technical_skills": "",
      "research_experience": "",
      "publications": "",
      "projects": "",
      "internships": "",
      "academic_achievements": "",
      "career_interests": "",
      "target_degree": "",
      "target_countries": "",
      "other_info": ""
    }

    Return ONLY raw JSON. Do not include markdown formatting or backticks.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf"
        }
      }
    ]);

    let text = await result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const extractedData = JSON.parse(text);

    return NextResponse.json({ success: true, extractedData });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to extract CV." }, { status: 500 });
  }
}