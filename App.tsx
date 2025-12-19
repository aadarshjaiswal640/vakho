import React, { useState, useEffect } from 'react';
import { ViewMode, CodingProblem } from './types';
import { supabase } from './services/supabaseService';
import { Landing } from './components/Landing';
import { Dashboard } from './components/Dashboard';
import { MentorWorkspace } from './components/MentorWorkspace';
import { PracticeArena } from './components/PracticeArena';
import { Profile } from './components/Profile';
import { Auth } from './components/Auth';

// Default state for when a user goes to Practice without selecting a specific problem
const DEFAULT_PROBLEM: CodingProblem = {
    title: "Select a Problem",
    difficulty: "Easy",
    description: "Please choose a coding challenge from the dashboard's learning path or use the AI Mentor to generate one.",
    starterCode: "// Your code will appear here once a problem is selected",
    testCases: "[]"
};

const App = () => {
  const [view, setView] = useState<ViewMode>('LANDING');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // NEW: State to hold the problem selected in the Dashboard
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem>(DEFAULT_PROBLEM);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      // Auto-navigation logic
      if (session && (view === 'AUTH' || view === 'LANDING')) {
        setView('DASHBOARD');
      } else if (!session && view !== 'LANDING') {
        setView('AUTH');
      }
    });

    return () => subscription.unsubscribe();
  }, [view]);

  // NEW: Updated setView handler that accepts an optional problem
  const handleSetView = (newView: ViewMode, problem?: CodingProblem) => {
    if (problem) {
      setSelectedProblem(problem);
    }
    setView(newView);
  };

  const handleStart = () => {
    if (session) {
      setView('DASHBOARD');
    } else {
      setView('AUTH');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {/* 1. Landing Page */}
      {view === 'LANDING' && (
        <Landing onStart={handleStart} />
      )}

      {/* 2. Authentication */}
      {view === 'AUTH' && (
        <Auth onLogin={() => setView('DASHBOARD')} />
      )}

      {/* 3. Combined Dashboard */}
      {view === 'DASHBOARD' && (
        <Dashboard setView={handleSetView} />
      )}

      {/* 4. AI Mentor Workspace */}
      {view === 'MENTOR' && (
        <MentorWorkspace onBack={() => setView('DASHBOARD')} />
      )}

      {/* 5. Practice Arena - Now receives the selectedProblem */}
      {view === 'PRACTICE' && (
        <PracticeArena 
          problem={selectedProblem} 
          onBack={() => setView('DASHBOARD')} 
        />
      )}

      {/* 6. User Profile */}
      {view === 'PROFILE' && (
        <Profile onBack={() => setView('DASHBOARD')} />
      )}
    </>
  );
};

export default App;