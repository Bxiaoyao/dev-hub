import { getTagClassName } from '../lib/tags';

interface ProjectTagsProps {
  tags?: string[];
  size?: 'xs' | 'sm';
  maxVisible?: number;
  onTagClick?: (tag: string) => void;
}

export function ProjectTags({ tags, size = 'xs', maxVisible, onTagClick }: ProjectTagsProps) {
  if (!tags?.length) return null;

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-[11px] px-1.5 py-0.5';
  const visible = maxVisible ? tags.slice(0, maxVisible) : tags;
  const overflow = maxVisible && tags.length > maxVisible ? tags.length - maxVisible : 0;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map((tag) => (
        <span
          key={tag}
          className={`rounded font-medium ${sizeClass} ${getTagClassName(tag)} ${
            onTagClick ? 'cursor-pointer hover:opacity-80' : ''
          }`}
          onClick={
            onTagClick
              ? (e) => {
                  e.stopPropagation();
                  onTagClick(tag);
                }
              : undefined
          }
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span className={`rounded font-medium ${sizeClass} bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-600`}>
          +{overflow}
        </span>
      )}
    </div>
  );
}
