import { useState } from 'react';
import { apiClient } from '../lib/api';
import { getTagClassName } from '../lib/tags';
import { useToast } from './Toast';

interface ProjectTagEditorProps {
  projectId: string;
  tags: string[];
  presets: string[];
  onChange: (tags: string[]) => void;
}

export function ProjectTagEditor({
  projectId,
  tags,
  presets,
  onChange,
}: ProjectTagEditorProps) {
  const [saving, setSaving] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const { showToast } = useToast();

  const saveTags = async (next: string[]) => {
    setSaving(true);
    try {
      const result = await apiClient.setProjectTags(projectId, next);
      onChange(result.tags);
      showToast('标签已保存', 'success');
    } catch (error) {
      showToast('保存标签失败: ' + (error as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    void saveTags(next);
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (!tag) return;
    if (tags.includes(tag)) {
      setCustomTag('');
      return;
    }
    setCustomTag('');
    void saveTags([...tags, tag]);
  };

  const allPresets = [...new Set([...presets, ...tags])];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allPresets.map((tag) => {
          const active = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              disabled={saving}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1 text-sm font-medium border transition-all disabled:opacity-50 ${
                active
                  ? getTagClassName(tag)
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustomTag();
            }
          }}
          placeholder="自定义标签，回车添加"
          disabled={saving}
          className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={addCustomTag}
          disabled={saving || !customTag.trim()}
          className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
        >
          添加
        </button>
      </div>

      {tags.length > 0 && (
        <p className="text-xs text-slate-400">
          已选：{tags.join('、')} · 再次点击可取消
        </p>
      )}
    </div>
  );
}
