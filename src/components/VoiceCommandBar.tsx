import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, HelpCircle, Send, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { YahtzeeCategory } from '../types';

export type FarkleVoiceCommand =
  | { type: 'ADD_POINTS'; amount: number; playerName?: string }
  | { type: 'BANK'; amount?: number; playerName?: string }
  | { type: 'FARKLE'; playerName?: string }
  | { type: 'CLEAR_TURN'; playerName?: string }
  | { type: 'UNDO'; playerName?: string }
  | { type: 'SELECT_PLAYER'; playerName: string };

export type YahtzeeVoiceCommand =
  | { type: 'SCORE_CATEGORY'; category: YahtzeeCategory; score: number }
  | { type: 'SCRATCH_CATEGORY'; category: YahtzeeCategory }
  | { type: 'UNDO' }
  | { type: 'NEXT_PLAYER' };

interface VoiceCommandBarProps {
  gameType: 'farkle' | 'yahtzee';
  activePlayerName?: string;
  playerNames?: string[];
  onFarkleCommand?: (cmd: FarkleVoiceCommand) => boolean | void;
  onYahtzeeCommand?: (cmd: YahtzeeVoiceCommand) => boolean | void;
}

// Word to number converter helper
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, scratch: 0, zip: 0,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000,
};

function parseTextToNumber(str: string): number | null {
  const clean = str.toLowerCase().replace(/,/g, '').trim();
  // Check direct digit match first
  const digitMatch = clean.match(/\b\d+\b/);
  if (digitMatch) {
    return parseInt(digitMatch[0], 10);
  }

  // Parse spoken words like "five hundred", "one thousand five hundred", "twenty five"
  const tokens = clean.split(/[\s-]+/);
  let total = 0;
  let current = 0;
  let found = false;

  for (const token of tokens) {
    if (NUMBER_WORDS[token] !== undefined) {
      found = true;
      const val = NUMBER_WORDS[token];
      if (val === 100) {
        current = (current === 0 ? 1 : current) * 100;
      } else if (val === 1000) {
        current = (current === 0 ? 1 : current) * 1000;
        total += current;
        current = 0;
      } else {
        current += val;
      }
    }
  }

  total += current;
  return found ? total : null;
}

function extractPlayerAndCleanText(text: string, playerNames: string[] = []): { matchedPlayerName?: string; cleanTextWithoutPlayer: string } {
  let lowerText = text.toLowerCase().replace(/,/g, '').trim();
  let matchedPlayerName: string | undefined = undefined;
  let textToStrip = '';

  // 1. Try matching against actual player names provided
  if (playerNames.length > 0) {
    const sortedNames = [...playerNames].sort((a, b) => b.length - a.length);
    for (const name of sortedNames) {
      const lowerName = name.toLowerCase().trim();
      if (!lowerName) continue;
      const cleanLowerName = lowerName.replace(/'s$/, '').replace(/[^a-z0-9]/g, '');

      // Check if text includes full name or possessive e.g. "stacy's", "stacies", "stacy"
      if (
        lowerText.includes(lowerName) ||
        lowerText.includes(`${lowerName}'s`) ||
        lowerText.includes(`${lowerName}s`) ||
        (cleanLowerName && lowerText.split(/\s+/).some(w => w.replace(/'s$/, '').replace(/[^a-z0-9]/g, '') === cleanLowerName))
      ) {
        matchedPlayerName = name;
        textToStrip = lowerName;
        break;
      }
    }
  }

  // 2. If no direct name matched, try ordinal / index matches e.g. "player 1", "player 2", "player one", "p1", "first player"
  if (!matchedPlayerName) {
    const ordinalMap: { regex: RegExp; index: number }[] = [
      { regex: /\b(player 1|player one|p1|first player)\b/i, index: 0 },
      { regex: /\b(player 2|player two|p2|second player)\b/i, index: 1 },
      { regex: /\b(player 3|player three|p3|third player)\b/i, index: 2 },
      { regex: /\b(player 4|player four|p4|fourth player)\b/i, index: 3 },
      { regex: /\b(player 5|player five|p5|fifth player)\b/i, index: 4 },
      { regex: /\b(player 6|player six|p6|sixth player)\b/i, index: 5 },
      { regex: /\b(player 7|player seven|p7|seventh player)\b/i, index: 6 },
      { regex: /\b(player 8|player eight|p8|eighth player)\b/i, index: 7 },
    ];

    for (const item of ordinalMap) {
      const match = lowerText.match(item.regex);
      if (match) {
        textToStrip = match[0];
        if (playerNames && playerNames[item.index]) {
          matchedPlayerName = playerNames[item.index];
        }
        break;
      }
    }
  }

  // Remove the matched player phrase and possessive 's from lowerText
  let cleanTextWithoutPlayer = lowerText;
  if (textToStrip) {
    const regex = new RegExp(`\\b${textToStrip}('s|s)?\\b`, 'gi');
    cleanTextWithoutPlayer = lowerText.replace(regex, '').replace(/\bfor\b/gi, '').replace(/\bto\b/gi, '').trim();
  }

  return { matchedPlayerName, cleanTextWithoutPlayer };
}

export default function VoiceCommandBar({
  gameType,
  activePlayerName,
  playerNames = [],
  onFarkleCommand,
  onYahtzeeCommand,
}: VoiceCommandBarProps) {
  const [isListening, setIsListening] = useState(false);
  const [isAlwaysListening, setIsAlwaysListening] = useState(true); // Default to always listening once started
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [manualText, setManualText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const isAlwaysListeningRef = useRef(true);
  const interimTimerRef = useRef<any>(null);
  const lastProcessedPhraseRef = useRef<string>('');

  useEffect(() => {
    isAlwaysListeningRef.current = isAlwaysListening;
  }, [isAlwaysListening]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const showTempFeedback = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFeedback({ text, type });
    setTimeout(() => {
      setFeedback(prev => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const processCommand = (rawText: string) => {
    const text = rawText.toLowerCase().trim();
    if (!text) return;

    // Prevent duplicate processing of identical phrase within short timeframe
    if (text === lastProcessedPhraseRef.current) return;
    lastProcessedPhraseRef.current = text;
    setTimeout(() => {
      if (lastProcessedPhraseRef.current === text) {
        lastProcessedPhraseRef.current = '';
      }
    }, 3500);

    setTranscript(rawText);

    if (gameType === 'farkle' && onFarkleCommand) {
      // FARKLE COMMANDS
      const { matchedPlayerName, cleanTextWithoutPlayer } = extractPlayerAndCleanText(text, playerNames);
      const cleanText = cleanTextWithoutPlayer;

      if (cleanText.includes('farkle') || cleanText.includes('bust') || cleanText.includes('farkled')) {
        onFarkleCommand({ type: 'FARKLE', playerName: matchedPlayerName });
        showTempFeedback(`Farkle recorded${matchedPlayerName ? ` for ${matchedPlayerName}` : ''}! Turn passed.`, 'info');
        return;
      }

      if (cleanText.includes('clear') || cleanText.includes('reset turn')) {
        onFarkleCommand({ type: 'CLEAR_TURN' });
        showTempFeedback(`Turn score cleared`, 'info');
        return;
      }

      if (cleanText.includes('undo')) {
        onFarkleCommand({ type: 'UNDO' });
        showTempFeedback(`Undid last action`, 'info');
        return;
      }

      // Check for Bank / Save / Keep / Collect / Pass / End Turn / Done / Score / Make / Give keywords
      const isBankKeyword =
        cleanText.includes('bank') ||
        cleanText.includes('save') ||
        cleanText.includes('keep') ||
        cleanText.includes('collect') ||
        cleanText.includes('take') ||
        cleanText.includes('pass') ||
        cleanText.includes('end turn') ||
        cleanText.includes('finish turn') ||
        cleanText.includes('done') ||
        cleanText.includes('score') ||
        cleanText.includes('make') ||
        cleanText.includes('give') ||
        cleanText.includes('put') ||
        cleanText.includes('log') ||
        cleanText.includes('record') ||
        cleanText.includes('enter');

      const parsedNum = parseTextToNumber(cleanText);
      // If player name is explicitly matched along with a score (e.g. "1000 for Stacy", "Make 1000 points for Stacy", "Stacy 1000"), or if bank keyword is used
      const isExplicitPlayerScore = matchedPlayerName !== undefined && parsedNum !== null && parsedNum > 0;

      if (isBankKeyword || isExplicitPlayerScore) {
        const result = onFarkleCommand({ type: 'BANK', amount: parsedNum !== null && parsedNum > 0 ? parsedNum : undefined, playerName: matchedPlayerName });
        if (result !== false) {
          const bankedLabel = parsedNum !== null && parsedNum > 0 ? `${parsedNum.toLocaleString()} points` : 'turn score';
          showTempFeedback(`Banked ${bankedLabel}${matchedPlayerName ? ` for ${matchedPlayerName}` : ''}!`, 'success');
        } else {
          showTempFeedback(`No points to bank! Add points first or say "Bank 500".`, 'error');
        }
        return;
      }

      // Check special combos
      let comboPoints: number | null = null;
      let comboLabel = '';
      if (cleanText.includes('three 1') || cleanText.includes('three ones') || cleanText.includes('3 ones') || cleanText.includes('three 1s')) {
        comboPoints = 1000; comboLabel = 'Three 1s';
      } else if (cleanText.includes('three 2') || cleanText.includes('three twos') || cleanText.includes('3 twos')) {
        comboPoints = 200; comboLabel = 'Three 2s';
      } else if (cleanText.includes('three 3') || cleanText.includes('three threes') || cleanText.includes('3 threes')) {
        comboPoints = 300; comboLabel = 'Three 3s';
      } else if (cleanText.includes('three 4') || cleanText.includes('three fours') || cleanText.includes('3 fours')) {
        comboPoints = 400; comboLabel = 'Three 4s';
      } else if (cleanText.includes('three 5') || cleanText.includes('three fives') || cleanText.includes('3 fives')) {
        comboPoints = 500; comboLabel = 'Three 5s';
      } else if (cleanText.includes('three 6') || cleanText.includes('three sixes') || cleanText.includes('3 sixes')) {
        comboPoints = 600; comboLabel = 'Three 6s';
      } else if (cleanText.includes('straight') || cleanText.includes('1 through 6') || cleanText.includes('one to six')) {
        comboPoints = 1500; comboLabel = 'Straight';
      } else if (cleanText.includes('three pair') || cleanText.includes('3 pair') || cleanText.includes('full house')) {
        comboPoints = 1500; comboLabel = 'Three Pair';
      }

      if (comboPoints !== null) {
        onFarkleCommand({ type: 'ADD_POINTS', amount: comboPoints, playerName: matchedPlayerName });
        showTempFeedback(`+${comboPoints.toLocaleString()} pts (${comboLabel})${matchedPlayerName ? ` for ${matchedPlayerName}` : ''}`, 'success');
        return;
      }

      // Generic add points (e.g. "Add 500", "Plus 100", "500", "50", "100")
      if (parsedNum !== null && parsedNum > 0) {
        onFarkleCommand({ type: 'ADD_POINTS', amount: parsedNum, playerName: matchedPlayerName });
        showTempFeedback(`+${parsedNum.toLocaleString()} pts added${matchedPlayerName ? ` for ${matchedPlayerName}` : ''}`, 'success');
        return;
      }

      // Check if user just specified a player name e.g. "Bob", "Switch to Bob", "Bob's turn"
      if (matchedPlayerName) {
        onFarkleCommand({ type: 'SELECT_PLAYER', playerName: matchedPlayerName });
        showTempFeedback(`Switched to ${matchedPlayerName}'s turn`, 'info');
        return;
      }

      showTempFeedback(`Unrecognized command: "${rawText}". Try "Bank", "Bank 500", or "Farkle".`, 'error');
    } else if (gameType === 'yahtzee' && onYahtzeeCommand) {
      // YAHTZEE COMMANDS
      if (text.includes('undo')) {
        onYahtzeeCommand({ type: 'UNDO' });
        showTempFeedback(`Undid last score`, 'info');
        return;
      }

      if (text.includes('next') || text.includes('pass turn')) {
        onYahtzeeCommand({ type: 'NEXT_PLAYER' });
        showTempFeedback(`Turn passed`, 'info');
        return;
      }

      // Map category keywords
      let category: YahtzeeCategory | null = null;
      if (text.includes('ace') || text.includes('ones') || text.includes(' 1s') || text.includes(' 1 ') || text.endsWith(' 1')) category = 'aces';
      else if (text.includes('two') || text.includes(' 2s') || text.includes(' 2 ') || text.endsWith(' 2')) category = 'twos';
      else if (text.includes('three') && !text.includes('three of a kind') || text.includes(' 3s')) category = 'threes';
      else if (text.includes('four') && !text.includes('four of a kind') || text.includes(' 4s')) category = 'fours';
      else if (text.includes('five') && !text.includes('5 of a kind') || text.includes(' 5s')) category = 'fives';
      else if (text.includes('six') || text.includes(' 6s')) category = 'sixes';
      else if (text.includes('three of a kind') || text.includes('3 of a kind') || text.includes('triple')) category = 'threeOfAKind';
      else if (text.includes('four of a kind') || text.includes('4 of a kind') || text.includes('quad')) category = 'fourOfAKind';
      else if (text.includes('full house')) category = 'fullHouse';
      else if (text.includes('small straight') || text.includes('short straight') || text.includes('sm straight')) category = 'smallStraight';
      else if (text.includes('large straight') || text.includes('long straight') || text.includes('lg straight')) category = 'largeStraight';
      else if (text.includes('yahtzee') || text.includes('5 of a kind')) category = 'yahtzee';
      else if (text.includes('chance')) category = 'chance';

      if (category) {
        if (text.includes('scratch') || text.includes('zero') || text.includes('0') || text.includes('cross off')) {
          onYahtzeeCommand({ type: 'SCRATCH_CATEGORY', category });
          showTempFeedback(`Scratched ${category} (0 pts)`, 'info');
          return;
        }

        let defaultScoreForCat: number | null = null;
        if (category === 'fullHouse') defaultScoreForCat = 25;
        if (category === 'smallStraight') defaultScoreForCat = 30;
        if (category === 'largeStraight') defaultScoreForCat = 40;
        if (category === 'yahtzee') defaultScoreForCat = 50;

        const num = parseTextToNumber(text);
        const scoreToApply = num !== null ? num : defaultScoreForCat;

        if (scoreToApply !== null) {
          onYahtzeeCommand({ type: 'SCORE_CATEGORY', category, score: scoreToApply });
          showTempFeedback(`Scored ${scoreToApply} in ${category}!`, 'success');
          return;
        } else {
          showTempFeedback(`Please specify points for ${category} (e.g. "Chance 22")`, 'error');
          return;
        }
      }

      showTempFeedback(`Unrecognized command: "${rawText}". Try "Full House 25" or "Aces 4".`, 'error');
    }
  };

  const startListeningSession = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setShowTextInput(true);
      showTempFeedback('Speech recognition not supported in this browser. Use "Type Command" below.', 'error');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setTranscript('Listening... Speak a command!');
      };

      recognition.onresult = (event: any) => {
        let fullInterimText = '';
        let hasFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const textSegment = event.results[i][0].transcript;
          fullInterimText += ' ' + textSegment;
          if (event.results[i].isFinal) {
            hasFinal = true;
            const finalPhrase = textSegment.trim();
            if (finalPhrase) {
              if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
              processCommand(finalPhrase);
            }
          }
        }

        const cleanInterim = fullInterimText.trim();
        if (cleanInterim) {
          setTranscript(cleanInterim);
          if (!hasFinal) {
            if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
            interimTimerRef.current = setTimeout(() => {
              processCommand(cleanInterim);
            }, 650);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isListeningRef.current = false;
          setIsListening(false);
          setShowTextInput(true);
          showTempFeedback('Mic permission blocked. Click "Type Command" or grant mic access.', 'error');
        } else if (event.error === 'audio-capture') {
          isListeningRef.current = false;
          setIsListening(false);
          setShowTextInput(true);
          showTempFeedback('No mic detected or mic in use by another app.', 'error');
        } else if (event.error === 'network') {
          showTempFeedback('Speech service connection issue. Auto-retrying...', 'info');
        } else if (event.error === 'no-speech') {
          // Expected silent timeout in Web Speech API
        } else {
          showTempFeedback(`Mic status: ${event.error}`, 'info');
        }
      };

      recognition.onend = () => {
        if (interimTimerRef.current) {
          clearTimeout(interimTimerRef.current);
        }
        if (isListeningRef.current && isAlwaysListeningRef.current) {
          setTimeout(() => {
            if (isListeningRef.current && isAlwaysListeningRef.current) {
              try {
                if (recognitionRef.current) {
                  recognitionRef.current.start();
                }
              } catch (_) {
                try {
                  startListeningSession();
                } catch (reErr) {
                  console.error('Failed to restart speech recognition:', reErr);
                  setIsListening(false);
                  isListeningRef.current = false;
                }
              }
            }
          }, 250);
        } else {
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      isListeningRef.current = false;
      setShowTextInput(true);
      showTempFeedback('Microphone activation failed. Use "Type Command" below.', 'error');
    }
  };

  const stopListeningSession = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListeningSession();
    } else {
      startListeningSession();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    processCommand(manualText);
    setManualText('');
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-xl border border-slate-800 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mic Status & Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleListening}
            className={`relative p-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white ring-4 ring-red-500/30 animate-pulse'
                : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-md hover:scale-105'
            }`}
            title={isListening ? 'Click to pause listening' : 'Click to start continuous voice listening'}
          >
            {isListening ? (
              <>
                <Mic className="w-5 h-5 animate-spin" />
                <span className="text-xs font-black uppercase tracking-wider">Listening Always...</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-wider">Start Voice Mic</span>
              </>
            )}
            {/* Listening pulse ring */}
            {isListening && (
              <span className="absolute -inset-1 rounded-2xl bg-red-500 opacity-40 animate-ping pointer-events-none" />
            )}
          </button>

          <button
            onClick={() => {
              const nextVal = !isAlwaysListening;
              setIsAlwaysListening(nextVal);
              isAlwaysListeningRef.current = nextVal;
              showTempFeedback(
                nextVal ? 'Hands-Free Always Listening Enabled' : 'Single Command Mode Enabled',
                'info'
              );
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isAlwaysListening
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title="Toggle whether the mic stays active continuously after each command"
          >
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isAlwaysListening ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              Continuous Mode: {isAlwaysListening ? 'ON' : 'OFF'}
            </span>
          </button>

          {activePlayerName && (
            <div className="hidden sm:block text-xs font-medium text-slate-400 border-l border-slate-700 pl-3">
              Speaking for: <span className="font-bold text-teal-400">{activePlayerName}</span>
            </div>
          )}
        </div>

        {/* Right: Controls & Help */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Type voice command"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Type Command</span>
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="View voice commands guide"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden xs:inline">Help</span>
          </button>
        </div>
      </div>

      {/* Transcript or Feedback line */}
      <AnimatePresence mode="wait">
        {feedback ? (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-red-950/80 border border-red-500/40 text-red-300'
                : 'bg-teal-950/80 border border-teal-500/40 text-teal-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : feedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              ) : (
                <Sparkles className="w-4 h-4 shrink-0 text-teal-400" />
              )}
              <span>{feedback.text}</span>
            </div>
            {isListening && isAlwaysListening && (
              <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Listening...
              </span>
            )}
          </motion.div>
        ) : isListening ? (
          <motion.div
            key="transcript"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-mono bg-slate-950/80 border border-teal-500/30 px-3.5 py-2.5 rounded-xl text-teal-300 flex items-center justify-between gap-3 shadow-inner"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {/* Sound wave visualizer */}
              <div className="flex items-center gap-0.5 h-3.5 shrink-0 px-0.5">
                <span className="w-1 h-full bg-teal-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                <span className="w-1 h-2/3 bg-teal-300 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_100ms]" />
                <span className="w-1 h-full bg-teal-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite_200ms]" />
                <span className="w-1 h-1/2 bg-teal-200 rounded-full animate-[pulse_0.7s_ease-in-out_infinite_150ms]" />
              </div>
              <span className="italic truncate font-medium">"{transcript || 'Listening... Speak now!'}"</span>
            </div>
            <span className="text-[10px] text-teal-400 font-sans font-extrabold uppercase tracking-widest shrink-0 bg-teal-950 px-2 py-0.5 rounded-md border border-teal-500/30">
              Mic Active
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Quick Command Suggestions / Shortcuts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] text-slate-400 scrollbar-none">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
          Try saying:
        </span>
        {gameType === 'farkle' ? (
          <>
            <button
              onClick={() => processCommand('Bank 1000')}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-teal-900/60 hover:text-teal-300 text-slate-300 rounded-lg border border-slate-700/60 font-mono transition-colors shrink-0 cursor-pointer"
            >
              "Bank 1000"
            </button>
            {playerNames.length > 0 && (
              <button
                onClick={() => processCommand(`Bank 500 for ${playerNames[0]}`)}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-teal-900/60 hover:text-teal-300 text-slate-300 rounded-lg border border-slate-700/60 font-mono transition-colors shrink-0 cursor-pointer"
              >
                "Bank 500 for {playerNames[0]}"
              </button>
            )}
            <button
              onClick={() => processCommand('Farkle')}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-red-900/50 hover:text-red-300 text-slate-300 rounded-lg border border-slate-700/60 font-mono transition-colors shrink-0 cursor-pointer"
            >
              "Farkle"
            </button>
            <button
              onClick={() => processCommand('Three ones')}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-teal-900/60 hover:text-teal-300 text-slate-300 rounded-lg border border-slate-700/60 font-mono transition-colors shrink-0 cursor-pointer"
            >
              "Three ones"
            </button>
            <button
              onClick={() => processCommand('Undo')}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-amber-900/50 hover:text-amber-300 text-slate-300 rounded-lg border border-slate-700/60 font-mono transition-colors shrink-0 cursor-pointer"
            >
              "Undo"
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => processCommand('Yahtzee 50')}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-teal-900/60 hover:text-teal-300 text-slate-300 rounded-lg border border-slate-700/60 font-mono transition-colors shrink-0 cursor-pointer"
            >
              "Yahtzee 50"
            </button>
            <button
              onClick={() => processCommand('Full House 25')}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-teal-900/60 hover:text-teal-300 text-slate-300 rounded-lg border border-slate-700/60 font-mono transition-colors shrink-0 cursor-pointer"
            >
              "Full House 25"
            </button>
            <button
              onClick={() => processCommand('Aces 4')}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-teal-900/60 hover:text-teal-300 text-slate-300 rounded-lg border border-slate-700/60 font-mono transition-colors shrink-0 cursor-pointer"
            >
              "Aces 4"
            </button>
            <button
              onClick={() => processCommand('Undo')}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-amber-900/50 hover:text-amber-300 text-slate-300 rounded-lg border border-slate-700/60 font-mono transition-colors shrink-0 cursor-pointer"
            >
              "Undo"
            </button>
          </>
        )}
      </div>

      {/* Optional Manual Text Command Input */}
      {showTextInput && (
        <form onSubmit={handleManualSubmit} className="flex gap-2 pt-1">
          <input
            type="text"
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            placeholder={
              gameType === 'farkle'
                ? 'Type command (e.g. "Add 500", "Bank", "Farkle", "Three ones")'
                : 'Type command (e.g. "Full House 25", "Yahtzee 50", "Aces 4", "Chance 18")'
            }
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-medium"
          />
          <button
            type="submit"
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            Run
          </button>
        </form>
      )}

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-55 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 text-white border-2 border-teal-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-teal-400" />
                  <h3 className="font-black text-base uppercase tracking-tight text-teal-300">
                    Voice Commands ({gameType === 'farkle' ? 'Farkle' : 'Yahtzee'})
                  </h3>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {gameType === 'farkle' ? (
                <div className="space-y-3 text-xs text-slate-300">
                  <p className="text-slate-400">
                    Tap the mic button and speak naturally to add points or bank score:
                  </p>
                  <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-[11px]">
                    <div className="text-teal-400 font-bold font-sans">Points & Sets:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                      <li>"Add 500" or "Plus 350" or "500"</li>
                      <li>"Three ones" (+1,000 pts)</li>
                      <li>"Three fives" (+500 pts)</li>
                      <li>"Straight" (+1,500 pts)</li>
                      <li>"Full house" / "Three pair" (+1,500 pts)</li>
                    </ul>

                    <div className="text-amber-400 font-bold font-sans pt-2">Turn Actions:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                      <li>"Bank" or "Bank score" (banks current turn points)</li>
                      <li>"Bank 500" (sets turn score to 500 and banks)</li>
                      <li>"Farkle" or "Bust" (records 0 pts and passes turn)</li>
                      <li>"Clear" (resets current turn score)</li>
                      <li>"Undo" (reverts last action)</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-300">
                  <p className="text-slate-400">
                    Tap the mic button and speak category names and scores to automatically fill the score sheet:
                  </p>
                  <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-[11px]">
                    <div className="text-teal-400 font-bold font-sans">Upper Section:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                      <li>"Aces 4" or "Ones 3"</li>
                      <li>"Twos 8" or "Threes 12"</li>
                      <li>"Fours 16", "Fives 20", "Sixes 24"</li>
                    </ul>

                    <div className="text-amber-400 font-bold font-sans pt-2">Lower Section:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                      <li>"Full house" or "Full house 25"</li>
                      <li>"Small straight" (30 pts) / "Large straight" (40 pts)</li>
                      <li>"Yahtzee" or "Yahtzee 50"</li>
                      <li>"3 of a kind 21" / "4 of a kind 24"</li>
                      <li>"Chance 22"</li>
                      <li>"Scratch Full House" or "Aces zero"</li>
                    </ul>

                    <div className="text-teal-400 font-bold font-sans pt-2">Actions:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                      <li>"Undo"</li>
                      <li>"Next player"</li>
                    </ul>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowHelp(false)}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-2.5 rounded-2xl transition-all cursor-pointer text-xs"
              >
                Got It!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
