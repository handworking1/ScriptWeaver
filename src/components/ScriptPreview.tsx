import type { Script } from '@/types';

interface ScriptPreviewProps {
  script: Script;
  onClose: () => void;
}

/** Quick script overview panel for the chat page — shows key settings without leaving chat.
 *  聊天页剧本速览面板 — 不离开聊天即可查看关键设定。 */
export function ScriptPreview({ script, onClose }: ScriptPreviewProps) {
  const ed = script.extraData || ({} as any);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-200">📜 {script.title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
        {script.worldSetting && (
          <Field label="世界观" value={script.worldSetting} />
        )}
        {script.background && (
          <Field label="故事背景" value={script.background} />
        )}
        {ed.tags && (
          <Field label="类型标签" value={ed.tags} />
        )}
        {ed.referenceWorks && (
          <Field label="对标作品" value={ed.referenceWorks} />
        )}
        {ed.eraBackground && (
          <Field label="时代背景" value={ed.eraBackground} />
        )}
        {ed.mainQuests && (
          <Field label="主线任务" value={ed.mainQuests} />
        )}
        {ed.sideQuests && (
          <Field label="支线任务" value={ed.sideQuests} />
        )}
        {ed.protagonistDilemma && (
          <Field label="主角困境" value={ed.protagonistDilemma} />
        )}
        {ed.coreCheat && (
          <Field label="金手指" value={ed.coreCheat} />
        )}
        {ed.timeline && (
          <Field label="事件时间线" value={ed.timeline} />
        )}
        {ed.chapters && (
          <Field label="章节划分" value={ed.chapters} />
        )}
        {ed.environment && (
          <Field label="环境描述" value={ed.environment} />
        )}
        {ed.map && (
          <Field label="地图" value={ed.map} />
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-gray-300 leading-relaxed">{value}</div>
    </div>
  );
}
