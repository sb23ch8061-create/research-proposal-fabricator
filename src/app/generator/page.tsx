"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function GeneratorWorkspace() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // UPDATED: Correct table and column names
      const { data: templateData } = await supabase.from('templates').select('id, title, draft_content').eq('user_id', user.id);
      if (templateData) setTemplates(templateData);

      const { data: folderData } = await supabase.from('research_folders').select('id, name').eq('user_id', user.id).is('parent_id', null);
      if (folderData) setFolders(folderData);

      setIsLoading(false);
    };
    fetchInitialData();
  }, [router]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!selectedFolderId) {
        setProfiles([]);
        return;
      }
      const { data } = await supabase.from('verified_profiles').select('id, professor_name, department_name').eq('folder_id', selectedFolderId);
      if (data) setProfiles(data);
    };
    fetchProfiles();
  }, [selectedFolderId]);

  const handleFabricate = async () => {
    if (!selectedTemplateId || !selectedProfileId) {
      alert("Please select both a template and a professor.");
      return;
    }

    setIsGenerating(true);
    try {
      const template = templates.find(t => t.id === selectedTemplateId);
      const profile = profiles.find(p => p.id === selectedProfileId);

      const { data: evidence } = await supabase.from('professor_evidence').select('*').eq('profile_id', profile.id);
      
      const { data: manualEdits } = await supabase.from('professor_manual_edits').select('*').eq('profile_id', profile.id);

      let contextPayload = `Target Professor: ${profile.professor_name}\nDepartment: ${profile.department_name}\n\n`;
      
      evidence?.forEach(ev => {
        const override = manualEdits?.find(m => m.target_key === ev.field_name);
        const finalValue = override && override.manual_value ? override.manual_value : ev.field_value;
        contextPayload += `--- [${ev.field_name.toUpperCase()}] ---\n${finalValue}\n\n`;
      });

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateContent: template.draft_content, // UPDATED: Correct column name
          professorContext: contextPayload,
          professorName: profile.professor_name
        }),
      });

      const result = await response.json();
      if (result.success) {
        setGeneratedContent(result.generatedProposal);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      alert("Generation failed: " + error.message);
    }
    setIsGenerating(false);
  };

  const handleSaveProposal = async () => {
    if (!generatedContent.trim()) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profile = profiles.find(p => p.id === selectedProfileId);
      const template = templates.find(t => t.id === selectedTemplateId);

      const { error } = await supabase.from('generated_proposals').insert({
        user_id: user.id,
        profile_id: profile.id,
        professor_name: profile.professor_name,
        target_university: profile.department_name, 
        proposal_title: `Generated from: ${template.title}`, // UPDATED: Correct column name
        final_content: generatedContent
      });

      if (error) throw error;
      alert("Proposal successfully saved to your database!");
    } catch (error: any) {
      alert("Failed to save: " + error.message);
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="min-h-screen p-8 bg-gray-200 font-bold text-gray-900 flex items-center justify-center text-xl">Loading Generator...</div>;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900 flex flex-col font-sans">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <h1 className="text-3xl font-bold tracking-tight">Proposal Generator</h1>
          <button onClick={() => router.push("/workspace")} className="px-4 py-2 bg-gray-800 text-white rounded-md font-semibold shadow-sm hover:bg-gray-700 transition-all">
            Back to Workspace
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          
          <div className="bg-gray-100/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300 space-y-6">
            
            <div>
              <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">1. Select Template</label>
              <select 
                value={selectedTemplateId} 
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-gray-800"
              >
                <option value="">-- Choose a Saved Template --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option> // UPDATED: Correct column name
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">2. Select Research Folder</label>
              <select 
                value={selectedFolderId} 
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-gray-800"
              >
                <option value="">-- Choose a Folder --</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {selectedFolderId && (
              <div>
                <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">3. Select Professor</label>
                <select 
                  value={selectedProfileId} 
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-gray-800"
                >
                  <option value="">-- Choose a Verified Professor --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.professor_name} ({p.department_name})</option>
                  ))}
                </select>
              </div>
            )}

            <button 
              onClick={handleFabricate}
              disabled={isGenerating || !selectedTemplateId || !selectedProfileId}
              className="w-full py-4 mt-4 bg-blue-700 text-white rounded-xl font-bold shadow-md hover:bg-blue-600 transition-all disabled:opacity-50 text-lg uppercase tracking-wide"
            >
              {isGenerating ? "Fabricating Proposal..." : "Fabricate Proposal"}
            </button>
          </div>

          <div className="lg:col-span-2 bg-gray-100/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Final Draft Editor</h2>
              {generatedContent && (
                <button 
                  onClick={handleSaveProposal}
                  disabled={isSaving}
                  className="px-6 py-2 bg-green-700 text-white rounded-lg font-bold shadow-sm hover:bg-green-600 transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save to Database"}
                </button>
              )}
            </div>
            
            <textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              placeholder="Your fabricated proposal will appear here. You can make manual edits before saving."
              className="w-full flex-1 p-6 rounded-xl border border-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-gray-800 resize-none shadow-inner text-gray-900 font-medium leading-relaxed"
            />
          </div>

        </div>
      </div>
    </div>
  );
}