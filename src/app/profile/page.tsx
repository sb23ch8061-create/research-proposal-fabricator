"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResearcherIdentityVault() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    current_title: "",
    research_focus: "",
    methodologies: "",
    academic_background: ""
  });

  useEffect(() => {
    const fetchIdentity = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase.from('researcher_identity').select('*').eq('user_id', user.id).single();
      
      if (data) {
        setFormData({
          full_name: data.full_name || "",
          current_title: data.current_title || "",
          research_focus: data.research_focus || "",
          methodologies: data.methodologies || "",
          academic_background: data.academic_background || ""
        });
      }
      setIsLoading(false);
    };
    fetchIdentity();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase.from('researcher_identity').select('id').eq('user_id', user.id).single();

      if (existing) {
        const { error } = await supabase.from('researcher_identity')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('researcher_identity')
          .insert({ user_id: user.id, ...formData });
        if (error) throw error;
      }
      
      alert("Identity Vault Secured.");
    } catch (error: any) {
      alert("Failed to secure identity: " + error.message);
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="min-h-screen p-8 flex items-center justify-center text-xl font-bold aesthetic">Loading Identity Vault...</div>;

  return (
    <div className="min-h-screen p-8 flex flex-col font-sans aesthetic">
      <div className="max-w-6xl mx-auto w-full space-y-10 flex-1 flex flex-col">
        
        <div className="flex flex-col md:flex-row justify-between items-center p-10 rounded-2xl shadow-lg border border-gray-400/50 backdrop-blur-xl aesthetic gap-6">
          <div className="text-left w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight uppercase drop-shadow-sm">Researcher Identity Vault</h1>
            <p className="mt-3 text-lg font-bold opacity-80 uppercase tracking-widest">Establish Your Academic Parameters</p>
          </div>
          <button 
            onClick={() => router.push("/dashboard")} 
            className="px-8 py-4 rounded-xl font-bold shadow-md hover:shadow-xl transition-all duration-300 uppercase tracking-wider aesthetic w-full md:w-auto border border-gray-500/30"
          >
            Return to Command Center
          </button>
        </div>

        <div className="p-10 rounded-2xl shadow-md border border-gray-400/60 aesthetic flex-1 space-y-8 flex flex-col justify-start">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-extrabold uppercase tracking-wider mb-3 drop-shadow-sm">Full Name</label>
              <input 
                type="text" 
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-5 py-4 rounded-xl border border-gray-400/80 aesthetic font-bold focus:outline-none focus:ring-2 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-sm font-extrabold uppercase tracking-wider mb-3 drop-shadow-sm">Current Title / Affiliation</label>
              <input 
                type="text" 
                name="current_title"
                value={formData.current_title}
                onChange={handleChange}
                className="w-full px-5 py-4 rounded-xl border border-gray-400/80 aesthetic font-bold focus:outline-none focus:ring-2 shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-extrabold uppercase tracking-wider mb-3 drop-shadow-sm">Primary Research Focus</label>
            <textarea 
              name="research_focus"
              value={formData.research_focus}
              onChange={handleChange}
              className="w-full min-h-[120px] p-5 rounded-xl border border-gray-400/80 aesthetic focus:outline-none focus:ring-2 resize-none font-bold leading-relaxed shadow-inner"
            />
          </div>

          <div>
            <label className="block text-sm font-extrabold uppercase tracking-wider mb-3 drop-shadow-sm">Core Methodologies & Skills</label>
            <textarea 
              name="methodologies"
              value={formData.methodologies}
              onChange={handleChange}
              className="w-full min-h-[120px] p-5 rounded-xl border border-gray-400/80 aesthetic focus:outline-none focus:ring-2 resize-none font-bold leading-relaxed shadow-inner"
            />
          </div>

          <div>
            <label className="block text-sm font-extrabold uppercase tracking-wider mb-3 drop-shadow-sm">Academic Background & Trajectory</label>
            <textarea 
              name="academic_background"
              value={formData.academic_background}
              onChange={handleChange}
              className="w-full min-h-[160px] p-5 rounded-xl border border-gray-400/80 aesthetic focus:outline-none focus:ring-2 resize-none font-bold leading-relaxed shadow-inner"
            />
          </div>

          <div className="pt-6 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-10 py-5 rounded-xl font-extrabold shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 text-lg uppercase tracking-widest aesthetic border border-gray-500/30"
            >
              {isSaving ? "Securing Vault..." : "Secure Identity Parameters"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}