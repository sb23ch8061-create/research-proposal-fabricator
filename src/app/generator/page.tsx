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
  const [activeEvidence, setActiveEvidence] = useState<any[]>([]);
  const [researcherIdentity, setResearcherIdentity] = useState<any>(null);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: templateData } = await supabase.from('templates').select('id, title, draft_content').eq('user_id', user.id);
      if (templateData) setTemplates(templateData);

      const { data: folderData } = await supabase.from('research_folders').select('id, name').eq('user_id', user.id).is('parent_id', null);
      if (folderData) setFolders(folderData);

      // Fetch User's Researcher Identity
      const { data: identityData } = await supabase.from('researcher_identity').select('*').eq('user_id', user.id).single();
      if (identityData) setResearcherIdentity(identityData);

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

  const loadEvidenceForValidation = async (profileId: string) => {
    const { data: evidence } = await supabase.from('professor_evidence').select('*').eq('profile_id', profileId);
    const { data: manualEdits } = await supabase.from('professor_manual_edits').select('*').eq('profile_id', profileId);
    
    if (evidence) {
      const compiled = evidence.map(ev => {
        const override = manualEdits?.find(m => m.target_key === ev.field_name);
        return {
          field: ev.field_name,
          value: override && override.manual_value ? override.manual_value : ev.field_value,
          isOverride: !!(override && override.manual_value),
          status: ev.verification_status
        };
      });
      setActiveEvidence(compiled);
    }
  };

  const handleFabricate = async () => {
    if (!selectedTemplateId || !selectedProfileId) {
      alert("Please select both a template and a professor.");
      return;
    }
    if (!researcherIdentity) {
      alert("Please complete your Researcher Identity Vault before generating a proposal.");
      return;
    }

    setIsGenerating(true);
    await loadEvidenceForValidation(selectedProfileId);

    try {
      const template = templates.find(t => t.id === selectedTemplateId);
      const profile = profiles.find(p => p.id === selectedProfileId);

      let contextPayload = `Target Professor: ${profile.professor_name}\nDepartment: ${profile.department_name}\n\n`;
      
      activeEvidence.forEach(ev => {
        contextPayload += `--- [${ev.field.toUpperCase()}] ---\n${ev.value}\n\n`;
      });

      let researcherContext = `Name: ${researcherIdentity.full_name}\nTitle: ${researcherIdentity.current_title}\nFocus: ${researcherIdentity.research_focus}\nMethodologies: ${researcherIdentity.methodologies}\nBackground: ${researcherIdentity.academic_background}`;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateContent: template.draft_content,
          professorContext: contextPayload,
          researcherContext: researcherContext,
          professorName: profile.professor_name
        }),
      });

      const result = await response.json();
      if (result.success) {
        setGeneratedContent(result.generatedProposal);
        setShowValidation(true);
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
        proposal_title: `Generated from: ${template.title}`,
        final_content: generatedContent
      });

      if (error) throw error;
      alert("Proposal successfully saved to your database!");
    } catch (error: any) {
      alert("Failed to save: " + error.message);
    }
    setIsSaving(false);
  };

  const handleExportDocument = () => {
    if (!generatedContent.trim()) return;
    const blob = new Blob([generatedContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeFileName = selectedProfileId 
      ? profiles.find(p => p.id === selectedProfileId)?.professor_name.replace(/[^a-zA-Z0-9]/g, '_') 
      : "Research";
    link.download = `${safeFileName}_Proposal.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="min-h-screen p-8 bg-gray-200 font-bold text-gray-900 flex items-center justify-center text-xl">Loading Secure Workspace...</div>;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900 flex flex-col font-sans">
      <div className="max-w-screen-2xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <h1 className="text-3xl font-bold tracking-tight">Traceable Proposal Fabricator</h1>
          <button onClick={() => router.push("/workspace")} className="px-6 py-2 bg-gray-800 text-white rounded-md font-semibold shadow-sm hover:bg-gray-700 transition-all">
            Return to Workspace
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
          
          {/* Configuration Panel */}
          <div className="bg-gray-100/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300 space-y-6 flex flex-col">
            <div>
              <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">1. Select Template</label>
              <select 
                value={selectedTemplateId} 
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-gray-800"
              >
                <option value="">-- Choose a Saved Template --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">2. Target Folder</label>
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
                <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">3. Verify Target</label>
                <select 
                  value={selectedProfileId} 
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-gray-800"
                >
                  <option value="">-- Choose a Verified Target --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.professor_name} ({p.department_name})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
               <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider block mb-1">Identity Sync</span>
               <span className="text-sm font-medium text-blue-800">
                 {researcherIdentity ? `Linked: ${researcherIdentity.full_name}` : "Missing Identity"}
               </span>
            </div>

            <button 
              onClick={handleFabricate}
              disabled={isGenerating || !selectedTemplateId || !selectedProfileId}
              className="w-full py-4 mt-auto bg-blue-700 text-white rounded-xl font-bold shadow-md hover:bg-blue-600 transition-all disabled:opacity-50 text-lg uppercase tracking-wide"
            >
              {isGenerating ? "Fabricating..." : "Execute Fabrication"}
            </button>
          </div>

          {/* Validation & Evidence Panel */}
          {showValidation && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-300 overflow-y-auto max-h-[800px]">
              <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Source Validation Tracker</h3>
              <div className="space-y-4">
                {activeEvidence.map((ev, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">{ev.field.replace(/_/g, ' ')}</span>
                      {ev.isOverride ? (
                         <span className="text-[9px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-sm uppercase tracking-wider">Manual Override</span>
                      ) : (
                         <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${ev.status === 'VERIFIED' ? 'bg-gray-900 text-white' : 'bg-yellow-200 text-yellow-900'}`}>{ev.status}</span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-4">{ev.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Draft Editor */}
          <div className={`${showValidation ? 'lg:col-span-2' : 'lg:col-span-3'} bg-gray-100/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300 flex flex-col transition-all duration-300`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Final Document Editor</h2>
              <div className="flex gap-3">
                {generatedContent && (
                  <>
                    <button 
                      onClick={handleExportDocument}
                      className="px-6 py-2 bg-gray-800 text-white rounded-lg font-bold shadow-sm hover:bg-gray-700 transition-all"
                    >
                      Export Document
                    </button>
                    <button 
                      onClick={handleSaveProposal}
                      disabled={isSaving}
                      className="px-6 py-2 bg-green-700 text-white rounded-lg font-bold shadow-sm hover:bg-green-600 transition-all disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save to Database"}
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              placeholder="Your fabricated proposal will appear here. Audit against the Source Validation Tracker before exporting."
              className="w-full flex-1 p-6 rounded-xl border border-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-gray-800 resize-none shadow-inner text-gray-900 font-medium leading-relaxed"
            />
          </div>

        </div>
      </div>
    </div>
  );
}