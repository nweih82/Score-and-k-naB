import React from 'react';
import DiceFace from './DiceFace';
import { HelpCircle, Star, X } from 'lucide-react';

interface FarkleGuideProps {
  onClose?: () => void;
}

export default function FarkleGuide({ onClose }: FarkleGuideProps) {
  return (
    <div className="bg-white rounded-[32px] shadow-xl border-2 border-orange-100 p-6 sm:p-8 relative">
      {/* Top right close button if rendered inside card directly */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-full transition-all cursor-pointer"
          title="Close Guide"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-center gap-2 mb-6">
        <HelpCircle className="w-6 h-6 text-orange-500" />
        <h2 className="text-xl sm:text-2xl font-black text-teal-900 uppercase tracking-tight">
          Farkle Scoring Guide
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {/* Left Column - Specific Dice & Triplets */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-teal-800 uppercase tracking-widest border-b border-orange-100 pb-1.5">
            Single Dice & Triplets
          </h3>

          {/* Single 5 */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <DiceFace value={5} size="sm" />
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">Single 5</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">50 pts</span>
          </div>

          {/* Single 1 */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <DiceFace value={1} size="sm" />
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">Single 1</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">100 pts</span>
          </div>

          {/* Three 1s */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <DiceFace value={1} size="sm" />
                <DiceFace value={1} size="sm" />
                <DiceFace value={1} size="sm" />
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight hidden sm:inline">Three 1s</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">300 pts</span>
          </div>

          {/* Three 2s */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <DiceFace value={2} size="sm" />
                <DiceFace value={2} size="sm" />
                <DiceFace value={2} size="sm" />
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight hidden sm:inline">Three 2s</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">200 pts</span>
          </div>

          {/* Three 3s */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <DiceFace value={3} size="sm" />
                <DiceFace value={3} size="sm" />
                <DiceFace value={3} size="sm" />
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight hidden sm:inline">Three 3s</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">300 pts</span>
          </div>

          {/* Three 4s */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <DiceFace value={4} size="sm" />
                <DiceFace value={4} size="sm" />
                <DiceFace value={4} size="sm" />
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight hidden sm:inline">Three 4s</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">400 pts</span>
          </div>

          {/* Three 5s */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <DiceFace value={5} size="sm" />
                <DiceFace value={5} size="sm" />
                <DiceFace value={5} size="sm" />
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight hidden sm:inline">Three 5s</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">500 pts</span>
          </div>

          {/* Three 6s */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <DiceFace value={6} size="sm" />
                <DiceFace value={6} size="sm" />
                <DiceFace value={6} size="sm" />
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight hidden sm:inline">Three 6s</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">600 pts</span>
          </div>
        </div>

        {/* Right Column - Special Hands */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-teal-800 uppercase tracking-widest border-b border-orange-100 pb-1.5">
            Special Combinations
          </h3>

          {/* 4 of a Kind */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                <div className="w-5 h-5 bg-orange-50 border border-orange-200 text-orange-800 rounded flex items-center justify-center text-[10px] font-black">X</div>
                <div className="w-5 h-5 bg-orange-50 border border-orange-200 text-orange-800 rounded flex items-center justify-center text-[10px] font-black">X</div>
                <div className="w-5 h-5 bg-orange-50 border border-orange-200 text-orange-800 rounded flex items-center justify-center text-[10px] font-black">X</div>
                <div className="w-5 h-5 bg-orange-50 border border-orange-200 text-orange-800 rounded flex items-center justify-center text-[10px] font-black">X</div>
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">4 Of A Kind</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">1,000 pts</span>
          </div>

          {/* 5 of a Kind */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-5 h-5 bg-orange-50 border border-orange-200 text-orange-800 rounded flex items-center justify-center text-[10px] font-black">X</div>
                ))}
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">5 Of A Kind</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">2,000 pts</span>
          </div>

          {/* 6 of a Kind */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="w-5 h-5 bg-orange-50 border border-orange-200 text-orange-800 rounded flex items-center justify-center text-[10px] font-black">X</div>
                ))}
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">6 Of A Kind</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">3,000 pts</span>
          </div>

          {/* 1-6 Straight */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5, 6].map((v) => (
                  <div key={v} className="w-4 h-4 bg-orange-50 border border-orange-200 text-orange-800 rounded flex items-center justify-center text-[8px] font-black">{v}</div>
                ))}
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight hidden sm:inline">1-6 Straight</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">1,500 pts</span>
          </div>

          {/* 3 Pairs */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">A,A + B,B + C,C</span>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">3 Pairs</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">1,500 pts</span>
          </div>

          {/* 2 Triplets */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">A,A,A + B,B,B</span>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">2 Triplets</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">2,500 pts</span>
          </div>

          {/* 4 of a Kind with a Pair */}
          <div className="flex items-center justify-between py-1.5 px-2 hover:bg-orange-50/30 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">4 Kind + Pair</span>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-tight hidden sm:inline">4 Kind + Pair</span>
            </div>
            <span className="font-mono font-black text-orange-600 text-sm">1,500 pts</span>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-orange-50/70 border border-orange-100 rounded-3xl p-5 flex gap-3 items-start">
        <Star className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
        <p className="text-xs text-teal-950 font-bold leading-relaxed">
          <strong className="uppercase tracking-wider block text-[10px] text-orange-600 mb-1">How to play Farkle:</strong>
          Players roll 6 dice. Scoring dice are set aside. You can choose to bank points or roll the remaining dice. If a roll scores no points, you <strong>Farkle</strong> and lose all unbanked points for that turn!
        </p>
      </div>

      {onClose && (
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-full text-sm transition-colors shadow-md cursor-pointer uppercase tracking-wider block text-center"
          >
            Close Scoring Guide
          </button>
        </div>
      )}
    </div>
  );
}
