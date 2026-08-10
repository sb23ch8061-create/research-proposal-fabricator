"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface Professor {
  name: string;
  title: string;
  researchArea: string;
}

function ExtractionWorkspace() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";
  
  const [url, setUrl] = useState(initialUrl);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [professors, setProfessors] = useState<Professor[]>([]);
  
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleExtract = async () => {
    if (!url.trim()) return;
    setIsExtracting(true);
    setProfessors([]);
    setSelectedNames(new Set());
    
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
          const allNames = result.data.professors.map((p: Professor) => p.name);
          setSelectedNames(new Set(allNames));
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

  const toggleSelection = (name: string) => {
    const newSelected = new Set(selectedNames);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedNames(newSelected);
  };

  const handleLockSelection = async () => {
    if (selectedNames.size === 0) {
      alert("Please select at least one professor to proceed.");
      return;
    }

    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Authentication error: Please log in again.");
        router.push("/login");
        return;
      }

      const selectedProfessorsData = professors
        .filter(prof => selectedNames.has(prof.name))
        .map(prof => ({
          user_id: user.id,
          department_url: url,
          name: prof.name,
          title: prof.title,
          initial_url: url // Storing the department URL as the initial anchor
        }));

      const { error } = await supabase
        .from('extracted_professors')
        .insert(selectedProfessorsData);

      if (error) {
        console.error("Supabase Error:", error);
        alert("Failed to save selection to your vault: " + error.message);
      } else {
        alert(`Successfully saved ${selectedNames.size} professors to your secure vault!`);
        // We will navigate to the new exhaustive research dashboard once we build it
        router.push("/dashboard"); 
      }
    } catch (error) {
      console.error("Save Error:", error);
      alert("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
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
          <h2 className="text-xl font-bold">1. Initial Faculty Extraction</h2>
          <p className="font-medium">Provide the web address of the academic department. The system will cheaply extract the basic list of faculty for your review.</p>
          
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
              disabled={isExtracting || isSaving}
              className="px-8 py-4 bg-gray-800 text-gray-100 rounded-xl font-bold shadow-md hover:bg-gray-700 hover:shadow-lg transition-all disabled:opacity-50 text-lg"
            >
              {isExtracting ? "Extracting..." : "Extract Faculty List"}
            </button>
          </div>
        </div>

        {professors.length > 0 && (
          <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-300 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">2. Target Selection</h2>
              <span className="px-4 py-2 bg-gray-800 text-white font-bold rounded-md shadow-sm">
                {selectedNames.size} Selected
              </span>
            </div>
            <p className="font-medium text-gray-700">Review the extracted list and explicitly select the professors you wish to investigate. Unselected professors will be ignored to preserve your API resources.</p>
            
            <div className="bg-white/80 border border-gray-300 rounded-xl shadow-sm overflow-hidden">
              {professors.map((prof, index) => {
                const isSelected = selectedNames.has(prof.name);
                return (
                  <div 
                    key={index} 
                    onClick={() => toggleSelection(prof.name)}
                    className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer transition-all hover:bg-gray-100 ${isSelected ? 'bg-gray-100/50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-gray-800 border-gray-800' : 'border-gray-400'}`}>
                        {isSelected && <span className="text-white text-sm font-bold">✓</span>}
                      </div>
                      <div>
                        <span className="text-lg font-bold text-gray-900 block">{prof.name}</span>
                        <span className="text-sm font-semibold text-gray-600">{prof.title}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 font-medium text-sm text-right max-w-xs truncate">
                      {prof.researchArea || "No initial area specified"}
                    </p>
                  </div>
                );
              })}
            </div>
            
            <button 
              onClick={handleLockSelection}
              disabled={isSaving}
              className="w-full py-4 bg-gray-800 text-gray-100 rounded-xl font-bold text-lg shadow-md hover:bg-gray-700 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSaving ? "Saving to Vault..." : "Lock Selection & Save to Vault"}
            </button>
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