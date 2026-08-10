"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface InsertionPoint {
  id: number;
  original: string;
  question?: string;
  source?: string;
  type?: string;
  answer?: string;
}

export default function Fabricator() {
  const [draft, setDraft] = useState("");
  const [insertions, setInsertions] = useState<InsertionPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [finalProposal, setFinalProposal] = useState("");
  
  const [templateTitle, setTemplateTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    const initializeWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const urlParams = new URLSearchParams(window.location.search);
      const templateId = urlParams.get("id");

      if (templateId) {
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .eq('id', templateId)
          .single();
          
        if (data && !error) {
          setDraft(data.draft_content);
          setInsertions(data.insertions);
          setTemplateTitle(data.title);
        }
      }
      setIsLoading(false);
    };
    
    initializeWorkspace();
  }, [router]);

  const handleAnalyze = async () => {
    if (!draft.trim()) return;
    setIsAnalyzing(true);
    setFinalProposal(""); 

    const regex = /\[.*?\]|\{.*?\}|\<.*?\>|\{\{.*?\}\}/g;
    const matches = draft.match(regex);

    if (!matches) {
      setInsertions([]);
      setIsAnalyzing(false);
      alert("No insertion markers found. Please use brackets like [Professor Name].");
      return;
    }

    const basicInsertions = matches.map((match, index) => ({
      id: index + 1,
      original: match
    }));

    setInsertions(basicInsertions);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, insertions: basicInsertions }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const enrichedInsertions = basicInsertions.map(basic => {
          const aiData = result.data.find((item: any) => item.id === basic.id);
          return { ...basic, ...aiData, answer: "" };
        });
        setInsertions(enrichedInsertions);
      } else {
        alert("AI Analysis failed: " + result.error);
      }
    } catch (error) {
      console.error("Error calling AI API:", error);
      alert("A network error occurred while contacting the AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnswerChange = (id: number, value: string) => {
    setInsertions(insertions.map(inst => 
      inst.id === id ? { ...inst, answer: value } : inst
    ));
  };

  const handleGenerate = () => {
    let result = draft;
    insertions.forEach(inst => {
      if (inst.answer && inst.answer.trim() !== "") {
        result = result.replace(inst.original, inst.answer);
      }
    });
    setFinalProposal(result);
  };

  const handleSaveTemplate = async () => {
    if (!templateTitle.trim()) {
      alert("Please enter a title for your template before saving.");
      return;
    }
    if (!user) return;

    setIsSaving(true);
    const { error } = await supabase.from('templates').insert([
      {
        user_id: user.id,
        title: templateTitle,
        draft_content: draft,
        insertions: insertions
      }
    ]);

    setIsSaving(false);

    if (error) {
      alert("Failed to save template: " + error.message);
    } else {
      alert("Template securely saved to your workspace!");
      router.push("/dashboard");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900 flex justify-center items-center">
        <h1 className="text-2xl font-bold tracking-tight">Restoring Workspace...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <h1 className="text-3xl font-bold tracking-tight">Research Proposal Fabricator</h1>
          <button 
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded-md font-semibold shadow-sm hover:bg-gray-400 transition-all"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-300 space-y-4">
          <h2 className="text-xl font-bold">Proposal Draft</h2>
          <p className="font-medium">Paste your proposal template below. Use markers like [Professor Name] where you want the system to insert verified information.</p>
          
          <textarea 
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full h-64 p-6 rounded-xl border border-gray-400 bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all resize-none text-lg font-medium leading-relaxed"
            placeholder="Dear [Professor Last Name], I am writing to express my interest in your research on [Research Area]..."
          />

          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full py-4 bg-gray-800 text-gray-100 rounded-xl font-bold text-lg shadow-md hover:bg-gray-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? "Analyzing Context with AI..." : "Analyze Draft & Detect Insertions"}
          </button>
        </div>

        {insertions.length > 0 && (
          <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-300 space-y-6">
            <h2 className="text-2xl font-bold">Save Template to Workspace</h2>
            <div className="flex gap-4">
              <input 
                type="text"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                placeholder="Name your template (e.g., Standard Science Proposal)"
                className="flex-1 px-4 py-3 rounded-md border border-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all font-medium"
              />
              <button 
                onClick={handleSaveTemplate}
                disabled={isSaving}
                className="px-8 py-3 bg-gray-800 text-gray-100 rounded-md font-bold shadow-md hover:bg-gray-700 hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Template"}
              </button>
            </div>
            
            <hr className="border-gray-300" />

            <h2 className="text-2xl font-bold">Review & Fulfill Insertion Points</h2>
            <div className="grid gap-6">
              {insertions.map((insert) => (
                <div key={insert.id} className="bg-white/80 p-6 rounded-xl border border-gray-300 shadow-sm flex flex-col gap-4">
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-500 tracking-wider">
                        INSERT {insert.id.toString().padStart(2, '0')}
                      </p>
                      <p className="text-xl font-bold mt-1">{insert.original}</p>
                    </div>
                    <span className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-md border border-gray-300">
                      {insert.type ? insert.type : "Pending AI Context Analysis"}
                    </span>
                  </div>
                  
                  {insert.question && (
                    <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                      <p className="text-sm font-bold text-gray-800 mb-1">Required Information (AI Extracted):</p>
                      <p className="text-gray-900 font-medium">{insert.question}</p>
                      <p className="text-sm font-semibold text-gray-600 mt-2">
                        Suggested Source: <span className="text-gray-900 font-bold">{insert.source}</span>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Verified Data Entry</label>
                    <input 
                      type="text"
                      value={insert.answer || ""}
                      onChange={(e) => handleAnswerChange(insert.id, e.target.value)}
                      placeholder={`Enter verified data for ${insert.original}...`}
                      className="w-full px-4 py-3 rounded-md border border-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all font-medium"
                    />
                  </div>

                </div>
              ))}
            </div>
            
            <button 
              onClick={handleGenerate}
              className="w-full py-4 bg-gray-800 text-gray-100 rounded-xl font-bold text-lg shadow-md hover:bg-gray-700 hover:shadow-lg transition-all mt-4"
            >
              Construct Final Proposal
            </button>
          </div>
        )}

        {finalProposal && (
          <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-300 space-y-4">
            <h2 className="text-2xl font-bold">Finalized Proposal</h2>
            <p className="font-medium">Your verified research application is ready.</p>
            <div className="w-full p-6 rounded-xl border border-gray-400 bg-white/80 text-lg font-medium leading-relaxed whitespace-pre-wrap">
              {finalProposal}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}