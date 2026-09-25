import React, { forwardRef } from 'react';

const CommentaryBox = forwardRef(({ commentary }, ref) => {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden h-[500px] flex flex-col">
      <div className="bg-white/10 px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">📻 Live Commentary</h3>
      </div>

      <div ref={ref} className="flex-1 overflow-y-auto p-4 space-y-2">
        {commentary.length === 0 ? (
          <p className="text-white/30 text-center text-sm italic">
            Commentary will appear here as the match progresses...
          </p>
        ) : (
          commentary.map((line, index) => (
            <div
              key={index}
              className={`text-sm p-2 rounded-lg ${
                index === 0 ? 'bg-green-500/10 text-green-300 font-semibold border-l-2 border-green-400' :
                line.includes('WICKET') || line.includes('OUT') || line.includes('bowled') || line.includes('caught') || line.includes('LBW') || line.includes('run out')
                  ? 'bg-red-500/10 text-red-300 border-l-2 border-red-400'
                  : line.includes('SIX') || line.includes('MAXIMUM')
                    ? 'bg-yellow-500/10 text-yellow-300 border-l-2 border-yellow-400'
                    : line.includes('FOUR') || line.includes('BOUNDARY')
                      ? 'bg-blue-500/10 text-blue-300 border-l-2 border-blue-400'
                      : 'text-white/60'
              }`}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

CommentaryBox.displayName = 'CommentaryBox';

export default CommentaryBox;
