import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Brain, Activity, FileText, ArrowLeft, Info, Sparkles, AlertCircle } from 'lucide-react';
import { GeminiLiveService } from '../services/geminiService';
import { CodeEditor } from './CodeEditor';
import { Mermaid } from './Mermaid';
import { SpeechInput } from './SpeechInput';
import { LanguageSelector } from './LanguageSelector';
import { ToolContext } from '../types';
import { SupportedLanguage, getLanguageConfig, getStarterTemplate } from '../services/languageTemplates';
import { marked } from 'marked';

interface MentorWorkspaceProps {
  onBack: () => void;
}

const FILE_NAMES: Record<SupportedLanguage, string> = {
  javascript: 'main.js',
  python: 'main.py',
  c: 'main.c',
  cpp: 'main.cpp',
  java: 'Main.java'
};

export const MentorWorkspace: React.FC<MentorWorkspaceProps> = ({ onBack }) => {
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [activeTab, setActiveTab] = useState<'MINDMAP' | 'FLOWCHART' | 'WHITEBOARD'>('WHITEBOARD');
  const [language, setLanguage] = useState<SupportedLanguage>('javascript');
  const [error, setError] = useState<string | null>(null);
  
  const [mindmap, setMindmap] = useState("");
  const [flowchart, setFlowchart] = useState("");
  const [whiteboard, setWhiteboard] = useState("");
  
  const [code, setCode] = useState(getStarterTemplate('javascript'));
  const [activeLine, setActiveLine] = useState<number | undefined>(undefined);
  const [aiCursor, setAiCursor] = useState({ x: 50, y: 50 });
  const [infoCard, setInfoCard] = useState<{title: string, desc: string} | null>(null);
  const [aiTextResponse, setAiTextResponse] = useState<string>('');

  const serviceRef = useRef<GeminiLiveService | null>(null);

  useEffect(() => {
    const toolHandlers: ToolContext = {
      updateMindmap: (c) => { setMindmap(c); setActiveTab('MINDMAP'); },
      updateFlowchart: (c) => { setFlowchart(c); setActiveTab('FLOWCHART'); },
      updateWhiteboard: (c) => { setWhiteboard(c); setActiveTab('WHITEBOARD'); },
      writeCode: (c) => setCode(c),
      setActiveLine: (l) => setActiveLine(l),
      moveCursor: (x, y) => setAiCursor({ x, y }),
      showTopicInfo: (title, description) => {
          setInfoCard({ title, desc: description });
          setTimeout(() => setInfoCard(null), 8000);
      },
      changeProblem: async (t, d) => { console.log("Ignore in mentor mode"); },
      highlightSection: (s) => { console.log("Highlight", s); },
    };
    
    serviceRef.current = new GeminiLiveService(toolHandlers, (vol) => setVolume(vol));

    return () => {
      serviceRef.current?.disconnect();
    };
  }, []);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setCode(getStarterTemplate(newLang));
    if (serviceRef.current) {
      serviceRef.current.setLanguage(newLang);
    }
  };

  const toggleSession = async () => {
    if (connected) {
      await serviceRef.current?.disconnect();
      setConnected(false);
      setVolume(0);
      setAiTextResponse('');
    } else {
      setError(null);
      try {
        setWhiteboard("# Connection Established\n\nI am listening. Ask me about any coding concept!");
        setActiveTab('WHITEBOARD');
        serviceRef.current?.setLanguage(language);
        await serviceRef.current?.connect(
            `You are Professor Spark, a Socratic Coding Mentor. The user is coding in ${getLanguageConfig(language).name}. 
            1. PRIORITIZE VISUALS: Start every explanation by drawing a mindmap (\`update_mindmap\`) or flowchart (\`update_flowchart\`). 
            2. BE INTERACTIVE: Ask the user questions. 
            3. USE TOOLS: When explaining code, use \`write_code\` and \`set_active_line\` to guide them. 
            4. WHITEBOARD: Use \`update_whiteboard\` for bulleted summaries. 
            5. Move the cursor (\`move_cursor\`) to point at parts of the diagram while speaking.
            6. All code examples should be in ${getLanguageConfig(language).name}.`,
            'MENTOR'
        );
        setConnected(true);
      } catch (e: any) {
        setError(e.message || "Failed to connect. Please check your connection and try again.");
        console.error(e);
      }
    }
  };

  const handleSendTranscript = async (transcript: string) => {
    if (serviceRef.current && connected) {
      setWhiteboard(prev => prev + `\n\n**You said:** "${transcript}"\n\n*(AI is responding via audio)*`);
      await serviceRef.current.sendContext(transcript);
    }
  };

  const renderMarkdown = (text: string) => {
      return { __html: marked.parse(text) as string };
  };

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col font-sans overflow-hidden">
      
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm animate-in slide-in-from-top">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-2 hover:text-red-300">&times;</button>
        </div>
      )}

      <header className="h-16 border-b border-slate-800 bg-[#020617] flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
           <button 
             onClick={onBack} 
             className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
           >
             <ArrowLeft size={18} />
           </button>
           <div>
               <h2 className="text-white font-bold flex items-center gap-2">
                   <Sparkles size={16} className="text-indigo-400" /> 
                   Professor Spark
               </h2>
               <p className="text-xs text-slate-500">AI Coding Mentor</p>
           </div>
           
           <div className="ml-4">
             <LanguageSelector 
               selectedLanguage={language} 
               onLanguageChange={handleLanguageChange}
               disabled={connected}
             />
           </div>
        </div>
        
        <div className="flex items-center gap-6">
            {connected ? (
                <div className="flex items-center gap-4 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full">
                     <span className="relative flex h-3 w-3">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                     </span>
                     <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">Live Session</span>
                     <div className="flex gap-1 items-center h-4 w-12 justify-center">
                        {[...Array(4)].map((_, i) => (
                            <div 
                                key={i} 
                                className="w-1 bg-indigo-500 rounded-full transition-all duration-75"
                                style={{ height: `${Math.max(20, volume * 100 * (Math.random() + 0.5))}%` }} 
                            />
                        ))}
                     </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                    <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    Offline
                </div>
            )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        <div className="w-2/3 border-r border-slate-800 flex flex-col relative bg-[#0B1120]">
            
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-1 p-1.5 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl shadow-xl">
                <button onClick={() => setActiveTab('WHITEBOARD')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'WHITEBOARD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <FileText size={16} /> <span className="hidden sm:inline">Notes</span>
                </button>
                <button onClick={() => setActiveTab('MINDMAP')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'MINDMAP' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Brain size={16} /> <span className="hidden sm:inline">Map</span>
                </button>
                <button onClick={() => setActiveTab('FLOWCHART')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'FLOWCHART' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Activity size={16} /> <span className="hidden sm:inline">Flow</span>
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative w-full h-full">
                
                {!connected && !whiteboard && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
                            <Sparkles size={40} className="text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-300 mb-2">Professor Spark is Offline</h3>
                        <p className="max-w-md">Connect to the session to start exploring concepts. The AI will use this canvas to draw diagrams and write notes in real-time.</p>
                    </div>
                )}

                <div className={`w-full h-full transition-opacity duration-500 ${!connected && !whiteboard ? 'opacity-0' : 'opacity-100'}`}>
                    {activeTab === 'MINDMAP' && (mindmap ? <Mermaid chart={mindmap} /> : <div className="flex h-full items-center justify-center text-slate-600 text-sm">Waiting for diagram...</div>)}
                    {activeTab === 'FLOWCHART' && (flowchart ? <Mermaid chart={flowchart} /> : <div className="flex h-full items-center justify-center text-slate-600 text-sm">Waiting for diagram...</div>)}
                    {activeTab === 'WHITEBOARD' && (
                        <div className="p-12 prose prose-invert prose-lg max-w-4xl mx-auto pt-24 h-full overflow-y-auto custom-scrollbar">
                            {whiteboard ? <div dangerouslySetInnerHTML={renderMarkdown(whiteboard)} /> : <div className="text-slate-600 text-center mt-20">Notes will appear here...</div>}
                        </div>
                    )}
                </div>
                
                <div 
                    className="absolute w-6 h-6 pointer-events-none transition-all duration-300 ease-out z-50 flex items-center justify-center"
                    style={{ left: `${aiCursor.x}%`, top: `${aiCursor.y}%`, opacity: connected ? 1 : 0 }}
                >
                     <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.8)] relative">
                        <div className="absolute -inset-2 bg-red-500/30 rounded-full animate-ping"></div>
                     </div>
                     <div className="absolute top-4 left-4 bg-red-500/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">Spark</div>
                </div>

                {infoCard && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-indigo-500/30 p-5 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 max-w-md w-full">
                        <div className="flex items-start gap-3">
                            <Info className="text-indigo-400 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">{infoCard.title}</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">{infoCard.desc}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="w-1/3 flex flex-col bg-[#1e1e1e] border-l border-slate-800">
            <div className="bg-[#1e1e1e] text-xs text-slate-500 px-4 py-2 flex justify-between items-center border-b border-slate-700/50">
                <span className="font-mono">{FILE_NAMES[language]}</span>
                <span>{getLanguageConfig(language).name}</span>
            </div>
            <div className="flex-1 relative">
                <CodeEditor 
                  code={code} 
                  language={getLanguageConfig(language).prismLanguage} 
                  onChange={setCode} 
                  activeLine={activeLine} 
                />
            </div>
            <div className="p-4 bg-[#0f172a] border-t border-slate-800 space-y-3">
                {connected && (
                  <SpeechInput 
                    onSend={handleSendTranscript}
                    isConnected={connected}
                    placeholder="Click the mic to speak, or just talk - live audio is active..."
                  />
                )}
                <button 
                    onClick={toggleSession}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-lg hover:shadow-xl ${
                        connected 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
                        : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-500/20'
                    }`}
                >
                    {connected ? <><Square size={20} fill="currentColor" /> End Session</> : <><Mic size={24} /> Start Mentor Session</>}
                </button>
                <p className="text-center text-xs text-slate-500">
                    {connected ? "Live audio active. Use the transcript box above for text input." : "Ready to connect to AI Mentor"}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
