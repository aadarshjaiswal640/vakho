// Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, Trophy, Flame, Code, Zap, BookOpen, PlayCircle, Star, User, Lock, ArrowRight, Info, ChevronDown } from 'lucide-react';
import { ViewMode, CodingProblem } from '../types';
import { supabase } from '../services/supabaseService';

interface DashboardProps {
  setView: (view: ViewMode, problem?: CodingProblem) => void;
}

// Map topics to specific problems for the dropdowns
const PATH_CONTENT: Record<string, {title: string, id: string}[]> = {
  'Arrays': [{title: 'Two Sum', id: 'two-sum'}, {title: '3Sum', id: 'three-sum'}, {title: 'Contains Duplicate', id: 'contains-dup'}],
  'Linked Lists': [{title: 'Reverse List', id: 'rev-list'}, {title: 'Delete Node', id: 'del-node'}],
  'Stacks': [{title: 'Valid Parentheses', id: 'valid-paren'}],
  'Queues': [{title: 'Recent Calls', id: 'recent-calls'}],
  'Trees': [{title: 'Invert Tree', id: 'invert-tree'}, {title: 'Max Depth', id: 'max-depth'}],
  'Graphs': [{title: 'Island Count', id: 'island-count'}]
};

// Default problem to load when clicking "Practice" from the top bar
const DEFAULT_PROBLEM: CodingProblem = {
    title: 'Two Sum',
    difficulty: 'Easy',
    description: '## Two Sum\nGiven an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
    starterCode: 'function twoSum(nums, target) {\n  // implementation\n}',
    testCases: '[]'
};

// HELPER FUNCTION: To generate/fetch the full problem object for practice mode
const getProblemDetailsByTitle = (title: string, id: string): CodingProblem => {
    const difficulty = title.includes('3Sum') || title.includes('Island') ? 'Medium' : 'Easy';
    const starterCodeMap: Record<string, string> = {
        'Two Sum': `function twoSum(nums, target) {\n  // your implementation\n}`,
        '3Sum': `function threeSum(nums) {\n  // your implementation\n}`,
        'Contains Duplicate': `function containsDuplicate(nums) {\n  // your implementation\n}`,
        'Reverse List': `function reverseList(head) {\n  // your implementation\n}`,
    };

    return {
        title: title,
        difficulty: difficulty,
        description: `## Problem: ${title}\n\n${title} is a classic ${difficulty} problem. Solve it efficiently.`,
        starterCode: starterCodeMap[title] || `function solve() {\n  // Problem: ${title}\n}`,
        testCases: '[]'
    };
};

export const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  const [notification, setNotification] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            if (data) setProfile(data);
          }
        } catch (err) {
          console.error('Error fetching dashboard data:', err);
        }
      };
      fetchUserData();
  }, []);

  // Logic for Dynamic Stats
  const totalSolved = profile?.total_solved || 0;
  const pathGoal = 10; 
  const progressPercent = Math.min(Math.round((totalSolved / pathGoal) * 100), 100);
  
  const chartData = profile?.activity_history || [
    { name: 'Mon', solved: 0 }, { name: 'Tue', solved: 0 }, { name: 'Wed', solved: 0 },
    { name: 'Thu', solved: 0 }, { name: 'Fri', solved: 0 }, { name: 'Sat', solved: 0 }, { name: 'Sun', solved: 0 }
  ];

  return (
    <div className="min-h-screen w-full bg-slate-950 p-6 pt-24 font-sans relative">
      {notification && (
        <div className="fixed top-24 right-6 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <Info size={20} className="text-indigo-400" />
            <span>{notification}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {profile?.name || 'Developer'}</h1>
            <p className="text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Your "{profile?.current_path || 'Data Structures'}" streak is at {profile?.current_streak || 0}! 🔥
            </p>
          </div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
             <button onClick={() => setView('PROFILE')} className="flex-1 md:flex-none px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl flex items-center justify-center gap-2 border border-slate-800 transition-all font-medium">
              <User size={18} /> Profile
            </button>
            <button onClick={() => setView('MENTOR')} className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 font-semibold group">
              <Zap size={18} className="group-hover:text-yellow-300 transition-colors" /> AI Mentor
            </button>
            <button onClick={() => setView('PRACTICE', DEFAULT_PROBLEM)} className="flex-1 md:flex-none px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center gap-2 border border-slate-700 font-semibold">
              <Code size={18} /> Practice
            </button>
          </div>
        </div>

        {/* Dynamic Learning Path */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800/50 rounded-2xl p-8 border border-slate-800 relative overflow-visible group">
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                            <BookOpen className="text-indigo-400" size={20} /> Path: Data Structures & Algorithms
                        </h2>
                        <p className="text-slate-400 text-sm">Target: {pathGoal} Problems</p>
                    </div>
                    <span className="text-3xl font-bold text-indigo-400">{progressPercent}%</span>
                </div>
                
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden mb-8 ring-1 ring-white/5">
                    {/* FIXED: Removed the white line/shadow div from the bar below */}
                    <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }}>
                    </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {Object.keys(PATH_CONTENT).map((topic, i) => {
                        const isCompleted = (totalSolved / pathGoal) * 6 > i + 1;
                        const isCurrent = !isCompleted && (totalSolved / pathGoal) * 6 > i;
                        return (
                            <div 
                              key={i} 
                              className="relative"
                              onMouseEnter={() => setHoveredTopic(topic)}
                              onMouseLeave={() => setHoveredTopic(null)}
                            >
                                <div className={`flex flex-col items-center gap-3 cursor-pointer ${isCompleted ? 'text-indigo-400' : isCurrent ? 'text-white' : 'text-slate-600'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                                        isCompleted ? 'bg-indigo-500/10 border-indigo-500/30' : 
                                        isCurrent ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] scale-110' : 
                                        'bg-slate-900/50 border-slate-800'
                                    }`}>
                                        {isCompleted ? <Star size={18} fill="currentColor" /> : isCurrent ? <PlayCircle size={20} fill="currentColor" /> : <Lock size={16} />}
                                    </div>
                                    <span className="text-xs font-medium flex items-center gap-1">{topic} <ChevronDown size={10}/></span>
                                </div>

                                {/* Dropdown Menu */}
                                {hoveredTopic === topic && (
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95">
                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-1">Jump to Problem</div>
                                    {PATH_CONTENT[topic].map((prob, idx) => (
                                      <button 
                                        key={idx}
                                        onClick={() => setView('PRACTICE', getProblemDetailsByTitle(prob.title, prob.id))}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-indigo-600 hover:text-white flex items-center justify-between group/item"
                                      >
                                        {prob.title} <ArrowRight size={12} className="opacity-0 group-hover/item:opacity-100" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Questions', value: totalSolved, sub: 'Total Solved', icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'Streak', value: profile?.current_streak || 0, sub: 'Personal Best', icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
            { label: 'XP', value: `${(profile?.total_xp / 1000).toFixed(1)}k`, sub: `Level ${Math.floor(profile?.total_xp / 1000) || 1}`, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
            { label: 'Rank', value: `#${profile?.global_rank || '---'}`, sub: 'Top 5%', icon: Trophy, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
          ].map((stat, idx) => (
            <div key={idx} className={`bg-slate-900/50 border ${stat.border} p-5 rounded-2xl flex items-center justify-between hover:bg-slate-900 transition-colors group cursor-default`}>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white group-hover:scale-105 transition-transform origin-left">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coding Activity Chart */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Coding Activity</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#475569" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <YAxis stroke="#475569" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="solved" stroke="#6366f1" strokeWidth={3} fill="url(#colorSolved)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Recommended</h3>
            {profile?.recent_modules?.map((tut: any, i: number) => (
                <div key={i} className="group relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className={`h-1 w-full bg-gradient-to-r ${tut.color || 'from-indigo-500 to-purple-500'}`}></div>
                    <div className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white">
                            <PlayCircle size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-white text-sm">{tut.title}</h4>
                            <p className="text-[10px] text-slate-500">{tut.time} • {tut.level}</p>
                        </div>
                        <ArrowRight size={16} className="text-slate-600 group-hover:text-white" />
                    </div>
                </div>
            ))}
            {!profile?.recent_modules && (
                <p className="text-slate-500 text-sm">Complete your first problem to see recommendations!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};