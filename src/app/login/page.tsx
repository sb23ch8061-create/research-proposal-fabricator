"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSignUp = async () => {
    setMessage("Creating account...");
    const { error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Account created successfully! You can now Sign In.");
    }
  };

  const handleSignIn = async () => {
    setMessage("Authenticating...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setMessage(error.message);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900">
      <div className="max-w-md w-full bg-gray-100/50 backdrop-blur-md rounded-2xl shadow-lg border border-gray-300 p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center tracking-tight">Access Workspace</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-gray-400 bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all"
              placeholder="researcher@university.edu"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-gray-400 bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {/* This area will display our success or error messages */}
          {message && (
            <p className="text-sm font-medium text-center bg-gray-200 py-2 rounded-md border border-gray-300">
              {message}
            </p>
          )}

          <div className="flex gap-4 pt-2">
            <button 
              onClick={handleSignIn}
              className="flex-1 bg-gray-800 text-gray-100 py-3 rounded-md font-semibold shadow-md hover:bg-gray-700 hover:shadow-lg transition-all"
            >
              Sign In
            </button>
            <button 
              onClick={handleSignUp}
              className="flex-1 bg-gray-300 text-gray-900 py-3 rounded-md font-semibold shadow-sm hover:bg-gray-400 transition-all"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}