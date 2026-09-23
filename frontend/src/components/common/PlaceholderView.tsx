import React from 'react';
import { Construction, ArrowRight, ShieldCheck } from 'lucide-react';

interface PlaceholderViewProps {
  title: string;
  category: string;
  description: string;
  relatedActions?: { label: string; onClick: () => void }[];
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  title,
  category,
  description,
  relatedActions = [],
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-xs">
          <Construction className="w-7 h-7 text-blue-600" />
        </div>
        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
          {category} Module
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-3">{title}</h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          {description}
        </p>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
          {relatedActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-xs"
            >
              <span>{action.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <div className="mt-6 text-[11px] text-slate-600 flex items-center justify-center gap-1.5 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Active Backend Models & Data Pipelines Fully Operational</span>
        </div>
      </div>
    </div>
  );
};
