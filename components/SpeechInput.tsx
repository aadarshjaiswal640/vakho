import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send, RotateCcw, Edit3, Loader2 } from 'lucide-react';

interface SpeechInputProps {
  onSend: (transcript: string) => Promise<void>;
  isConnected: boolean;
  placeholder?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const SpeechInput: React.FC<SpeechInputProps> = ({ 
  onSend, 
  isConnected,
  placeholder = "Click the mic to start speaking..."
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [speechEnded, setSpeechEnded] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldRestartRef = useRef(false);

  const clearTimeouts = () => {
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
    if (speechEndTimeoutRef.current) {
      clearTimeout(speechEndTimeoutRef.current);
      speechEndTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimeouts();
      if (recognitionRef.current) {
        shouldRestartRef.current = false;
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (speechEnded && transcript.trim() && !hasUserEdited && !isSending && !isEditing) {
      autoSendTimeoutRef.current = setTimeout(() => {
        sendTranscript();
      }, 1500);
    }
    return () => {
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current);
      }
    };
  }, [speechEnded, transcript, hasUserEdited, isSending, isEditing]);

  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript(prev => prev + final);
        setInterimTranscript('');
        setSpeechEnded(false);
        
        if (speechEndTimeoutRef.current) {
          clearTimeout(speechEndTimeoutRef.current);
        }
        speechEndTimeoutRef.current = setTimeout(() => {
          setSpeechEnded(true);
        }, 2500);
      } else {
        setInterimTranscript(interim);
        setSpeechEnded(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
      setIsListening(false);
      shouldRestartRef.current = false;
    };

    recognition.onend = () => {
      if (shouldRestartRef.current && isListening && !isEditing && !isSending) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onspeechend = () => {
      if (speechEndTimeoutRef.current) {
        clearTimeout(speechEndTimeoutRef.current);
      }
      speechEndTimeoutRef.current = setTimeout(() => {
        setSpeechEnded(true);
      }, 1000);
    };

    return recognition;
  }, [isListening, isEditing, isSending]);

  const startListening = () => {
    if (!isConnected || isSending) return;
    
    setSpeechEnded(false);
    setHasUserEdited(false);
    setIsEditing(false);
    clearTimeouts();
    
    const recognition = initRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      shouldRestartRef.current = true;
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
    clearTimeouts();
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim() && !hasUserEdited) {
        setSpeechEnded(true);
      }
    } else {
      startListening();
    }
  };

  const sendTranscript = async () => {
    if (!transcript.trim() || isSending) return;
    
    stopListening();
    setSpeechEnded(false);
    setIsSending(true);
    clearTimeouts();
    
    try {
      await onSend(transcript.trim());
      setTranscript('');
      setHasUserEdited(false);
    } catch (error) {
      console.error('Error sending to Gemini:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = () => {
    setTranscript('');
    setInterimTranscript('');
    setHasUserEdited(false);
    setSpeechEnded(false);
    clearTimeouts();
    startListening();
  };

  const handleClear = () => {
    stopListening();
    setTranscript('');
    setInterimTranscript('');
    setHasUserEdited(false);
    setSpeechEnded(false);
    clearTimeouts();
  };

  const handleEditClick = () => {
    stopListening();
    setIsEditing(true);
    setHasUserEdited(true);
    setSpeechEnded(false);
    clearTimeouts();
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleEditDone = () => {
    setIsEditing(false);
  };

  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscript(e.target.value);
    setHasUserEdited(true);
    setSpeechEnded(false);
    clearTimeouts();
  };

  const displayText = transcript + interimTranscript;
  const hasContent = displayText.trim().length > 0;

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-xl p-4 space-y-3">
      {isSending && (
        <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-medium">Sending to Gemini...</span>
        </div>
      )}

      <div className="relative">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={transcript}
              onChange={handleTranscriptChange}
              className="w-full min-h-[80px] p-3 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Edit your message..."
            />
            <button
              onClick={handleEditDone}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Done editing
            </button>
          </div>
        ) : (
          <div 
            className={`min-h-[80px] p-3 bg-slate-800/50 rounded-lg text-sm ${hasContent ? 'text-white' : 'text-slate-500'}`}
          >
            {hasContent ? (
              <>
                <span>{transcript}</span>
                {interimTranscript && (
                  <span className="text-slate-400 italic">{interimTranscript}</span>
                )}
              </>
            ) : (
              <span>{placeholder}</span>
            )}
            {isListening && (
              <span className="inline-block w-2 h-4 bg-indigo-500 ml-1 animate-pulse" />
            )}
          </div>
        )}

        {isListening && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className="flex gap-0.5 items-end h-4">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i}
                  className="w-1 bg-red-500 rounded-full animate-pulse"
                  style={{ 
                    height: `${8 + Math.random() * 8}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] text-red-400 font-bold uppercase ml-1">LIVE</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={toggleListening}
          disabled={!isConnected || isSending || isEditing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            isListening
              ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {isListening ? (
            <>
              <MicOff size={16} />
              Stop
            </>
          ) : (
            <>
              <Mic size={16} />
              Speak
            </>
          )}
        </button>

        {hasContent && !isListening && !isEditing && (
          <button
            onClick={sendTranscript}
            disabled={isSending || !transcript.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Send
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {hasContent && !isEditing && (
            <button
              onClick={handleEditClick}
              disabled={isSending}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <Edit3 size={14} />
              Edit
            </button>
          )}

          <button
            onClick={hasContent ? handleClear : handleRetry}
            disabled={isSending}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RotateCcw size={14} />
            {hasContent ? 'Clear' : 'Retry'}
          </button>
        </div>
      </div>

      {!hasUserEdited && transcript.trim() && speechEnded && !isSending && !isEditing && (
        <p className="text-xs text-amber-400/80 text-center animate-pulse">
          Auto-sending in a moment... Click Edit to make changes.
        </p>
      )}

      {!isConnected && (
        <p className="text-xs text-amber-400/80 text-center">
          Connect to the session first to enable voice input
        </p>
      )}
    </div>
  );
};
