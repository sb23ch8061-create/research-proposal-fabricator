import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { name, title, department_url } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    // Preserving the exact model string that successfully bypassed your API tier restrictions
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are a strict, exhaustive academic verification engine.
    Target Professor: ${name}
    Title: ${title}
    Anchor Institution URL: ${department_url}

    Your task is to comprehensively research this professor and return ONLY a strictly formatted JSON object covering EXACTLY 32 data points. 
    You must NOT fabricate information. You must disambiguate this professor from others with similar names using the Anchor Institution URL.

    For EVERY one of the 32 fields below, you must output a JSON object containing:
    1. "value": The extracted information (or "Not Found").
    2. "status": Must be EXACTLY one of: "VERIFIED", "PARTIALLY VERIFIED", "CONFLICTING", or "NOT FOUND".
    3. "sources": An array of URL strings used as evidence.
    4. "conflict_notes": Any notes on ambiguity or conflicting sources (or null).

    Status Logic Rules:
    - VERIFIED: Confirmed by official institutional sources (.edu, official department/lab pages).
    - PARTIALLY VERIFIED: Found on weaker sources or inferred heavily.
    - CONFLICTING: Different sources provide contradictory information (e.g., two different emails).
    - NOT FOUND: No reliable information exists. Do NOT guess emails.

    The 32 EXACT keys you must return in the root JSON object:
    1. full_name
    2. academic_title
    3. university
    4. school_faculty
    5. department
    6. official_profile
    7. institutional_email
    8. alt_institutional_email
    9. lab_website
    10. lab_ownership_verification
    11. research_areas
    12. specific_research_topics
    13. current_research_directions
    14. research_methods
    15. materials_systems_studied
    16. recent_publications
    17. relevant_recent_publications
    18. google_scholar
    19. orcid
    20. current_projects
    21. funding_grants
    22. collaborators
    23. phd_openings
    24. postdoc_openings
    25. ra_openings
    26. internship_openings
    27. ug_opportunities
    28. explicit_recruitment
    29. lab_recruitment_info
    30. univ_recruitment_info
    31. job_board_info
    32. other_useful_info

    Output EXACTLY this JSON structure and nothing else (no markdown, no backticks). Example format:
    {
      "full_name": { "value": "John Doe", "status": "VERIFIED", "sources": ["https://..."], "conflict_notes": null },
      "institutional_email": { "value": "Not Found", "status": "NOT FOUND", "sources": [], "conflict_notes": "No email explicitly listed on department page." }
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