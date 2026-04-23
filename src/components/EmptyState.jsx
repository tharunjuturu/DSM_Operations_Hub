import React from 'react';
import {Inbox} from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title = "No Data Available", 
  description = "There is nothing to display here right now.", 
  action = null 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed" style={{ minHeight: '300px' }}>
      <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full mb-4">
        <Icon className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
