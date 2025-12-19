import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { floatTo16BitPCM, base64ToArrayBuffer, arrayBufferToBase64 } from "./audioUtils";
import { ToolContext } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

export class GeminiLiveService {
  private client: GoogleGenAI | null = null;
  private session: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private inputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private toolHandler: ToolContext;
  private onVolumeChange: ((vol: number) => void) | null = null;
  private language: string = 'javascript';

  constructor(toolHandler: ToolContext, onVolumeChange?: (vol: number) => void) {
    this.toolHandler = toolHandler;
    this.onVolumeChange = onVolumeChange || null;
  }

  setLanguage(language: string) {
    this.language = language;
  }

  async connect(systemInstruction: string, mode: 'MENTOR' | 'PROFILE' = 'MENTOR') {
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) as string;
    if (!apiKey) {
      throw new Error('API key not configured. Please check environment variables.');
    }
    this.client = new GoogleGenAI({ apiKey });
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const mentorTools: FunctionDeclaration[] = [
      {
        name: "update_mindmap",
        description: "Updates the mermaid mindmap visualization to explain a concept.",
        parameters: {
          type: Type.OBJECT,
          properties: { content: { type: Type.STRING, description: "Mermaid mindmap syntax (e.g., mindmap\\n root((Core))...)" } },
          required: ["content"]
        }
      },
      {
        name: "update_flowchart",
        description: "Updates the mermaid flowchart to visualize logic flow.",
        parameters: {
          type: Type.OBJECT,
          properties: { content: { type: Type.STRING, description: "Mermaid graph syntax (e.g., graph TD; A-->B;)" } },
          required: ["content"]
        }
      },
      {
        name: "update_whiteboard",
        description: "Writes text notes or bullet points to the whiteboard. Use Markdown.",
        parameters: {
          type: Type.OBJECT,
          properties: { content: { type: Type.STRING, description: "Markdown content" } },
          required: ["content"]
        }
      },
      {
        name: "write_code",
        description: "Writes or updates code in the editor.",
        parameters: {
          type: Type.OBJECT,
          properties: { code: { type: Type.STRING, description: "Source code to display" } },
          required: ["code"]
        }
      },
      {
        name: "set_active_line",
        description: "Highlights a specific line number in the code editor to focus attention.",
        parameters: {
          type: Type.OBJECT,
          properties: { line: { type: Type.NUMBER, description: "Line number (1-based)" } },
          required: ["line"]
        }
      },
      {
        name: "move_cursor",
        description: "Moves the AI visual cursor to specific coordinates on the diagram/visualizer.",
        parameters: {
          type: Type.OBJECT,
          properties: { 
            x: { type: Type.NUMBER, description: "X percentage (0-100)" },
            y: { type: Type.NUMBER, description: "Y percentage (0-100)" }
          },
          required: ["x", "y"]
        }
      },
      {
        name: "show_topic_info",
        description: "Shows a pop-up card with definition or details about a topic.",
        parameters: {
          type: Type.OBJECT,
          properties: { 
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      },
      {
        name: "change_problem",
        description: "Generates a NEW coding problem based on user request. Use when user asks for a different problem, specific topic, or difficulty change.",
        parameters: {
          type: Type.OBJECT,
          properties: { 
            topic: { type: Type.STRING, description: "Topic requested (e.g., 'Graphs', 'React', 'Arrays')" },
            difficulty: { type: Type.STRING, description: "Difficulty (Easy, Medium, Hard)" }
          },
          required: ["topic", "difficulty"]
        }
      },
      {
        name: "highlight_section",
        description: "Visually highlights a major section of the screen to guide user attention.",
        parameters: {
          type: Type.OBJECT,
          properties: { 
            section: { type: Type.STRING, enum: ["problem", "visualizer", "editor", "console"], description: "The UI section to highlight" }
          },
          required: ["section"]
        }
      }
    ];

    const profileTools: FunctionDeclaration[] = [
      {
        name: "update_profile",
        description: "Updates the user's profile information based on the conversation.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            role: { type: Type.STRING },
            bio: { type: Type.STRING },
            goals: { type: Type.ARRAY, items: { type: Type.STRING } },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            swot: {
              type: Type.OBJECT,
              properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                threats: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    ];

    const languageContext = `The user is working in ${this.language}. Provide all code examples and explanations in ${this.language}.`;
    const enhancedInstruction = `${systemInstruction}\n\n${languageContext}`;

    const config = {
      model: MODEL_NAME,
      systemInstruction: enhancedInstruction,
      tools: [{ functionDeclarations: mode === 'PROFILE' ? profileTools : mentorTools }],
      responseModalities: [Modality.AUDIO],
    };

    this.session = this.client.live.connect({
      model: MODEL_NAME,
      config,
      callbacks: {
        onopen: async () => {
            console.log("Connection Opened");
            await this.startAudioInput();
        },
        onmessage: async (message: LiveServerMessage) => {
            await this.handleMessage(message);
        },
        onclose: () => {
            console.log("Connection Closed");
            this.stopAudio();
        },
        onerror: (err) => {
            console.error("Connection Error", err);
            this.stopAudio();
        }
      }
    });
    
    return this.session;
  }

  private async startAudioInput() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true
    }});

    this.inputAudioContext = new AudioContext({ sampleRate: 16000 });
    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
        if (!this.session) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        if (this.onVolumeChange) {
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            this.onVolumeChange(Math.min(1, rms * 5));
        }

        const pcm16 = floatTo16BitPCM(inputData);
        const base64 = arrayBufferToBase64(pcm16);
        
        this.session.then(session => {
             session.sendRealtimeInput({
                media: {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64
                }
            });
        }).catch(e => {
        });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
      const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
      if (audioData && this.audioContext) {
          try {
              const buffer = base64ToArrayBuffer(audioData);
              const pcmData = new Int16Array(buffer);
              const float32Data = new Float32Array(pcmData.length);
              
              for (let i = 0; i < pcmData.length; i++) {
                  float32Data[i] = pcmData[i] / 32768.0;
              }

              const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
              audioBuffer.getChannelData(0).set(float32Data);
              
              this.nextStartTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
              const source = this.audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.audioContext.destination);
              source.start(this.nextStartTime);
              this.nextStartTime += audioBuffer.duration;
          } catch (e) {
              console.error("Audio processing error", e);
          }
      }

      if (message.toolCall) {
          for (const fc of message.toolCall.functionCalls) {
              let result: { status: string; message?: string } = { status: 'ok' };
              try {
                if (fc.name === 'update_mindmap') this.toolHandler.updateMindmap(fc.args.content as string);
                if (fc.name === 'update_flowchart') this.toolHandler.updateFlowchart(fc.args.content as string);
                if (fc.name === 'update_whiteboard') this.toolHandler.updateWhiteboard(fc.args.content as string);
                if (fc.name === 'write_code') this.toolHandler.writeCode(fc.args.code as string);
                if (fc.name === 'set_active_line') this.toolHandler.setActiveLine(fc.args.line as number);
                if (fc.name === 'move_cursor') this.toolHandler.moveCursor(fc.args.x as number, fc.args.y as number);
                if (fc.name === 'show_topic_info') this.toolHandler.showTopicInfo(fc.args.title as string, fc.args.description as string);
                if (fc.name === 'change_problem') await this.toolHandler.changeProblem(fc.args.topic as string, fc.args.difficulty as string);
                if (fc.name === 'highlight_section') this.toolHandler.highlightSection(fc.args.section as any);
                if (fc.name === 'update_profile' && this.toolHandler.updateProfile) this.toolHandler.updateProfile(fc.args as any);
              } catch (e) {
                  console.error("Tool execution error", e);
                  result = { status: 'error', message: JSON.stringify(e) };
              }

              if (this.session) {
                  this.session.then(session => {
                      session.sendToolResponse({
                          functionResponses: [{
                              id: fc.id,
                              name: fc.name,
                              response: { result }
                          }]
                      });
                  }).catch(e => console.error("Error sending tool response", e));
              }
          }
      }
  }

  async disconnect() {
      this.stopAudio();
      this.session = null;
  }

  private stopAudio() {
    if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
    }
    if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
    }
    if (this.inputSource) {
        this.inputSource.disconnect();
        this.inputSource = null;
    }
    if (this.inputAudioContext) {
        this.inputAudioContext.close();
        this.inputAudioContext = null;
    }
    if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
    }
  }

  async sendContext(text: string) {
      if (this.session) {
          this.session.then((s: any) => {
              s.sendRealtimeInput({
                  content: { parts: [{ text }] }
              });
          });
      }
  }
}
