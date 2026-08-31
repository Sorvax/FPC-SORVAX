import React from 'react';
import { Bell, Play, X, ChevronRight, ChevronLeft, RotateCcw, CheckCircle2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useDemo } from '../../context/DemoContext';

export function Header({ title }) {
  const navigate = useNavigate();
  const { notifications } = useApp();
  const { demoActive, demoStep, demoSteps, startDemo, nextStep, previousStep, resetDemo } = useDemo();

  const unreadCount = notifications.filter(n => !n.read).length;
  const isComplete = demoActive && demoStep === demoSteps.length - 1;

  return (
    <div className="flex flex-col">
      {/* Demo Mode Banner */}
      {demoActive && (
        <div className="bg-indigo-600 text-white px-6 py-2.5 flex items-center justify-between text-sm shadow-sm z-10">
          <div className="flex items-center gap-4">
            <span className="font-semibold px-2 py-1 bg-indigo-700 rounded text-xs tracking-wide">DEMO MODE</span>
            {isComplete ? (
              <span className="font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                Demo Complete — Full lifecycle demonstrated
              </span>
            ) : (
              <span className="font-medium">Step {demoStep + 1} of {demoSteps.length}: {demoSteps[demoStep]}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isComplete && (
              <>
                <button
                  onClick={previousStep}
                  disabled={demoStep === 0}
                  className="p-1.5 hover:bg-indigo-500 rounded disabled:opacity-50 transition-colors"
                  title="Previous step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextStep}
                  className="px-3 py-1.5 bg-white text-indigo-600 rounded-md font-medium text-xs hover:bg-indigo-50 transition-colors flex items-center gap-1"
                >
                  Next Step <ChevronRight className="w-3 h-3" />
                </button>
              </>
            )}
            {isComplete && (
              <button
                onClick={() => navigate('/reports')}
                className="px-3 py-1.5 bg-white text-indigo-600 rounded-md font-medium text-xs hover:bg-indigo-50 transition-colors flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                View Final Report
              </button>
            )}
            <div className="w-px h-4 bg-indigo-500 mx-2"></div>
            <button
              onClick={resetDemo}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-md font-medium text-xs transition-colors flex items-center gap-1"
              title="Reset Demo"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button onClick={resetDemo} className="p-1.5 hover:bg-indigo-500 rounded transition-colors" title="Exit Demo">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Demo Progress Indicator */}
      {demoActive && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2">
          <div className="flex items-center gap-1.5 max-w-4xl mx-auto">
            {demoSteps.map((step, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i < demoStep ? 'bg-indigo-500' :
                  i === demoStep ? 'bg-indigo-600 ring-2 ring-indigo-200' :
                  'bg-indigo-200'
                }`}
                title={step}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-semibold text-slate-800">{title || 'Dashboard'}</h1>

        <div className="flex items-center gap-6">
          {!demoActive && (
            <button
              onClick={startDemo}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Demo
            </button>
          )}

          <div className="relative">
            <button className="text-slate-500 hover:text-slate-700 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-sm font-medium text-indigo-700">
              OM
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-700">Officer Martinez</p>
              <p className="text-xs text-slate-500">CyberOps Div</p>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
