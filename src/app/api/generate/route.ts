import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { templateContent, professorContext, professorName, researcherContext } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are an expert academic proposal writer.
    Your task is to finalize a research proposal directed to Professor ${professorName}.

    Below is the user's Draft Proposal Template. It contains specific insertion points enclosed in brackets (e.g., [INSERTION: ...]).
    Below the template is the Verified Professor Data containing strict, extracted facts about the professor.
    Below that is the Researcher Identity Data containing the background and expertise of the person writing the proposal.

    YOUR INSTRUCTIONS:
    1. Read the Draft Proposal Template.
    2. Read the Verified Professor Data.
    3. Read the Researcher Identity Data.
    4. Rewrite the proposal, replacing EVERY insertion point with a well-crafted, academic paragraph or sentence that directly answers the insertion prompt.
    5. CRITICAL: When answering the insertions, explicitly connect the Researcher's Methodologies and Research Focus to the Professor's Verified Data to create a highly persuasive, tailored narrative.
    6. Match the academic tone, style, and flow of the user's original text perfectly.
    7. DO NOT hallucinate or invent any information. Use ONLY the facts provided in the Verified Professor Data and Researcher Identity Data.
    8. DO NOT alter, rewrite, or "improve" the user's original text outside of the insertion points. Keep the original text EXACTLY as it is.
    9. Output ONLY the final, complete proposal text. Do not include introductory remarks or markdown formatting.

    --------------------------------------------------
    DRAFT PROPOSAL TEMPLATE:
    ${templateContent}

    --------------------------------------------------
    VERIFIED PROFESSOR DATA:
    ${professorContext}

    --------------------------------------------------
    RESEARCHER IDENTITY DATA:
    ${researcherContext}
    `;

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    return NextResponse.json({ success: true, generatedProposal: text.trim() });

  } catch (error: any) {
    console.error("DIAGNOSTIC: Generator Engine Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to generate proposal." }, { status: 500 });
  }
}