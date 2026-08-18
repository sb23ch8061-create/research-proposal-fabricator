"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function UnifiedDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      const { data: identity } = await supabase.from('researcher_identity').select('full_name').eq('user_id', user.id).single();
      setUserName(identity?.full_name || user.email || "Researcher");
      
      setIsLoading(false);
    };
    fetchUser();
  }, [router]);

  if (isLoading) return <div className="min-h-screen p-8 flex items-center justify-center text-xl font-bold aesthetic">Loading Command Center...</div>;

  return (
    <div className="min-h-screen p-8 flex flex-col font-sans aesthetic">
      <div className="max-w-6xl mx-auto w-full space-y-10 flex-1 flex flex-col">
        
        <div className="flex flex-col md:flex-row justify-between items-center p-10 rounded-2xl shadow-lg border border-gray-400/50 backdrop-blur-xl aesthetic gap-6">
          <div className="text-left w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight uppercase drop-shadow-sm">Command Center</h1>
            <p className="mt-3 text-lg font-bold opacity-80 uppercase tracking-widest">Welcome back, {userName}</p>
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
            className="px-8 py-4 rounded-xl font-bold shadow-md hover:shadow-xl transition-all duration-300 uppercase tracking-wider aesthetic w-full md:w-auto border border-gray-500/30"
          >
            Secure Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
          
          <button onClick={() => router.push("/profile")} className="group relative p-10 rounded-2xl shadow-md border border-gray-400/60 text-left hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-start aesthetic overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-500 group-hover:bg-blue-600 transition-colors duration-300"></div>
            <h2 className="text-2xl font-extrabold tracking-wide mb-4 uppercase drop-shadow-sm">1. Identity Vault</h2>
            <p className="text-base font-bold opacity-80 leading-relaxed">Establish and secure your academic background, core methodologies, and research focus.</p>
          </button>

          <button onClick={() => router.push("/templates")} className="group relative p-10 rounded-2xl shadow-md border border-gray-400/60 text-left hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-start aesthetic overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-500 group-hover:bg-blue-600 transition-colors duration-300"></div>
            <h2 className="text-2xl font-extrabold tracking-wide mb-4 uppercase drop-shadow-sm">2. Template Builder</h2>
            <p className="text-base font-bold opacity-80 leading-relaxed">Design and manage your reusable proposal frameworks with strategic insertion points.</p>
          </button>

          <button onClick={() => router.push("/workspace")} className="group relative p-10 rounded-2xl shadow-md border border-gray-400/60 text-left hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-start aesthetic overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-500 group-hover:bg-blue-600 transition-colors duration-300"></div>
            <h2 className="text-2xl font-extrabold tracking-wide mb-4 uppercase drop-shadow-sm">3. Target Workspace</h2>
            <p className="text-base font-bold opacity-80 leading-relaxed">Extract, verify, and store immutable evidence data for your prospective target professors.</p>
          </button>

          <button onClick={() => router.push("/generator")} className="group relative p-10 rounded-2xl shadow-md border border-gray-400/60 text-left hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-start aesthetic overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-500 group-hover:bg-blue-600 transition-colors duration-300"></div>
            <h2 className="text-2xl font-extrabold tracking-wide mb-4 uppercase drop-shadow-sm">4. Fabrication Engine</h2>
            <p className="text-base font-bold opacity-80 leading-relaxed">Fuse your identity, verified evidence, and templates into a highly tailored, final document.</p>
          </button>

        </div>
      </div>
    </div>
  );
}