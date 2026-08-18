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

  if (isLoading) return <div className="min-h-screen p-8 aesthetic flex items-center justify-center text-xl font-bold">Loading Command Center...</div>;

  return (
    <div className="min-h-screen p-8 aesthetic flex flex-col font-sans">
      <div className="max-w-6xl mx-auto w-full space-y-8 flex-1 flex flex-col">
        
        <div className="flex justify-between items-center aesthetic p-8 rounded-2xl shadow-sm border">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Command Center</h1>
            <p className="mt-2 text-lg font-medium opacity-80">Welcome back, {userName}</p>
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
            className="px-6 py-3 aesthetic rounded-md font-semibold shadow-sm transition-all"
          >
            Secure Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
          
          <button onClick={() => router.push("/profile")} className="aesthetic p-10 rounded-3xl shadow-sm border text-left hover:scale-[1.02] transition-transform duration-300 flex flex-col justify-center">
            <h2 className="text-2xl font-extrabold tracking-wide mb-3 uppercase">1. Identity Vault</h2>
            <p className="text-lg font-medium opacity-80 leading-relaxed">Establish and secure your academic background, core methodologies, and research focus.</p>
          </button>

          <button onClick={() => router.push("/templates")} className="aesthetic p-10 rounded-3xl shadow-sm border text-left hover:scale-[1.02] transition-transform duration-300 flex flex-col justify-center">
            <h2 className="text-2xl font-extrabold tracking-wide mb-3 uppercase">2. Template Builder</h2>
            <p className="text-lg font-medium opacity-80 leading-relaxed">Design and manage your reusable proposal frameworks with strategic insertion points.</p>
          </button>

          <button onClick={() => router.push("/workspace")} className="aesthetic p-10 rounded-3xl shadow-sm border text-left hover:scale-[1.02] transition-transform duration-300 flex flex-col justify-center">
            <h2 className="text-2xl font-extrabold tracking-wide mb-3 uppercase">3. Target Workspace</h2>
            <p className="text-lg font-medium opacity-80 leading-relaxed">Extract, verify, and store immutable evidence data for your prospective target professors.</p>
          </button>

          <button onClick={() => router.push("/generator")} className="aesthetic p-10 rounded-3xl shadow-sm border text-left hover:scale-[1.02] transition-transform duration-300 flex flex-col justify-center">
            <h2 className="text-2xl font-extrabold tracking-wide mb-3 uppercase">4. Fabrication Engine</h2>
            <p className="text-lg font-medium opacity-80 leading-relaxed">Fuse your identity, verified evidence, and templates into a highly tailored, final academic document.</p>
          </button>

        </div>
      </div>
    </div>
  );
}