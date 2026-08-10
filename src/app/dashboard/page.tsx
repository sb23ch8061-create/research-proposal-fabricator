"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>("Loading...");
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? "Unknown");
      } else {
        router.push("/login");
      }
    };
    getUser();
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

      </div>
    </div>
  );
}