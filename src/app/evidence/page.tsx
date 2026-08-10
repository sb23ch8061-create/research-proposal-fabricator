"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface ExtractedProfessor {
  id: string;
  name: string;
  title: string;
  department_url: string;
}

interface EvidenceData {
  value: string;
  status: string;
  sources: string[];
}

interface VerifiedProfile {
  email_data: EvidenceData;
  identity_data: EvidenceData;
  lab_data: EvidenceData;
  research_data: EvidenceData;
  recruitment_data: EvidenceData;
}

function EvidenceWorkspace() {
  const [professors, setProfessors] = useState<ExtractedProfessor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [researchingId, setResearchingId] = useState<string | null>(null);
  const [verifiedResults, setVerifiedResults] = useState<Record<string, VerifiedProfile>>({});
  const router = useRouter();

  useEffect(() => {
    const fetchVaultTargets = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from('extracted_professors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching from vault:", error);
        alert("Could not load your saved targets.");
      } else if (data) {
        setProfessors(data);
      }
      setIsLoading(false);
    };

    fetchVaultTargets();
  }, [router]);

  const handleResearch = async (prof: ExtractedProfessor) => {
    setResearchingId(prof.id);

    try {
      // 1. Call the Exhaustive Research Engine
      const response = await fetch("/api/exhaustive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prof.name,
          title: prof.title,
          department_url: prof.department_url
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const profileData = result.data;
        
        // 2. Save the structured evidence to the secure vault
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('verified_profiles').insert([{
            user_id: user.id,
            professor_name: prof.name,
            university_name: "Extracted from Anchor URL",
            department_name: prof.title,
            email_data: profileData.email_data,
            identity_data: profileData.identity_data,
            lab_data: profileData.lab_data,
            research_data: profileData.research_data,
            recruitment_data: profileData.recruitment_data
          }]);
        }

        // 3. Update the UI to display the evidence
        setVerifiedResults(prev => ({
          ...prev,
          [prof.id]: profileData
        }));

      } else {
        alert("Research failed: " + result.error);
      }
    } catch (error) {
      console.error("Research Error:", error);
      alert("A network error occurred while performing research.");
    } finally {
      setResearchingId(null);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    let color = "bg-gray-300 text-gray-800";
    if (status === "VERIFIED") color = "bg-gray-900 text-white";
    if (status === "PARTIALLY VERIFIED") color = "bg-yellow-200 text-yellow-900";
    if (status === "CONFLICTING") color = "bg-red-200 text-red-900";
    
    return (
      <span className={`px-2 py-1 text-xs font-bold rounded-md shadow-sm border border-gray-400 ${color}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <h1 className="text-3xl font-bold tracking-tight">Evidence & Verification Dashboard</h1>
          <button 
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded-md font-semibold shadow-sm hover:bg-gray-400 transition-all"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-300 space-y-4">
          <h2 className="text-xl font-bold">Locked Targets Pending Research</h2>
          <p className="font-medium">Click initiate to deploy the AI agent. It will extract and strictly categorize the data, saving the exact source URLs as evidence.</p>
          
          {isLoading ? (
            <p className="font-bold">Accessing secure vault...</p>
          ) : professors.length > 0 ? (
            <div className="space-y-4">
              {professors.map((prof) => {
                const isResearching = researchingId === prof.id;
                const result = verifiedResults[prof.id];

                return (
                  <div key={prof.id} className="bg-white/80 border border-gray-300 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-gray-900 block">{prof.name}</span>
                        <span className="text-sm font-semibold text-gray-600 block">{prof.title}</span>
                      </div>
                      
                      {!result && (
                        <button 
                          onClick={() => handleResearch(prof)}
                          disabled={isResearching}
                          className="px-6 py-3 bg-gray-800 text-gray-100 rounded-xl font-bold shadow-md hover:bg-gray-700 transition-all disabled:opacity-50"
                        >
                          {isResearching ? "Running Multi-Source Verification..." : "Initiate Exhaustive AI Research"}
                        </button>
                      )}
                    </div>

                    {result && (
                      <div className="mt-6 space-y-4 border-t border-gray-300 pt-4">
                        <h3 className="text-lg font-bold">Verified Evidence Profile</h3>
                        
                        <div className="grid gap-4">
                          {[
                            { label: "Institutional Email", data: result.email_data },
                            { label: "Identity & Affiliation", data: result.identity_data },
                            { label: "Lab / Group Ownership", data: result.lab_data },
                            { label: "Verified Research Area", data: result.research_data },
                            { label: "Recruitment & Openings", data: result.recruitment_data }
                          ].map((field, idx) => (
                            <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-gray-800">{field.label}</span>
                                <StatusBadge status={field.data.status} />
                              </div>
                              <p className="text-gray-900 font-medium mb-3">{field.data.value}</p>
                              
                              {field.data.sources && field.data.sources.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Evidence Sources:</span>
                                  {field.data.sources.map((src, sIdx) => (
                                    <a key={sIdx} href={src} target="_blank" rel="noreferrer" className="block text-sm text-blue-700 hover:underline truncate max-w-2xl">
                                      {src}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-white/80 rounded-xl border border-gray-300">
              <p className="text-lg font-bold text-gray-700">No targets found in your vault.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function Evidence() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900 font-bold text-xl">
        Loading aesthetic workspace...
      </div>
    }>
      <EvidenceWorkspace />
    </Suspense>
  );
}