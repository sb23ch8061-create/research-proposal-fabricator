"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Template {
  id: string;
  title: string;
  created_at: string;
}

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>("Loading...");
  const [templates, setTemplates] = useState<Template[]>([]);
  const router = useRouter();

  useEffect(() => {
    const getUserAndTemplates = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? "Unknown");
        
        const { data, error } = await supabase
          .from('templates')
          .select('id, title, created_at')
          .order('created_at', { ascending: false });
          
        if (!error && data) {
          setTemplates(data);
        }
      } else {
        router.push("/login");
      }
    };
    getUserAndTemplates();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Workspace</h1>
            <p className="font-medium mt-1">Logged in as: {userEmail}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="px-6 py-2 bg-gray-800 text-gray-100 rounded-md font-semibold shadow-md hover:bg-gray-700 transition-all"
          >
            Sign Out
          </button>
        </div>

        <div className="bg-gray-100/50 backdrop-blur-md p-10 rounded-2xl shadow-sm border border-gray-300 text-center space-y-4">
          <h2 className="text-2xl font-bold">Start a New Proposal</h2>
          <p className="text-lg font-medium">Upload or paste your PhD proposal draft to begin the verification process.</p>
          <Link 
            href="/fabricator"
            className="inline-block px-8 py-3 bg-gray-800 text-gray-100 rounded-md font-semibold shadow-md hover:bg-gray-700 transition-all mt-4"
          >
            Create Project
          </Link>
        </div>

        <div className="bg-gray-100/50 backdrop-blur-md p-10 rounded-2xl shadow-sm border border-gray-300 space-y-6">
          <h2 className="text-2xl font-bold">Your Saved Templates</h2>
          
          {templates.length === 0 ? (
            <p className="text-lg font-medium text-gray-600 text-center py-8">
              You have not saved any templates yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="bg-white/80 p-6 rounded-xl border border-gray-300 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{template.title}</h3>
                    <p className="text-sm font-semibold text-gray-500 mt-2">
                      Saved on: {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => router.push(`/fabricator?id=${template.id}`)}
                    className="mt-6 w-full py-2 bg-gray-300 text-gray-900 rounded-md font-semibold shadow-sm hover:bg-gray-400 transition-all"
                  >
                    Load Template
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}