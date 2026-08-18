"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResearcherIdentityVault() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState = {
    full_name: "", current_title: "", research_focus: "", methodologies: "", academic_background: "",
    technical_skills: "", research_experience: "", publications: "", projects: "", internships: "",
    academic_achievements: "", career_interests: "", target_degree: "", target_countries: "", other_info: ""
  };

  const [formData, setFormData] = useState(initialFormState);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchIdentity = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data } = await supabase.from('researcher_identity').select('*').eq('user_id', user.id).single();
      if (data) {
        setFormData(prev => ({ ...prev, ...data }));
      }
      setIsLoading(false);
    };
    fetchIdentity();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setCvPreviewUrl(objectUrl);

    setIsExtracting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('cv_file', file);

      const response = await fetch('/api/parse-cv', { method: 'POST', body: formDataToSend });
      const result = await response.json();

      if (!result.success) throw new Error(result.error);
      
      setExtractedData(result.extractedData);
    } catch (error: any) {
      alert("CV Extraction failed: " + error.message);
    }
    setIsExtracting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applyExtractedField = (key: string) => {
    setFormData(prev => ({ ...prev, [key]: extractedData[key] }));
  };

  const applyAllExtracted = () => {
    const updated = { ...formData };
    Object.keys(extractedData).forEach(key => {
      if (extractedData[key]) updated[key as keyof typeof initialFormState] = extractedData[key];
    });
    setFormData(updated);
    setExtractedData(null);
    setCvPreviewUrl(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase.from('researcher_identity').select('id').eq('user_id', user.id).single();

      if (existing) {
        const { error } = await supabase.from('researcher_identity').update({ ...formData, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('researcher_identity').insert({ user_id: user.id, ...formData });
        if (error) throw error;
      }
      alert("Identity Vault Secured.");
      setExtractedData(null);
      setCvPreviewUrl(null);
    } catch (error: any) {
      alert("Failed to secure identity: " + error.message);
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-8 font-bold aesthetic">Loading Identity Vault...</div>;

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-6 font-sans aesthetic">
      <div className="flex justify-between items-center border-b pb-4 border-gray-400">
        <h1 className="text-3xl font-extrabold uppercase">Researcher Identity Vault</h1>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-wider">Back to Command Center</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="space-y-6">
          <div className="p-6 border rounded-xl bg-gray-100 shadow-inner">
            <h2 className="font-extrabold mb-2 uppercase tracking-wide">CV Extraction Assistant</h2>
            <p className="text-sm text-gray-700 mb-4 font-bold">Upload your CV (PDF) to extract multiple numbered entries. Data will not be overwritten without review.</p>
            <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isExtracting} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50">
              {isExtracting ? "Extracting CV..." : "Upload CV"}
            </button>
          </div>

          {cvPreviewUrl && (
            <div className="border rounded-xl bg-gray-100 h-[600px] overflow-hidden shadow-inner">
              <iframe src={cvPreviewUrl} className="w-full h-full" title="Document Preview" />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {extractedData && (
            <div className="p-6 border bg-gray-100 rounded-xl shadow-inner">
              <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-2">
                <h2 className="font-extrabold uppercase tracking-wide">Review Extracted Data</h2>
                <div className="flex gap-2">
                   <button onClick={applyAllExtracted} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider">Accept All</button>
                   <button onClick={() => {setExtractedData(null); setCvPreviewUrl(null);}} className="bg-gray-300 text-gray-900 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider">Discard</button>
                </div>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {Object.keys(extractedData).map(key => {
                  if (!extractedData[key]) return null;
                  const hasConflict = formData[key as keyof typeof formData] && formData[key as keyof typeof formData] !== extractedData[key];
                  return (
                    <div key={key} className="bg-white p-4 border border-gray-300 rounded-lg text-sm flex justify-between items-start gap-4">
                      <div className="flex-1 whitespace-pre-wrap">
                        <span className="font-extrabold uppercase block text-xs text-gray-500 tracking-wider mb-1">{key.replace(/_/g, ' ')}</span>
                        {hasConflict && <div className="text-gray-600 text-xs mb-2 font-bold line-through">Current: {formData[key as keyof typeof formData]}</div>}
                        <div className="text-gray-900 font-bold leading-relaxed">{extractedData[key]}</div>
                      </div>
                      <button onClick={() => applyExtractedField(key)} className="bg-gray-200 px-4 py-2 rounded-lg border border-gray-400 hover:bg-gray-300 font-bold uppercase tracking-wider text-xs">Apply</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-xl shadow-inner bg-white">
            {Object.keys(initialFormState).map((key) => (
              <div key={key} className={['research_focus', 'methodologies', 'academic_background', 'technical_skills', 'research_experience', 'publications', 'projects', 'internships', 'academic_achievements', 'career_interests', 'other_info'].includes(key) ? "col-span-1 md:col-span-2" : ""}>
                <label className="block text-xs font-extrabold uppercase tracking-wider mb-2 text-gray-800">{key.replace(/_/g, ' ')}</label>
                {['full_name', 'current_title', 'target_degree', 'target_countries'].includes(key) ? (
                  <input type="text" name={key} value={formData[key as keyof typeof formData]} onChange={handleChange} className="w-full border border-gray-400 p-3 rounded-xl bg-gray-50 font-bold focus:outline-none focus:ring-2 focus:ring-gray-900" />
                ) : (
                  <textarea name={key} value={formData[key as keyof typeof formData]} onChange={handleChange} className="w-full min-h-[120px] border border-gray-400 p-4 rounded-xl bg-gray-50 resize-none font-bold leading-relaxed focus:outline-none focus:ring-2 focus:ring-gray-900" />
                )}
              </div>
            ))}
          </div>
          
          <div className="flex justify-end pt-4">
            <button onClick={handleSave} disabled={isSaving} className="bg-gray-900 text-white px-10 py-4 rounded-xl font-extrabold uppercase tracking-widest disabled:opacity-50 shadow-md">
              {isSaving ? "Saving..." : "Save Identity Vault"}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}