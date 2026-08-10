"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface Profile {
  id: string;
  professor_name: string;
  university_name: string;
  department_name: string;
}

interface Evidence {
  id: string;
  field_name: string;
  field_value: string;
  verification_status: string;
  evidence_summary: string | null;
  source_urls: string[];
  conflict_notes: string | null;
}

function EvidenceDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from('verified_profiles')
        .select('id, professor_name, university_name, department_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setProfiles(data);
      setIsLoading(false);
    };

    fetchProfiles();
  }, [router]);

  const handleSelectProfile = async (profile: Profile) => {
    setSelectedProfile(profile);
    setIsLoadingEvidence(true);
    setEvidenceList([]);

    const { data } = await supabase
      .from('professor_evidence')
      .select('*')
      .eq('profile_id', profile.id)
      .order('field_name', { ascending: true });

    if (data) {
      setEvidenceList(data);
    }
    setIsLoadingEvidence(false);
  };

  const formatFieldName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <h1 className="text-3xl font-bold tracking-tight">Evidence Review Dashboard</h1>
          <button 
            onClick={() => router.push("/workspace")}
            className="px-4 py-2 bg-gray-800 text-white rounded-md font-semibold shadow-sm hover:bg-gray-700 transition-all"
          >
            Back to Workspace
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300 h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Verified Profiles</h2>
            {isLoading ? (
              <p className="font-medium">Loading profiles...</p>
            ) : profiles.length === 0 ? (
              <p className="text-gray-700 font-medium">No verified profiles found. Run batch research first.</p>
            ) : (
              <div className="space-y-3">
                {profiles.map(profile => (
                  <div 
                    key={profile.id}
                    onClick={() => handleSelectProfile(profile)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedProfile?.id === profile.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white/80 border-gray-300 hover:bg-gray-100 text-gray-900'}`}
                  >
                    <span className="font-bold block">{profile.professor_name}</span>
                    <span className={`text-sm ${selectedProfile?.id === profile.id ? 'text-gray-300' : 'text-gray-600'}`}>{profile.department_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300 h-[80vh] overflow-y-auto">
            {!selectedProfile ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xl font-bold text-gray-500">Select a profile to inspect evidence.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border-b border-gray-300 pb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProfile.professor_name}</h2>
                  <p className="text-gray-700 font-medium">{selectedProfile.university_name} - {selectedProfile.department_name}</p>
                </div>

                {isLoadingEvidence ? (
                  <p className="font-medium">Loading evidence vault...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {evidenceList.map(ev => (
                      <div key={ev.id} className="p-4 bg-white/80 rounded-xl border border-gray-300 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-gray-800 text-sm uppercase tracking-wider">{formatFieldName(ev.field_name)}</span>
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-md border uppercase tracking-wider ${ev.verification_status === 'VERIFIED' ? 'bg-gray-900 text-white border-gray-900' : ev.verification_status === 'CONFLICTING' ? 'bg-gray-400 text-gray-900 border-gray-500' : 'bg-gray-200 text-gray-700 border-gray-300'}`}>
                            {ev.verification_status}
                          </span>
                        </div>
                        
                        <p className="text-gray-900 font-medium whitespace-pre-wrap">{ev.field_value}</p>

                        {ev.conflict_notes && (
                          <div className="p-3 bg-gray-100 rounded-lg border border-gray-300 mt-2">
                            <span className="text-xs font-bold text-gray-800 uppercase block mb-1">Conflict / Notes:</span>
                            <p className="text-sm text-gray-700">{ev.conflict_notes}</p>
                          </div>
                        )}

                        {ev.source_urls && ev.source_urls.length > 0 && (
                          <div className="pt-2 mt-2 border-t border-gray-300">
                            <span className="text-xs font-bold text-gray-800 uppercase block mb-1">Source Evidence:</span>
                            <div className="space-y-1">
                              {ev.source_urls.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="block text-xs font-bold hover:underline truncate">
                                  {url}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Evidence() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold">Loading...</div>}>
      <EvidenceDashboard />
    </Suspense>
  );
}