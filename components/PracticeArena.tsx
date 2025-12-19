import React, { useState, useEffect, useRef } from 'react';
import { Play, Mic, MicOff, Terminal, Loader2, ArrowLeft, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { Mermaid } from './Mermaid';
import { SpeechInput } from './SpeechInput';
import { LanguageSelector } from './LanguageSelector';
import { GeminiLiveService } from '../services/geminiService';
import { QuestionService } from '../services/questionService';
import { supabase } from '../services/supabaseService'; // ⭐️ Connected to Supabase
import { ToolContext, CodingProblem } from '../types';
import { SupportedLanguage, getLanguageConfig, getStarterTemplate } from '../services/languageTemplates';
import { marked } from 'marked';

interface PracticeArenaProps {
  onBack: () => void;
  problem: CodingProblem; // ⭐️ Received from App.tsx
}

const FILE_EXTENSIONS: Record<SupportedLanguage, string> = {
  javascript: 'SOLUTION.JS',
  python: 'SOLUTION.PY',
  c: 'SOLUTION.C',
  cpp: 'SOLUTION.CPP',
  java: 'MAIN.JAVA'
};

export const PracticeArena: React.FC<PracticeArenaProps> = ({ onBack, problem: initialProblem }) => {
  // --- STATE ---
  const [language, setLanguage] = useState<SupportedLanguage>('javascript');
  const [problem, setProblem] = useState<CodingProblem>(initialProblem);
  const [code, setCode] = useState(initialProblem.starterCode);
  
  const [activeTab, setActiveTab] = useState<'MINDMAP' | 'FLOWCHART' | 'WHITEBOARD'>('WHITEBOARD');
  const [mindmap, setMindmap] = useState("");
  const [flowchart, setFlowchart] = useState("");
  const [whiteboard, setWhiteboard] = useState("# AI Scratchpad\n\nConnect to the tutor to get help with logic, visualization, or hints.");
  const [aiCursor, setAiCursor] = useState({ x: 50, y: 50 });
  const [activeSection, setActiveSection] = useState<'problem' | 'visualizer' | 'editor' | 'console' | null>(null);

  const [consoleOutput, setConsoleOutput] = useState("Console ready. Click Run to test.");
  const [activeLine, setActiveLine] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [volume, setVolume] = useState(0);
  const [loading, setLoading] = useState(false);
  const serviceRef = useRef<GeminiLiveService | null>(null);

  // --- SYNC WITH PROPS ---
  // When user clicks a new problem in Dashboard, update the Arena state
  useEffect(() => {
    if (initialProblem) {
      setProblem(initialProblem);
      setCode(initialProblem.starterCode);
      setConsoleOutput(`Switched to: ${initialProblem.title}`);
      setSuccess(false);
    }
  }, [initialProblem]);

  // --- AI & TOOL HANDLERS ---
  useEffect(() => {
    const toolHandlers: ToolContext = {
      updateMindmap: (c) => { setMindmap(c); setActiveTab('MINDMAP'); },
      updateFlowchart: (c) => { setFlowchart(c); setActiveTab('FLOWCHART'); },
      updateWhiteboard: (c) => { setWhiteboard(c); setActiveTab('WHITEBOARD'); },
      writeCode: (c) => setCode(c),
      setActiveLine: (line) => setActiveLine(line),
      moveCursor: (x, y) => setAiCursor({ x, y }),
      showTopicInfo: () => {}, 
      changeProblem: async (topic, difficulty) => {
          setLoading(true);
          setError(null);
          try {
             const newProblem = await QuestionService.generateProblem(topic, difficulty, language);
             setProblem(newProblem);
             setCode(newProblem.starterCode);
             setWhiteboard(`## Plan for: ${newProblem.title}\n\n- AI generated this based on your request.`);
          } catch(e: any) {
             setError("Error generating problem via Voice.");
          } finally {
             setLoading(false);
          }
      },
      highlightSection: (section) => {
          setActiveSection(section);
          setTimeout(() => setActiveSection(null), 3000);
      }
    };

    serviceRef.current = new GeminiLiveService(toolHandlers, (v) => setVolume(v));
    return () => { serviceRef.current?.disconnect(); };
  }, [language]);

  // --- LOGIC FUNCTIONS ---
  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setCode(getStarterTemplate(newLang));
    if (serviceRef.current) {
      serviceRef.current.setLanguage(newLang);
    }
  };

  const runCode = async () => {
      setConsoleOutput("Running tests...");
      setError(null);
      setSuccess(false);

      try {
        const result = await QuestionService.executeCode(code, problem, language);
        let out = result.passed ? "✅ ALL TESTS PASSED!\n\n" : "❌ TESTS FAILED\n\n";
        out += `Summary: ${result.output}\n`;
        
        // ⭐️ SUPABASE INTEGRATION: If passed, increment the database
        if (result.passed) {
            setSuccess(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                console.log("Passed! Syncing with Supabase for:", user.id);
                const { error: rpcError } = await supabase.rpc('increment_solved', { user_id: user.id });
                if (rpcError) {
                    console.error("Supabase Sync Error:", rpcError);
                } else {
                    out += "\n🏆 Progress saved! Your Dashboard stats have been updated.";
                }
            }
        }

        result.details.forEach((d, i) => {
            out += `\nTest ${i+1}: ${d.passed ? 'PASS' : 'FAIL'}\nInput: ${d.input}\nExpected: ${d.expected}\nActual: ${d.actual}\n`;
        });
        setConsoleOutput(out);

      } catch (e: any) {
        setError(e.message || "Failed to run code.");
        setConsoleOutput("Error during execution.");
      }
  };

  const toggleVoice = async () => {
      if (isVoiceActive) {
          await serviceRef.current?.disconnect();
          setIsVoiceActive(false);
      } else {
          setError(null);
          try {
              serviceRef.current?.setLanguage(language);
              await serviceRef.current?.connect(
                  `You are an expert coding tutor. Problem: ${problem.title}. Difficulty: ${problem.difficulty}. User is using ${getLanguageConfig(language).name}.`,
                  'MENTOR'
              );
              setIsVoiceActive(true);
          } catch (e: any) {
              setError("Failed to connect to AI Tutor.");
          }
      }
  };

  const handleSendTranscript = async (transcript: string) => {
    if (serviceRef.current && isVoiceActive) {
      setWhiteboard(prev => prev + `\n\n**You asked:** "${transcript}"`);
      await serviceRef.current.sendContext(transcript);
    }
  };

  const renderMarkdown = (text: string) => ({ __html: marked.parse(text) as string });

  return (
    <div className="h-screen w-full bg-[#020617] flex flex-col font-sans overflow-hidden text-slate-200">
        
        {/* Error/Success Toasts */}
        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError(null)} className="ml-2 hover:text-red-300">&times;</button>
          </div>
        )}
        {success && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm animate-bounce">
            <CheckCircle2 size={16} /> Problem Solved! +10 XP
          </div>
        )}

        <header className="h-14 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between px-4 shrink-0 z-20">
          <div className="flex items-center gap-4 min-w-0">
             <button onClick={onBack} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">
                 <ArrowLeft size={18} />
             </button>
             <div className="flex flex-col min-w-0">
                 <h2 className="text-white font-semibold text-sm truncate flex items-center gap-2">
                     {problem.title} 
                     <span className={`px-1.5 py-0.5 text-[10px] rounded border ${problem.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                        {problem.difficulty}
                     </span>
                 </h2>
             </div>
             
             <div className="ml-2">
               <LanguageSelector 
                 selectedLanguage={language} 
                 onLanguageChange={handleLanguageChange}
                 disabled={isVoiceActive}
               />
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             {isVoiceActive && (
                <div className="flex gap-0.5 items-center h-4 mx-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${Math.max(20, volume * 100)}%` }} />
                    ))}
                </div>
             )}

             <button 
                onClick={toggleVoice}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                    isVoiceActive ? 'bg-red-500/10 text-red-500 border border-red-500/50' : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/20'
                }`}
             >
                 {isVoiceActive ? <><MicOff size={14}/> End Tutor</> : <><Mic size={14}/> AI Tutor</>}
             </button>
             
             <button 
               onClick={runCode}
               className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all active:scale-95"
             >
                 <Play size={14} fill="currentColor" /> Run Code
             </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Problem Column */}
          <div className={`w-[25%] min-w-[300px] bg-[#0f172a] border-r border-slate-800 flex flex-col transition-all duration-500 ${activeSection === 'problem' ? 'ring-2 ring-indigo-500 z-10' : ''}`}>
              <div className="flex-1 overflow-y-auto p-6 prose prose-invert prose-sm max-w-none custom-scrollbar">
                  <div dangerouslySetInnerHTML={renderMarkdown(problem.description)} />
              </div>
          </div>

          {/* Visualizer Column */}
          <div className={`w-[35%] bg-[#0B1120] border-r border-slate-800 flex flex-col relative transition-all duration-500 ${activeSection === 'visualizer' ? 'ring-2 ring-indigo-500 z-10' : ''}`}>
              <div className="flex items-center gap-1 p-1 bg-[#111827] border-b border-slate-800">
                <button onClick={() => setActiveTab('WHITEBOARD')} className={`flex-1 py-1.5 rounded text-xs font-medium ${activeTab === 'WHITEBOARD' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500'}`}>Scratchpad</button>
                <button onClick={() => setActiveTab('MINDMAP')} className={`flex-1 py-1.5 rounded text-xs font-medium ${activeTab === 'MINDMAP' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500'}`}>Map</button>
                <button onClick={() => setActiveTab('FLOWCHART')} className={`flex-1 py-1.5 rounded text-xs font-medium ${activeTab === 'FLOWCHART' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500'}`}>Flow</button>
              </div>

              <div className="flex-1 overflow-hidden relative w-full h-full">
                  <div className="absolute inset-0 w-full h-full">
                    {activeTab === 'MINDMAP' && (mindmap ? <Mermaid chart={mindmap} /> : <EmptyVisualizer label="No Mind Map" />)}
                    {activeTab === 'FLOWCHART' && (flowchart ? <Mermaid chart={flowchart} /> : <EmptyVisualizer label="No Flowchart" />)}
                    {activeTab === 'WHITEBOARD' && (
                        <div className="p-6 prose prose-invert prose-sm max-w-none h-full overflow-y-auto custom-scrollbar">
                            <div dangerouslySetInnerHTML={renderMarkdown(whiteboard)} />
                        </div>
                    )}
                  </div>

                  <div 
                    className="absolute w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.6)] pointer-events-none transition-all duration-300 ease-out z-50"
                    style={{ left: `${aiCursor.x}%`, top: `${aiCursor.y}%`, opacity: isVoiceActive ? 1 : 0 }}
                  >
                     <div className="absolute w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></div>
                  </div>
              </div>

              {isVoiceActive && (
                <div className="p-3 border-t border-slate-800 bg-[#0f172a]">
                  <SpeechInput onSend={handleSendTranscript} isConnected={isVoiceActive} />
                </div>
              )}
          </div>

          {/* Editor Column */}
          <div className={`flex-1 flex flex-col relative bg-[#1e1e1e] transition-all duration-500 ${activeSection === 'editor' ? 'ring-2 ring-indigo-500 z-10' : ''}`}>
              <div className="flex-1 flex flex-col min-h-0">
                  <div className="bg-[#1e1e1e] text-[10px] text-slate-500 px-4 py-1 flex justify-between items-center border-b border-slate-800">
                      <span>{FILE_EXTENSIONS[language]}</span>
                      <span className="text-emerald-500">Auto-syncing to DB</span>
                  </div>
                  <CodeEditor 
                    code={code} 
                    language={getLanguageConfig(language).prismLanguage} 
                    onChange={setCode}
                    activeLine={activeLine} 
                  />
              </div>
              <div className={`h-[30%] min-h-[150px] bg-[#0f172a] border-t border-slate-800 flex flex-col ${activeSection === 'console' ? 'ring-2 ring-indigo-500' : ''}`}>
                  <div className="px-3 py-1 border-b border-slate-800 text-[10px] text-slate-400 font-bold flex items-center gap-2 bg-slate-900">
                      <Terminal size={10} /> CONSOLE
                  </div>
                  <pre className="flex-1 p-3 font-mono text-xs text-slate-300 overflow-auto whitespace-pre-wrap leading-relaxed">
                      {consoleOutput}
                  </pre>
              </div>
          </div>
        </div>
    </div>
  );
};

const EmptyVisualizer = ({ label }: { label: string }) => (
  <div className="flex h-full items-center justify-center text-slate-600 text-xs flex-col gap-2">
    <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center opacity-20">
      <RotateCcw size={20} />
    </div>
    {label}
  </div>
);