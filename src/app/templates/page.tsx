"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function TemplateBuilder() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data } = await supabase.from('templates').select('id, title, draft_content, created_at').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setTemplates(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Please provide both a title and template content.");
      return;
    }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const regex = /\[INSERTION:\s*(.*?)\s*\]/g;
      let match;
      const insertionsPayload = [];
      let idCounter = 1;
      
      while ((match = regex.exec(content)) !== null) {
        insertionsPayload.push({
          id: idCounter++,
          type: "Factual Lookup",
          target: match[1]
        });
      }

      const { error } = await supabase.from('templates').insert({
        user_id: user.id,
        title: title,
        draft_content: content,
        insertions: insertionsPayload 
      });

      if (error) throw error;
      alert("Template successfully secured!");
      setTitle("");
      setContent("");
      fetchTemplates();
    } catch (error: any) {
      alert("Failed to save template: " + error.message);
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="min-h-screen p-8 bg-gray-200 font-bold text-gray-900 flex items-center justify-center text-xl">Loading Template Builder...</div>;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900 flex flex-col font-sans">
      <div className="max-w-6xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <h1 className="text-3xl font-bold tracking-tight">Template Builder</h1>
          <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-gray-800 text-white rounded-md font-semibold shadow-sm hover:bg-gray-700 transition-all">
            Return to Command Center
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          
          <div className="lg:col-span-1 bg-gray-100/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300 space-y-4 overflow-y-auto max-h-[800px]">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-300 pb-2">Saved Frameworks</h2>
            {templates.length === 0 ? (
              <p className="text-sm font-medium text-gray-600">No templates secured yet.</p>
            ) : (
              <div className="space-y-4">
                {templates.map(t => (
                  <div key={t.id} className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-900">{t.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-3">{t.draft_content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-gray-100/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Design New Template</h2>
            
            <div className="space-y-4 flex-1 flex flex-col">
              <div>
                <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">Framework Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Standard Post-Doc Outreach"
                  className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-2">Draft Content (Use [INSERTION: ...] for AI targets)</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Dear Professor [INSERTION: professor's last name],&#10;&#10;I am writing to express my interest in your work regarding [INSERTION: summarize their recent paper]..."
                  className="w-full flex-1 p-4 rounded-xl border border-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-gray-800 resize-none font-medium leading-relaxed"
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 mt-4 bg-gray-900 text-white rounded-xl font-bold shadow-md hover:bg-gray-800 transition-all disabled:opacity-50 text-lg uppercase tracking-wide"
              >
                {isSaving ? "Securing Template..." : "Secure Template Framework"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}