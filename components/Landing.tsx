import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Mic, Code, Brain, Play, CheckCircle, Zap, Terminal, Globe, Lock } from 'lucide-react';
import { Mermaid } from './Mermaid';

interface LandingProps {
  onStart: () => void;
}

const DEMO_STEPS = [
  {
    text: "User: Explain Binary Search to me.",
    action: "listening",
    visual: "AUDIO"
  },
  {
    text: "AI: Sure! Imagine looking for a word in a dictionary...",
    action: "speaking",
    visual: "AUDIO"
  },
  {
    text: "AI: We start in the middle. If the target is lower, we discard the right half.",
    action: "drawing",
    visual: "DIAGRAM",
    data: "graph TD\n  Root((Binary Search)) --> Start[Start Middle]\n  Start --> Check{Target?}\n  Check -->|Yes| Found[Found]\n  Check -->|No| Split[High/Low]\n  Split -->|Lower| Left[Left Half]\n  Split -->|Higher| Right[Right Half]"
  },
  {
    text: "AI: Here is the implementation in Python.",
    action: "coding",
    visual: "CODE",
    data: "def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid"
  }
];

export const Landing: React.FC<LandingProps> = ({ onStart }) => {
  const [demoStep, setDemoStep] = useState(0);
  const [typedCode, setTypedCode] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % DEMO_STEPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Reset typing when step changes to code
    if (DEMO_STEPS[demoStep].visual === 'CODE') {
        setTypedCode("");
        let i = 0;
        const code = DEMO_STEPS[demoStep].data || "";
        const typeInterval = setInterval(() => {
            setTypedCode(code.substring(0, i));
            i++;
            if (i > code.length) clearInterval(typeInterval);
        }, 30);
        return () => clearInterval(typeInterval);
    }
  }, [demoStep]);

  const currentStep = DEMO_STEPS[demoStep];

  const handleNavClick = (e: React.MouseEvent, section: string) => {
      e.preventDefault();
      if (section === 'features' || section === 'demo') {
          document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
      } else {
          alert("This page is coming soon!");
      }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]" />
          <div className="absolute top-[40%] left-[-10%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#020617]/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img src="/assets/vak-logo.png" alt="Vak AI Logo" className="w-10 h-10 object-contain" />
                <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Vak AI</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                <button onClick={(e) => handleNavClick(e, 'features')} className="hover:text-white transition-colors">Features</button>
                <button onClick={(e) => handleNavClick(e, 'demo')} className="hover:text-white transition-colors">Live Demo</button>
                <button onClick={(e) => handleNavClick(e, 'pricing')} className="hover:text-white transition-colors">Pricing</button>
            </div>
            <button onClick={onStart} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-full text-sm font-medium transition-all">Sign In</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6 relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles size={14} className="text-indigo-400" />
            <span>The World's First Multimodal AI Tutor</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 max-w-4xl leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Don't just watch tutorials. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">Talk to your code.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Vak connects you to Gemini Live for a real-time voice conversation where the AI draws diagrams, writes code, and explains complex algorithms while you watch.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <button 
                onClick={onStart}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-lg transition-all shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.5)] flex items-center gap-2"
            >
                Start Learning Free
                <ArrowRight size={20} />
            </button>
            <button 
                onClick={(e) => handleNavClick(e, 'demo')}
                className="px-8 py-4 bg-[#0f172a] hover:bg-[#1e293b] text-white border border-slate-800 hover:border-slate-700 rounded-xl font-semibold text-lg transition-all flex items-center gap-2"
            >
                <Play size={20} className="fill-white" />
                Watch Demo
            </button>
        </div>
      </div>

      {/* Interactive Product Demo Simulator */}
      <div id="demo" className="max-w-6xl mx-auto px-6 mb-32 relative z-10 animate-in fade-in zoom-in duration-1000 delay-500">
          <div className="bg-[#0B1120]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
              {/* Window Controls */}
              <div className="h-12 bg-[#0f172a] border-b border-slate-800 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  <div className="ml-4 px-3 py-1 bg-slate-800 rounded text-xs text-slate-400 font-mono">vak-ai-live-session</div>
              </div>

              {/* Simulation Content */}
              <div className="h-[500px] flex flex-col md:flex-row">
                  {/* Left: Chat & Audio */}
                  <div className="w-full md:w-1/3 border-r border-slate-800 p-6 flex flex-col bg-[#0f172a]/50">
                      <div className="flex items-center gap-3 mb-8">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${currentStep.action === 'listening' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                              <Mic size={20} />
                          </div>
                          <div className="flex-1">
                              <div className="text-sm font-medium text-slate-200">Live Session</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                  Connected (14ms)
                              </div>
                          </div>
                      </div>

                      {/* Conversation Bubble */}
                      <div className="flex-1 flex flex-col justify-center space-y-4">
                           {DEMO_STEPS.map((step, idx) => (
                               <div key={idx} className={`p-4 rounded-xl text-sm transition-all duration-500 ${idx === demoStep ? 'opacity-100 translate-y-0' : 'opacity-40 scale-95'} ${step.text.startsWith('User') ? 'bg-indigo-600/10 border border-indigo-500/20 ml-8 text-indigo-200' : 'bg-slate-800/50 border border-slate-700 mr-8 text-slate-300'}`}>
                                   <div className="text-xs opacity-50 mb-1">{step.text.split(':')[0]}</div>
                                   {step.text.split(':')[1]}
                               </div>
                           ))}
                      </div>

                      {/* Visualizer Bar */}
                      <div className="h-16 flex items-center justify-center gap-1 mt-auto">
                          {[...Array(10)].map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-1 bg-indigo-500 rounded-full transition-all duration-150 ${currentStep.action === 'speaking' ? 'animate-pulse' : ''}`}
                                style={{ height: currentStep.action === 'speaking' ? `${20 + Math.random() * 40}px` : '4px' }}
                              />
                          ))}
                      </div>
                  </div>

                  {/* Right: Dynamic Canvas */}
                  <div className="flex-1 bg-[#0B1120] relative p-6 flex flex-col">
                      <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${currentStep.visual === 'DIAGRAM' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>DIAGRAM</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${currentStep.visual === 'CODE' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>CODE</span>
                      </div>

                      <div className="flex-1 flex items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-[#0f172a]/30">
                          {currentStep.visual === 'AUDIO' && (
                              <div className="text-center">
                                  <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                      <Brain size={40} className="text-indigo-400" />
                                  </div>
                                  <p className="text-slate-500 text-sm">Thinking & Processing Context...</p>
                              </div>
                          )}
                          {currentStep.visual === 'DIAGRAM' && (
                              <div className="w-full h-full flex items-center justify-center">
                                   <Mermaid chart={currentStep.data || ""} />
                              </div>
                          )}
                          {currentStep.visual === 'CODE' && (
                              <div className="w-full h-full p-6 font-mono text-sm text-slate-300">
                                  <pre><code className="text-indigo-300">def</code> <code className="text-yellow-300">binary_search</code>(arr, target):</pre>
                                  <pre className="text-slate-400">{typedCode}<span className="animate-pulse">|</span></pre>
                              </div>
                          )}
                      </div>
                      
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-mono">
                          <Terminal size={12} />
                          <span>AI Action: {currentStep.action.toUpperCase()}...</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Bento Grid Features */}
      <div id="features" className="max-w-7xl mx-auto px-6 py-24">
         <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Top Developers Choose Vak</h2>
            <p className="text-slate-400">The most advanced learning environment ever built.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
             {/* Large Left Item */}
             <div className="md:col-span-2 row-span-2 bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full group-hover:bg-indigo-500/30 transition-all"></div>
                 <div className="relative z-10 h-full flex flex-col">
                     <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                         <Brain size={24} />
                     </div>
                     <h3 className="text-3xl font-bold mb-4">Visual Grounding</h3>
                     <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                         The AI doesn't just read text. It "sees" your code, your cursor, and your errors. It draws diagrams on a shared whiteboard to explain complex recursion or graph problems visually.
                     </p>
                     <div className="mt-auto pt-8 flex gap-4">
                        <div className="px-4 py-2 bg-slate-950/50 rounded-lg border border-slate-800 text-sm text-indigo-300 flex items-center gap-2">
                            <CheckCircle size={14} /> Mermaid.js Diagrams
                        </div>
                        <div className="px-4 py-2 bg-slate-950/50 rounded-lg border border-slate-800 text-sm text-indigo-300 flex items-center gap-2">
                            <CheckCircle size={14} /> Real-time Cursor Tracking
                        </div>
                     </div>
                 </div>
             </div>

             {/* Right Top */}
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 transition-colors group">
                 <Zap size={32} className="text-yellow-400 mb-6 group-hover:scale-110 transition-transform" />
                 <h3 className="text-xl font-bold mb-2">Gemini 2.5 Flash</h3>
                 <p className="text-slate-400">Powered by Google's latest multimodal model with native audio streaming for sub-500ms latency.</p>
             </div>

             {/* Right Bottom */}
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 transition-colors group">
                 <Globe size={32} className="text-cyan-400 mb-6 group-hover:scale-110 transition-transform" />
                 <h3 className="text-xl font-bold mb-2">Infinite Practice</h3>
                 <p className="text-slate-400">Never run out of problems. The AI generates new challenges tailored to your weak points instantly.</p>
             </div>
         </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#020617] py-12 text-center text-slate-500 text-sm">
          <p>© 2024 Vak AI. Built for the Gemini Developer Competition.</p>
      </footer>

    </div>
  );
};