import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CaseCard } from '../components/case/CaseCard';
import { Briefcase } from 'lucide-react';

export const Cases = () => {
  const navigate = useNavigate();
  const { cases } = useApp();
  const [filter, setFilter] = useState('All');

  const filteredCases = cases.filter(c => {
    if (filter === 'Active') return c.currentStage < 8;
    if (filter === 'Resolved') return c.currentStage === 8;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Cases</h1>
        <p className="text-slate-500 mt-1">All security investigation cases</p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {['All', 'Active', 'Resolved'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${filter === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {tab}
              <span className="ml-1.5 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                {tab === 'All' ? cases.length : tab === 'Active' ? cases.filter(c => c.currentStage < 8).length : cases.filter(c => c.currentStage === 8).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {filteredCases.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No Cases Found</h3>
          <p className="text-sm text-slate-500">
            {filter === 'Active' ? 'All cases have been resolved.' : 
             filter === 'Resolved' ? 'No cases have been resolved yet.' :
             'No cases match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCases.map((c) => (
            <div key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className="cursor-pointer">
              <CaseCard caseData={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
