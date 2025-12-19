import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Check, Info, ArrowLeft, LogOut, User, Save, Zap, Target, TrendingUp, Shield } from 'lucide-react';
import { GeminiLiveService } from '../services/geminiService';
import { supabase } from '../services/supabaseService';
import { UserProfile, ToolContext } from '../types';

interface ProfileProps {
  onBack: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "New Developer",
  role: "Aspiring Coder",
  bio: "Tell us about yourself to get started!",
  goals: ["Learn the basics"],
  skills: ["Curiosity"],
  swot: {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: []
  }
};

export const Profile: React.FC<ProfileProps> = ({ onBack }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [volume, setVolume] = useState(0);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
  const serviceRef = useRef<GeminiLiveService | null>(null);

  // Fetch Profile Logic (MODIFIED SECTION)
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch existing profile from "DB"
          const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
          
          if (data) {
             // START FIX: Merge fetched data with defaults to prevent null properties
             setProfile(prev => ({ 
               ...DEFAULT_PROFILE, 
               ...data, 
               // Ensure nested SWOT structure is handled safely
               swot: { 
                 ...DEFAULT_PROFILE.swot, 
                 ...(data.swot || {}) // Use data.swot or an empty object if data.swot is null
               },
               // Ensure user ID and email are correctly set from auth object
               user_id: user.id,
               email: user.email
             }));
             // END FIX
          } else {
             // Initialize new user with full DEFAULT_PROFILE structure
             setProfile(prev => ({ 
               ...DEFAULT_PROFILE, 
               email: user.email, 
               user_id: user.id 
             }));
          }
        }
      } catch (e) {
        console.error("Error fetching profile", e);
        showNotification("Could not load profile data", "info");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Gemini Service Setup
  useEffect(() => {
    const toolHandlers: ToolContext = {
      updateMindmap: () => {},
      updateFlowchart: () => {},
      updateWhiteboard: () => {},
      writeCode: () => {},
      setActiveLine: () => {},
      moveCursor: () => {},
      showTopicInfo: () => {},
      changeProblem: async () => {},
      highlightSection: () => {},
      
      updateProfile: (data) => {
        setProfile(prev => ({
          ...prev,
          ...data,
          swot: { ...prev.swot, ...(data.swot || {}) } 
        }));
        showNotification("Profile updated by AI Architect", 'info');
      }
    };

    serviceRef.current = new GeminiLiveService(toolHandlers, (v) => setVolume(v));
    return () => { serviceRef.current?.disconnect(); };
  }, []);

  const showNotification = (msg: string, type: 'success' | 'info' = 'success') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async () => {
      setSaving(true);
      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) throw new Error("No user logged in");

         const profileData = {
           ...profile,
           user_id: user.id,
           email: user.email // Ensure consistency
         };

         const { error } = await supabase.from('profiles').upsert(profileData);
         if (error) throw error;
         
         showNotification("Profile saved successfully!");
      } catch (e: any) {
         console.error(e);
         showNotification(e.message || "Failed to save", 'info');
      } finally {
         setSaving(false);
      }
  };
  
  const handleLogout = async () => {
      await supabase.auth.signOut();
      // App.tsx handles the redirection when auth state changes
  };

  const toggleVoiceBuilder = async () => {
    if (isVoiceActive) {
      await serviceRef.current?.disconnect();
      setIsVoiceActive(false);
    } else {
      try {
        await serviceRef.current?.connect(
          `You are the 'DevPath Profile Architect'. You are speaking with ${profile.name || 'the user'}. 
          Your goal is to interview them to build their career profile.
          
          Current Data:
          Role: ${profile.role}
          Skills: ${profile.skills.join(', ')}
          
          Instructions:
          1. Ask specific questions about their recent projects or learning hurdles.
          2. Use 'update_profile' to fill in the SWOT analysis based on their answers.
          3. Be concise and professional.`,
          'PROFILE'
        );
        setIsVoiceActive(true);
      } catch (e) {
        console.error(e);
        showNotification("Failed to connect to AI Service. Check API Key.", 'info');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#020617] p-6 pt-24 font-sans text-slate-200 relative">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-24 right-6 z-50 border px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${notification.type === 'success' ? 'bg-slate-900 border-emerald-500/50 text-white' : 'bg-slate-900 border-indigo-500/50 text-white'}`}>
            {notification.type === 'success' ? <Check size={20} className="text-emerald-400" /> : <Info size={20} className="text-indigo-400" />}
            <span>{notification.msg}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3">
             {isVoiceActive && (
                <div className="hidden sm:flex gap-1 items-center h-4 bg-slate-900 px-3 py-2 rounded-full border border-indigo-500/30">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mr-2">Live</div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1 bg-indigo-500 rounded-full transition-all" style={{ height: `${Math.max(20, volume * 100 * (Math.random() + 0.5))}%` }} />
                    ))}
                </div>
             )}
             
             <button 
               onClick={toggleVoiceBuilder}
               className={`px-4 py-2 rounded-xl flex items-center gap-2 font-semibold text-sm transition-all shadow-lg ${isVoiceActive ? 'bg-red-500/10 text-red-500 border border-red-500/50 animate-pulse' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/25'}`}
             >
               {isVoiceActive ? <><MicOff size={16} /> End Session</> : <><Mic size={16} /> Architect Mode</>}
             </button>

             <button 
                onClick={handleLogout}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors border border-slate-700"
                title="Sign Out"
             >
                <LogOut size={18} />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Identity Card */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 lg:col-span-1 h-fit backdrop-blur-sm">
             <div className="flex flex-col items-center text-center mb-8">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1 mb-4 shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                   <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                      <User size={64} className="text-slate-400" />
                   </div>
                </div>
                {/* Editable Fields */}
                <input 
                   value={profile.name} 
                   onChange={(e) => setProfile(p => ({...p, name: e.target.value}))}
                   className="bg-transparent text-2xl font-bold text-white text-center w-full border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none mb-1 pb-1 transition-all"
                />
                <input 
                   value={profile.role} 
                   onChange={(e) => setProfile(p => ({...p, role: e.target.value}))}
                   className="bg-transparent text-indigo-400 font-medium text-center w-full border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-none pb-1 transition-all"
                />
                
                <div className="w-full h-px bg-slate-800 my-4"></div>
                
                <textarea 
                   value={profile.bio}
                   onChange={(e) => setProfile(p => ({...p, bio: e.target.value}))}
                   className="bg-transparent text-slate-400 text-sm leading-relaxed text-center w-full h-24 border border-transparent hover:border-slate-800 focus:border-indigo-500 outline-none rounded p-2 resize-none transition-all"
                />
             </div>

             <div className="space-y-4">
                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Zap size={12} /> Core Skills</h3>
                    <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded-lg text-xs font-medium border border-indigo-500/20">{skill}</span>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Target size={12} /> Career Goals</h3>
                    <ul className="space-y-2">
                        {profile.goals.map((goal, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                                {goal}
                            </li>
                        ))}
                    </ul>
                </div>
             </div>
          </div>

          {/* Right Column: Strategic Analysis (SWOT) */}
          <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center gap-4 mb-2 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                 <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20"><TrendingUp size={24} /></div>
                 <div>
                     <h2 className="text-xl font-bold text-white">Strategic Career Analysis</h2>
                     <p className="text-slate-400 text-sm">Real-time SWOT analysis generated by your AI Architect session.</p>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Strengths */}
                 <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-colors group">
                     <h3 className="flex items-center gap-2 text-emerald-400 font-bold mb-4 uppercase tracking-wider text-sm">
                         <Shield size={16} /> Strengths
                     </h3>
                     <ul className="space-y-2">
                         {profile.swot.strengths.length > 0 ? profile.swot.strengths.map((item, i) => (
                             <li key={i} className="flex gap-2 text-sm text-slate-300 group-hover:text-white transition-colors"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>{item}</li>
                         )) : <li className="text-slate-600 text-sm italic">Connect AI to analyze strengths</li>}
                     </ul>
                 </div>

                 {/* Weaknesses */}
                 <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-red-500/30 transition-colors group">
                     <h3 className="flex items-center gap-2 text-red-400 font-bold mb-4 uppercase tracking-wider text-sm">
                         <TrendingUp size={16} className="rotate-180" /> Weaknesses
                     </h3>
                     <ul className="space-y-2">
                         {profile.swot.weaknesses.length > 0 ? profile.swot.weaknesses.map((item, i) => (
                             <li key={i} className="flex gap-2 text-sm text-slate-300 group-hover:text-white transition-colors"><div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5"></div>{item}</li>
                         )) : <li className="text-slate-600 text-sm italic">Connect AI to analyze weaknesses</li>}
                     </ul>
                 </div>

                 {/* Opportunities */}
                 <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-blue-500/30 transition-colors group">
                     <h3 className="flex items-center gap-2 text-blue-400 font-bold mb-4 uppercase tracking-wider text-sm">
                         <Zap size={16} /> Opportunities
                     </h3>
                     <ul className="space-y-2">
                         {profile.swot.opportunities.length > 0 ? profile.swot.opportunities.map((item, i) => (
                             <li key={i} className="flex gap-2 text-sm text-slate-300 group-hover:text-white transition-colors"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>{item}</li>
                         )) : <li className="text-slate-600 text-sm italic">Connect AI to identify opportunities</li>}
                     </ul>
                 </div>

                 {/* Threats */}
                 <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors group">
                     <h3 className="flex items-center gap-2 text-orange-400 font-bold mb-4 uppercase tracking-wider text-sm">
                         <Shield size={16} className="text-orange-400" /> Threats
                     </h3>
                     <ul className="space-y-2">
                         {profile.swot.threats.length > 0 ? profile.swot.threats.map((item, i) => (
                             <li key={i} className="flex gap-2 text-sm text-slate-300 group-hover:text-white transition-colors"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5"></div>{item}</li>
                         )) : <li className="text-slate-600 text-sm italic">Connect AI to identify threats</li>}
                     </ul>
                 </div>
             </div>

             <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6 mt-8 flex items-center justify-between shadow-lg">
                 <div>
                     <h3 className="text-lg font-bold text-white mb-1">Satisfied with the analysis?</h3>
                     <p className="text-slate-400 text-sm">Save this profile to personalize your future practice sessions.</p>
                 </div>
                 <button 
                   onClick={handleSave}
                   disabled={saving}
                   className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                 >
                     {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                     {saving ? "Saving..." : "Save Profile"}
                 </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};