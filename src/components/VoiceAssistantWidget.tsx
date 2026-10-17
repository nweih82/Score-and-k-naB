import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, HelpCircle, Sparkles, CheckCircle2, AlertCircle, X, Radio, Send, Keyboard, ExternalLink, Repeat, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface VoiceCommandResult {
  actionType: 'bank' | 'farkle' | 'add_turn_points' | 'score_category' | 'yahtzee_bonus' | 'query_score' | 'undo' | 'unknown';
  points?: number | null;
  category?: string | null;
  spokenFeedback?: string;
  source: 'voice';
}

interface VoiceAssistantProps {
  gameType: 'farkle' | 'yahtzee';
  activePlayerName: string;
  gameSummaryText?: string;
  onExecuteCommand: (result: VoiceCommandResult) => void;
  className?: string;
}

export const VoiceAssistantWidget: React.FC<VoiceAssistantProps> = ({
  gameType,
  activePlayerName,
  gameSummaryText,
  onExecuteCommand,
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [continuousMode, setContinuousMode] = useState<boolean>(() => {
    return localStorage.getItem('scorekeeper_voice_continuous') === 'true';
  });
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [typedInput, setTypedInput] = useState<string>('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<{ text: string; success: boolean; isPermissionError?: boolean } | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const continuousModeRef = useRef<boolean>(continuousMode);

  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Text-To-Speech Helper
  const speakText = (text: string) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop any previous ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const initRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setShowTextInput(true);
      setLastFeedback({
        text: 'Speech recognition unavailable in iframe/browser. Type your command below!',
        success: false,
        isPermissionError: true,
      });
      isListeningRef.current = false;
      setIsListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = continuousModeRef.current;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setLiveTranscript('');
        setLastFeedback(null);
      };

      recognition.onresult = (event: any) => {
        let finalPhrase = '';
        let interimPhrase = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalPhrase += event.results[i][0].transcript;
          } else {
            interimPhrase += event.results[i][0].transcript;
          }
        }

        const currentSpoken = (finalPhrase || interimPhrase).trim();
        if (currentSpoken) {
          setLiveTranscript(currentSpoken);
        }

        if (finalPhrase.trim()) {
          const phraseToProcess = finalPhrase.trim();
          if (!continuousModeRef.current) {
            isListeningRef.current = false;
            setIsListening(false);
            try { recognition.stop(); } catch {}
          }
          processTranscript(phraseToProcess);
        }
      };

      recognition.onerror = (event: any) => {
        const errType = event.error;
        if (errType === 'not-allowed' || errType === 'service-not-allowed' || errType === 'audio-capture') {
          isListeningRef.current = false;
          setIsListening(false);
          setShowTextInput(true);
          setLastFeedback({
            text: 'Microphone permission restricted by iframe/browser policy. Type command below or open in new tab!',
            success: false,
            isPermissionError: true,
          });
        } else if (errType === 'no-speech') {
          // If in continuous mode, no-speech is normal while waiting for players to speak
        } else {
          if (!continuousModeRef.current) {
            isListeningRef.current = false;
            setIsListening(false);
          }
          setLastFeedback({
            text: `Microphone error (${errType}). Still listening...`,
            success: false,
          });
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current && continuousModeRef.current) {
          // Seamlessly restart for continuous listening
          setTimeout(() => {
            if (isListeningRef.current && continuousModeRef.current) {
              try {
                recognition.start();
              } catch {
                setTimeout(() => {
                  if (isListeningRef.current && continuousModeRef.current) {
                    try { recognition.start(); } catch {}
                  }
                }, 300);
              }
            }
          }, 150);
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
    } catch (err: any) {
      isListeningRef.current = false;
      setIsListening(false);
      setShowTextInput(true);
      setLastFeedback({
        text: 'Microphone restricted in iframe. Type command below or open in a new tab!',
        success: false,
        isPermissionError: true,
      });
    }
  };

  const handleStartListening = () => {
    if (isListening) {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      return;
    }

    isListeningRef.current = true;
    initRecognition();
  };

  const toggleContinuousMode = () => {
    const nextVal = !continuousMode;
    setContinuousMode(nextVal);
    continuousModeRef.current = nextVal;
    localStorage.setItem('scorekeeper_voice_continuous', String(nextVal));

    if (isListening) {
      // Re-init with new mode
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      setTimeout(() => {
        if (isListeningRef.current) {
          initRecognition();
        }
      }, 150);
    }
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedInput.trim()) return;
    const textToRun = typedInput;
    setTypedInput('');
    processTranscript(textToRun);
  };

  const handleQuickChip = (chipText: string) => {
    processTranscript(chipText);
  };

  // Process voice transcript with Gemini NLU & local fallback
  const processTranscript = async (transcript: string) => {
    if (!transcript || transcript.trim().length === 0) return;
    setIsProcessing(true);

    const cleanText = transcript.toLowerCase().trim();

    try {
      // 1. Try Gemini API NLU server route first
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: cleanText,
          gameType,
          gameState: { activePlayerName },
        }),
      });

      const data = await response.json();

      if (data.success && data.intent && data.intent.actionType !== 'unknown') {
        const intent = data.intent;
        const feedback = intent.spokenFeedback || `Executed command: ${intent.actionType}`;
        setLastFeedback({ text: feedback, success: true });
        speakText(feedback);

        onExecuteCommand({
          actionType: intent.actionType,
          points: intent.points,
          category: intent.category,
          spokenFeedback: feedback,
          source: 'voice',
        });
        setIsProcessing(false);
        return;
      }
    } catch (e) {
      console.log('Gemini voice NLU server unavailable or failed, using local rule engine...');
    }

    // 2. Local fallback rule engine
    const localResult = parseLocalVoiceCommand(cleanText, gameType, activePlayerName, gameSummaryText);
    setIsProcessing(false);

    if (localResult) {
      setLastFeedback({ text: localResult.spokenFeedback || 'Command recognized!', success: true });
      if (localResult.spokenFeedback) speakText(localResult.spokenFeedback);
      onExecuteCommand(localResult);
    } else {
      const msg = `Could not understand "${transcript}". Tap 'Voice Guide' for example commands!`;
      setLastFeedback({ text: msg, success: false });
      speakText("Sorry, I didn't get that. Check the Voice Guide for examples.");
    }
  };

  // Local rule parsing engine for quick, offline, or fallback voice processing
  const parseLocalVoiceCommand = (
    text: string,
    type: 'farkle' | 'yahtzee',
    pName: string,
    summary?: string
  ): VoiceCommandResult | null => {
    // Score/Status Queries
    if (text.includes('score') || text.includes('winning') || text.includes('turn') || text.includes('standings') || text.includes('leader')) {
      const spokenMsg = summary ? summary : `It is currently ${pName}'s turn!`;
      return {
        actionType: 'query_score',
        spokenFeedback: spokenMsg,
        source: 'voice',
      };
    }

    // Undo
    if (text.includes('undo') || text.includes('take back')) {
      return {
        actionType: 'undo',
        spokenFeedback: `Undoing last action for ${pName}`,
        source: 'voice',
      };
    }

    if (type === 'farkle') {
      // Farkle / Bust
      if (text.includes('farkle') || text.includes('bust') || text.includes('zero') || text.includes('scratch')) {
        return {
          actionType: 'farkle',
          spokenFeedback: `Farkle recorded for ${pName}! 0 points logged.`,
          source: 'voice',
        };
      }

      // Bank Points
      if (text.includes('bank') || text.includes('keep') || text.includes('save')) {
        const match = text.match(/\d+/);
        if (match) {
          const pts = parseInt(match[0], 10);
          return {
            actionType: 'bank',
            points: pts,
            spokenFeedback: `Banked ${pts.toLocaleString()} points for ${pName}!`,
            source: 'voice',
          };
        } else {
          return {
            actionType: 'bank',
            points: null, // Use accrued turn score
            spokenFeedback: `Banking turn points for ${pName}!`,
            source: 'voice',
          };
        }
      }

      // Add turn points
      if (text.includes('add') || text.includes('plus') || text.includes('got')) {
        const match = text.match(/\d+/);
        if (match) {
          const pts = parseInt(match[0], 10);
          return {
            actionType: 'add_turn_points',
            points: pts,
            spokenFeedback: `Added ${pts.toLocaleString()} points to turn score`,
            source: 'voice',
          };
        }
      }
    } else if (type === 'yahtzee') {
      // Yahtzee bonus
      if (text.includes('bonus') || text.includes('extra yahtzee')) {
        return {
          actionType: 'yahtzee_bonus',
          points: 100,
          spokenFeedback: `Added 100 point Yahtzee Bonus for ${pName}!`,
          source: 'voice',
        };
      }

      // Category detection
      let matchedCategory: string | null = null;
      if (text.includes('ace') || text.includes('one')) matchedCategory = 'aces';
      else if (text.includes('two')) matchedCategory = 'twos';
      else if (text.includes('three') && !text.includes('kind')) matchedCategory = 'threes';
      else if (text.includes('four') && !text.includes('kind')) matchedCategory = 'fours';
      else if (text.includes('five')) matchedCategory = 'fives';
      else if (text.includes('six')) matchedCategory = 'sixes';
      else if (text.includes('full house')) matchedCategory = 'fullHouse';
      else if (text.includes('small straight')) matchedCategory = 'smallStraight';
      else if (text.includes('large straight')) matchedCategory = 'largeStraight';
      else if (text.includes('yahtzee')) matchedCategory = 'yahtzee';
      else if (text.includes('three of a kind') || text.includes('3 of a kind')) matchedCategory = 'threeOfAKind';
      else if (text.includes('four of a kind') || text.includes('4 of a kind')) matchedCategory = 'fourOfAKind';
      else if (text.includes('chance')) matchedCategory = 'chance';

      const isZero = text.includes('zero') || text.includes('scratch') || text.includes('none');
      const numMatch = text.match(/\d+/);

      let pts: number | null = isZero ? 0 : numMatch ? parseInt(numMatch[0], 10) : null;

      // Default scores for fixed categories if points not spoken
      if (matchedCategory && pts === null) {
        if (matchedCategory === 'fullHouse') pts = 25;
        else if (matchedCategory === 'smallStraight') pts = 30;
        else if (matchedCategory === 'largeStraight') pts = 40;
        else if (matchedCategory === 'yahtzee') pts = 50;
      }

      if (matchedCategory && pts !== null) {
        const catName = matchedCategory
          .replace(/([A-Z])/g, ' $1')
          .toLowerCase();
        return {
          actionType: 'score_category',
          category: matchedCategory,
          points: pts,
          spokenFeedback: pts === 0
            ? `Scratching ${catName} (0 pts) for ${pName}`
            : `Scored ${pts} points in ${catName} for ${pName}!`,
          source: 'voice',
        };
      }
    }

    return null;
  };

  const quickChips = gameType === 'farkle'
    ? ['Bank 500', 'Farkle', 'Add 150', 'Who is winning?']
    : ['Full House 25', 'Small Straight 30', 'Yahtzee 50', 'Scratch Fours', 'Who is leading?'];

  return (
    <div className={`relative ${className}`}>
      {/* Voice Assistant Header Card */}
      <div
        className={`bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-4 md:p-5 shadow-lg border transition-all duration-300 ${
          isListening && continuousMode
            ? 'border-emerald-400/80 ring-4 ring-emerald-500/25 shadow-emerald-500/20 shadow-xl'
            : isListening
            ? 'border-rose-400/70 ring-4 ring-rose-500/25 shadow-rose-500/20 shadow-xl'
            : 'border-purple-500/30'
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Subtle Pulsing Rings Feedback when listening */}
              {isListening && (
                <>
                  <span className="absolute -inset-2.5 rounded-3xl border-2 border-rose-400/40 animate-ping pointer-events-none" />
                  <span className="absolute -inset-1 rounded-2xl border-2 border-rose-300/50 animate-pulse pointer-events-none" />
                </>
              )}

              <button
                onClick={handleStartListening}
                disabled={isProcessing}
                className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-400/50 scale-105'
                    : isProcessing
                    ? 'bg-amber-500 text-white animate-spin'
                    : 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white'
                }`}
                title={isListening ? 'Stop Listening' : 'Start Voice Command'}
              >
                {isListening ? (
                  <Radio className="w-6 h-6 animate-bounce" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>
              {isListening && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 z-20">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm md:text-base tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-300" />
                  AI Voice Assistant
                </span>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-200 border border-purple-400/30 text-[9px] font-black uppercase rounded-full tracking-wider">
                  {gameType === 'farkle' ? 'Farkle Voice' : 'Yahtzee Voice'}
                </span>
                {continuousMode && (
                  <span className="px-2 py-0.5 bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 text-[9px] font-black uppercase rounded-full tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Continuous Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-200/80 font-medium">
                {isListening
                  ? continuousMode
                    ? `Continuous mode active: Listening for ${activePlayerName}... speak naturally!`
                    : `Listening for ${activePlayerName}... Say a score command!`
                  : isProcessing
                  ? 'Processing command...'
                  : `Tap mic or type command e.g. "${
                      gameType === 'farkle' ? 'Bank 500' : 'Full House 25'
                    }"`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Continuous Listening Toggle Button */}
            <button
              onClick={toggleContinuousMode}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                continuousMode
                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/60 hover:bg-emerald-500/40 ring-1 ring-emerald-400/30'
                  : 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30 hover:bg-indigo-500/30'
              }`}
              title={
                continuousMode
                  ? 'Continuous Listening is ON: Keeps mic open automatically across turns'
                  : 'Turn ON Continuous Listening: Keeps mic active for hands-free gameplay'
              }
            >
              <Repeat className={`w-4 h-4 ${continuousMode ? 'text-emerald-300' : ''}`} />
              <span className="hidden sm:inline">
                {continuousMode ? 'Continuous: ON' : 'Continuous: OFF'}
              </span>
            </button>

            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                showTextInput
                  ? 'bg-purple-500 text-white border-purple-400'
                  : 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30 hover:bg-indigo-500/30'
              }`}
              title="Type Command manually"
            >
              <Keyboard className="w-4 h-4" />
              <span className="hidden sm:inline">Type</span>
            </button>

            <button
              onClick={() => setSpeechEnabled(!speechEnabled)}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                speechEnabled
                  ? 'bg-purple-500/20 text-purple-200 border-purple-400/40 hover:bg-purple-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title={speechEnabled ? 'Mute Voice Responses' : 'Enable Voice Responses'}
            >
              {speechEnabled ? <Volume2 className="w-4 h-4 text-purple-300" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{speechEnabled ? 'Voice On' : 'Muted'}</span>
            </button>

            <button
              onClick={() => setShowGuideModal(true)}
              className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Guide</span>
            </button>
          </div>
        </div>

        {/* Live Speech Waves & Transcript Stream with Audio Waveform Feedback */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-purple-500/20"
            >
              <div className="flex items-center gap-3 text-rose-200 font-mono text-xs font-bold bg-rose-950/40 border border-rose-500/40 p-3 rounded-2xl shadow-inner">
                {/* Visual Feedback Waveform Animation */}
                <div className="flex items-center gap-1 h-6 px-1.5 py-0.5 bg-black/40 rounded-lg border border-rose-500/30 shrink-0">
                  <motion.span
                    animate={{ height: ['6px', '20px', '8px', '22px', '6px'] }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
                    className="w-1 bg-rose-400 rounded-full"
                  />
                  <motion.span
                    animate={{ height: ['14px', '6px', '22px', '10px', '14px'] }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut', delay: 0.1 }}
                    className="w-1 bg-pink-400 rounded-full"
                  />
                  <motion.span
                    animate={{ height: ['8px', '24px', '12px', '20px', '8px'] }}
                    transition={{ repeat: Infinity, duration: 0.85, ease: 'easeInOut', delay: 0.2 }}
                    className="w-1 bg-amber-300 rounded-full"
                  />
                  <motion.span
                    animate={{ height: ['18px', '8px', '22px', '6px', '18px'] }}
                    transition={{ repeat: Infinity, duration: 1.0, ease: 'easeInOut', delay: 0.15 }}
                    className="w-1 bg-rose-300 rounded-full"
                  />
                  <motion.span
                    animate={{ height: ['6px', '22px', '10px', '24px', '6px'] }}
                    transition={{ repeat: Infinity, duration: 0.95, ease: 'easeInOut', delay: 0.25 }}
                    className="w-1 bg-emerald-400 rounded-full"
                  />
                  <motion.span
                    animate={{ height: ['12px', '6px', '18px', '10px', '12px'] }}
                    transition={{ repeat: Infinity, duration: 1.15, ease: 'easeInOut', delay: 0.05 }}
                    className="w-1 bg-purple-300 rounded-full"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                      {continuousMode ? 'Continuous Live' : 'Listening'}
                    </span>
                    {continuousMode && (
                      <span className="text-[10px] text-emerald-300 font-medium hidden sm:inline">
                        Auto-keeps listening after each command
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs font-semibold text-white">
                    {liveTranscript ? `"${liveTranscript}"` : `Speak your turn for ${activePlayerName}...`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Command Input Row / Chips */}
        <AnimatePresence>
          {(showTextInput || lastFeedback?.isPermissionError) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-purple-500/20 space-y-2"
            >
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  placeholder={`Type AI command e.g. "${gameType === 'farkle' ? 'Bank 500' : 'Full House 25'}"...`}
                  className="flex-1 bg-slate-950/80 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  type="submit"
                  disabled={!typedInput.trim() || isProcessing}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>

              {/* Quick suggestion chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-purple-300/70 font-semibold uppercase">Quick Commands:</span>
                {quickChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleQuickChip(chip)}
                    className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/30 text-purple-200 border border-purple-400/20 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    "{chip}"
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Response */}
        <AnimatePresence>
          {lastFeedback && !isListening && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`mt-3 p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 border ${
                lastFeedback.success
                  ? 'bg-emerald-950/60 text-emerald-200 border-emerald-500/40'
                  : 'bg-amber-950/60 text-amber-200 border-amber-500/40'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {lastFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="truncate">{lastFeedback.text}</span>
              </div>

              {lastFeedback.isPermissionError && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-lg text-[10px] font-bold text-amber-200 shrink-0 flex items-center gap-1"
                  title="Open app in a new tab for direct browser mic access"
                >
                  New Tab <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Voice Guide Modal */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border-2 border-purple-500/40 text-slate-100 rounded-[32px] p-6 max-w-lg w-full shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-wide text-white">
                    {gameType === 'farkle' ? 'Farkle Voice Commands' : 'Yahtzee Voice Commands'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Speak naturally using your mic OR type commands anytime!
                  </p>
                </div>
              </div>

              {/* Continuous Listening Feature Highlight */}
              <div className="p-3.5 bg-emerald-950/40 rounded-2xl border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                  <Repeat className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                    Continuous Listening Mode
                    <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded-full font-bold">New</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Toggle <strong className="text-emerald-200">Continuous: ON</strong> to keep the microphone active hands-free throughout your entire game session. Players can roll and speak their turns back-to-back without having to tap the screen each round.
                  </p>
                </div>
              </div>

              {gameType === 'farkle' ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-1">
                    <span className="font-black text-amber-400 uppercase tracking-wider text-[10px]">Bank Points</span>
                    <p className="text-slate-300 font-medium">Say or type <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"Bank 500"</code> or <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"Bank turn"</code></p>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-1">
                    <span className="font-black text-rose-400 uppercase tracking-wider text-[10px]">Farkle / Bust</span>
                    <p className="text-slate-300 font-medium">Say or type <code className="bg-slate-950 px-2 py-0.5 rounded text-rose-300">"Farkle"</code> or <code className="bg-slate-950 px-2 py-0.5 rounded text-rose-300">"Bust"</code></p>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-1">
                    <span className="font-black text-teal-400 uppercase tracking-wider text-[10px]">Build Turn Score</span>
                    <p className="text-slate-300 font-medium">Say or type <code className="bg-slate-950 px-2 py-0.5 rounded text-teal-300">"Add 150"</code> or <code className="bg-slate-950 px-2 py-0.5 rounded text-teal-300">"Plus 100"</code></p>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-1">
                    <span className="font-black text-purple-400 uppercase tracking-wider text-[10px]">Ask Score & Standings</span>
                    <p className="text-slate-300 font-medium">Say or type <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"Who is winning?"</code> or <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"What is the score?"</code></p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-1">
                    <span className="font-black text-amber-400 uppercase tracking-wider text-[10px]">Upper Categories</span>
                    <p className="text-slate-300 font-medium">Say or type <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"Aces 3"</code> or <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"Fives 15"</code> or <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"Sixes 24"</code></p>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-1">
                    <span className="font-black text-emerald-400 uppercase tracking-wider text-[10px]">Lower Categories</span>
                    <p className="text-slate-300 font-medium">Say or type <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"Full House 25"</code>, <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"Small Straight 30"</code>, or <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"Yahtzee 50"</code></p>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-1">
                    <span className="font-black text-rose-400 uppercase tracking-wider text-[10px]">Scratch / Zero Out</span>
                    <p className="text-slate-300 font-medium">Say or type <code className="bg-slate-950 px-2 py-0.5 rounded text-rose-300">"Scratch Fours"</code> or <code className="bg-slate-950 px-2 py-0.5 rounded text-rose-300">"Zero Full House"</code></p>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-1">
                    <span className="font-black text-purple-400 uppercase tracking-wider text-[10px]">Ask Score & Standings</span>
                    <p className="text-slate-300 font-medium">Say or type <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"Who is leading?"</code> or <code className="bg-slate-950 px-2 py-0.5 rounded text-purple-300">"What is the score?"</code></p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
              >
                Got It, Let's Play!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
