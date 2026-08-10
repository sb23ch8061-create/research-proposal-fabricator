"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Department {
  name: string;
  url: string;
}

export default function Discovery() {
  const [university, setUniversity] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [domain, setDomain] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const router = useRouter();

  const handleSearch = async () => {
    if (!university.trim()) return;
    setIsSearching(true);
    setDomain(null);
    setDepartments([]);
    
    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ university }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setDomain(result.data.domain);
        setDepartments(result.data.departments || []);
      } else {
        alert("Discovery failed: " + result.error);
      }
    } catch (error) {
      console.error("Search Error:", error);
      alert("A network error occurred while searching.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <h1 className="text-3xl font-bold tracking-tight">University Discovery</h1>
          <button 
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded-md font-semibold shadow-sm hover:bg-gray-400 transition-all"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-300 space-y-4">
          <h2 className="text-xl font-bold">Target Institution</h2>
          <p className="font-medium">Enter the name or web address of the university you wish to research. The system will locate the official domain and available academic departments.</p>
          
          <div className="flex gap-4">
            <input 
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="e.g., Massachusetts Institute of Technology..."
              className="flex-1 px-4 py-4 rounded-xl border border-gray-400 bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all font-medium text-lg"
            />
            <button 
              onClick={handleSearch}
              disabled={isSearching}
              className="px-8 py-4 bg-gray-800 text-gray-100 rounded-xl font-bold shadow-md hover:bg-gray-700 hover:shadow-lg transition-all disabled:opacity-50 text-lg"
            >
              {isSearching ? "Locating..." : "Discover Departments"}
            </button>
          </div>
        </div>

        {domain && (
          <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-300 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Discovered Departments</h2>
              <a href={domain} target="_blank" rel="noreferrer" className="px-4 py-2 bg-gray-200 text-gray-800 font-bold rounded-md border border-gray-400 hover:bg-gray-300 transition-all">
                Visit Official Domain
              </a>
            </div>
            
            <div className="grid gap-4">
              {departments.length > 0 ? (
                departments.map((dept, index) => (
                  <div key={index} className="flex justify-between items-center p-6 bg-white/80 rounded-xl border border-gray-300 shadow-sm">
                    <span className="text-lg font-bold text-gray-900">{dept.name}</span>
                    <div className="flex gap-2">
                      <a href={dept.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-md border border-gray-300 hover:bg-gray-300 transition-all">
                        View Page
                      </a>
                      <button className="px-4 py-2 bg-gray-800 text-gray-100 font-semibold rounded-md shadow-sm hover:bg-gray-700 transition-all">
                        Extract Professors
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-lg font-medium text-gray-600">No major departments found for this institution.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}