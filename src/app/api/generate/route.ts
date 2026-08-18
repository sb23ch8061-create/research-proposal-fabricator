import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { templateContent, professorContext, professorName } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    // Using the same reliable model that bypassed your API tier restrictions
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are an expert academic proposal writer.
    Your task is to finalize a research proposal directed to Professor ${professorName}.

    Below is the user's Draft Proposal Template. It contains specific insertion points enclosed in brackets (e.g., [INSERTION: ...]).
    Below the template is the Verified Professor Data containing strict, extracted facts about the professor.

    YOUR INSTRUCTIONS:
    1. Read the Draft Proposal Template.
    2. Read the Verified Professor Data.
    3. Rewrite the proposal, replacing EVERY insertion point with a well-crafted, academic paragraph or sentence that directly answers the insertion prompt using ONLY the facts provided in the Verified Professor Data.
    4. Match the academic tone, style, and flow of the user's original text perfectly.
    5. DO NOT hallucinate or invent any information. If the Verified Professor Data lacks the information to properly answer an insertion prompt, state this elegantly in the text (e.g., focusing on general departmental alignment instead).
    6. DO NOT alter, rewrite, or "improve" the user's original text outside of the insertion points. Keep the original text EXACTLY as it is.
    7. Output ONLY the final, complete proposal text. Do not include introductory remarks, markdown code blocks, or comments like "Here is the proposal:".

    --------------------------------------------------
    DRAFT PROPOSAL TEMPLATE:
    ${templateContent}

    --------------------------------------------------
    VERIFIED PROFESSOR DATA:
    ${professorContext}
    `;

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    return NextResponse.json({ success: true, generatedProposal: text.trim() });

  } catch (error: any) {
    console.error("DIAGNOSTIC: Generator Engine Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to generate proposal." }, { status: 500 });
  }
}