"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Professor {
  name: string;
  title: string;
  researchArea: string;
}

interface VerificationResult {
  verified: boolean;
  evidence: string;
  verifiedResearch: string;
  recentPublicationTopic: string;
}

function ExtractionWorkspace() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";
  
  const [url, setUrl] = useState(initialUrl);
  const [isExtracting, setIsExtracting] = useState(false);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [verifyingProf, setVerifyingProf] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<Record<string, VerificationResult>>({});
  const router = useRouter();

  const handleExtract = async () => {
    if (!url.trim()) return;
    setIsExtracting(true);
    setProfessors([]);
    setVerifications({});
    
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (result.success && result.data && result.data.professors) {
        if (result.data.professors.length === 0) {
          alert("Diagnostic: The engine successfully reached the page, but 0 professors were found. The university may be blocking access.");
        } else {
          setProfessors(result.data.professors);
        }
      } else {
        alert("Extraction failed: " + result.error);
      }
    } catch (error) {
      console.error("Extraction Error:", error);
      alert("A network error occurred while extracting.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleVerify = async (prof: Professor) => {
    setVerifyingProf(prof.name);
    
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prof, contextUrl: url }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setVerifications(prev => ({
          ...prev,
          [prof.name]: result.data
        }));
      } else {
        alert("Verification failed: " + result.error);
      }
    } catch (error) {
      console.error("Verification Error:", error);
      alert("A network error occurred while verifying.");
    } finally {
      setVerifyingProf(null);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <h1 className="text-3xl font-bold tracking-tight">Professor Extraction</h1>
          <button 
            onClick={() => router.push("/discovery")}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded-md font-semibold shadow-sm hover:bg-gray-400 transition-all"
          >
            Back to Discovery
          </button>
        </div>

        <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-300 space-y-4">
          <h2 className="text-xl font-bold">Department Link</h2>
          <p className="font-medium">Provide the web address of the academic department. The system will extract the listed professors for verification.</p>
          
          <div className="flex gap-4">
            <input 
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste department URL here..."
              className="flex-1 px-4 py-4 rounded-xl border border-gray-400 bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all font-medium text-lg"
            />
            <button 
              onClick={handleExtract}
              disabled={isExtracting}
              className="px-8 py-4 bg-gray-800 text-gray-100 rounded-xl font-bold shadow-md hover:bg-gray-700 hover:shadow-lg transition-all disabled:opacity-50 text-lg"
            >
              {isExtracting ? "Extracting..." : "Extract Professors"}
            </button>
          </div>
        </div>

        {professors.length > 0 && (
          <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-300 space-y-6">
            <h2 className="text-2xl font-bold">Extracted Professors</h2>
            
            <div className="grid gap-4">
              {professors.map((prof, index) => {
                const verification = verifications[prof.name];
                const isVerifyingThis = verifyingProf === prof.name;

                return (
                  <div key={index} className="flex flex-col p-6 bg-white/80 rounded-xl border border-gray-300 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-xl font-bold text-gray-900">{prof.name}</span>
                      <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm font-bold rounded-md border border-gray-400">
                        {prof.title}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 font-medium">
                      <span className="font-bold">Stated Area:</span> {prof.researchArea || "Not specified"}
                    </p>

                    {!verification && (
                      <button 
                        onClick={() => handleVerify(prof)}
                        disabled={isVerifyingThis}
                        className="px-4 py-2 self-start bg-gray-800 text-gray-100 font-semibold rounded-md shadow-sm hover:bg-gray-700 transition-all disabled:opacity-50"
                      >
                        {isVerifyingThis ? "Cross-referencing..." : "Verify Identity & Publications"}
                      </button>
                    )}

                    {verification && (
                      <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-800 font-bold">Verification Status:</span>
                          <span className="px-2 py-1 bg-gray-300 text-gray-900 text-xs font-bold rounded">
                            {verification.verified ? "CONFIRMED" : "UNVERIFIED"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800"><span className="font-bold">Evidence:</span> {verification.evidence}</p>
                        <p className="text-sm font-medium text-gray-800"><span className="font-bold">Verified Research:</span> {verification.verifiedResearch}</p>
                        <p className="text-sm font-medium text-gray-800"><span className="font-bold">Recent Publication/Topic:</span> {verification.recentPublicationTopic}</p>
                        
                        <button className="mt-2 w-full py-2 bg-gray-800 text-gray-100 rounded-md font-bold shadow-sm hover:bg-gray-700 transition-all">
                          Send to Proposal Fabricator
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function Extraction() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900 font-bold text-xl">
        Loading aesthetic workspace...
      </div>
    }>
      <ExtractionWorkspace />
    </Suspense>
  );
}