import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleAboutProps {
  title: string;
  children: React.ReactNode;
  borderColor?: string;
}

export function CollapsibleAbout({ title, children, borderColor = 'border-blue-400' }: CollapsibleAboutProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`mt-6 bg-gray-50 rounded-lg border-l-4 ${borderColor}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors rounded-lg"
      >
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-700">{children}</p>
        </div>
      )}
    </div>
  );
}
