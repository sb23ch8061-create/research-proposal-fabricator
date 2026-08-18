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

  if (isLoading) return <div className="min-h-screen p-8 aesthetic flex items-center justify-center text-xl font-bold">Loading Identity Vault...</div>;

  return (
    <div className="min-h-screen p-8 aesthetic flex flex-col font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        <div className="flex justify-between items-center aesthetic p-6 rounded-2xl shadow-sm border">
          <h1 className="text-3xl font-bold tracking-tight">Researcher Identity Vault</h1>
          <button onClick={() => router.push("/dashboard")} className="px-6 py-2 aesthetic rounded-md font-semibold shadow-sm transition-all">
            Return to Dashboard
          </button>
        </div>

        <div className="aesthetic p-8 rounded-2xl shadow-sm border flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-extrabold uppercase tracking-wider mb-2">Full Name</label>
              <input 
                type="text" 
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border aesthetic font-medium focus:outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="block text-sm font-extrabold uppercase tracking-wider mb-2">Current Title / Affiliation</label>
              <input 
                type="text" 
                name="current_title"
                value={formData.current_title}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border aesthetic font-medium focus:outline-none focus:ring-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-extrabold uppercase tracking-wider mb-2">Primary Research Focus</label>
            <textarea 
              name="research_focus"
              value={formData.research_focus}
              onChange={handleChange}
              className="w-full min-h-[100px] p-4 rounded-xl border aesthetic focus:outline-none focus:ring-2 resize-none font-medium leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-sm font-extrabold uppercase tracking-wider mb-2">Core Methodologies & Skills</label>
            <textarea 
              name="methodologies"
              value={formData.methodologies}
              onChange={handleChange}
              className="w-full min-h-[100px] p-4 rounded-xl border aesthetic focus:outline-none focus:ring-2 resize-none font-medium leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-sm font-extrabold uppercase tracking-wider mb-2">Academic Background & Trajectory</label>
            <textarea 
              name="academic_background"
              value={formData.academic_background}
              onChange={handleChange}
              className="w-full min-h-[150px] p-4 rounded-xl border aesthetic focus:outline-none focus:ring-2 resize-none font-medium leading-relaxed"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-4 aesthetic rounded-xl font-bold shadow-md transition-all disabled:opacity-50 text-lg uppercase tracking-wide"
            >
              {isSaving ? "Securing Vault..." : "Secure Identity Parameters"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}