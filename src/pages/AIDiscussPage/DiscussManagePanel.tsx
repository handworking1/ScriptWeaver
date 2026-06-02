/**
 * Inline script editing panel — provides direct editing of all 22 script fields
 * without leaving the AI discuss page. Syncs with script management page.
 *
 * 内联剧本编辑面板 — 在 AI 讨论页直接编辑全部 22 个剧本字段，
 * 与剧本管理页保持同步。
 */
interface DiscussManagePanelProps {
  editFields: Record<string, string>;
  setEditFields: (fields: Record<string, string>) => void;
  onSave: () => void;
  /** Whether save just succeeded / 是否刚保存成功 */
  saved: boolean;
}

export function DiscussManagePanel({ editFields, setEditFields, onSave, saved }: DiscussManagePanelProps) {
  const update = (key: string, value: string) =>
    setEditFields({ ...editFields, [key]: value });

  return (
    <div className="max-w-3xl mx-auto space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="标题">
          <input value={editFields.title || ''} onChange={e => update('title', e.target.value)}
            className={inputCls} />
        </Field>
        <Field label="世界观">
          <input value={editFields.worldSetting || ''} onChange={e => update('worldSetting', e.target.value)}
            className={inputCls} />
        </Field>
      </div>
      <Field label="故事背景">
        <textarea value={editFields.background || ''} onChange={e => update('background', e.target.value)}
          className={`${inputCls} h-12 resize-none`} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="对标作品">
          <input value={editFields.referenceWorks || ''} onChange={e => update('referenceWorks', e.target.value)}
            className={inputCls} />
        </Field>
        <Field label="时代背景">
          <input value={editFields.eraBackground || ''} onChange={e => update('eraBackground', e.target.value)}
            className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="主线任务">
          <textarea value={editFields.mainQuests || ''} onChange={e => update('mainQuests', e.target.value)}
            className={`${inputCls} h-12 resize-none`} />
        </Field>
        <Field label="支线任务">
          <textarea value={editFields.sideQuests || ''} onChange={e => update('sideQuests', e.target.value)}
            className={`${inputCls} h-12 resize-none`} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="主角困境">
          <textarea value={editFields.protagonistDilemma || ''} onChange={e => update('protagonistDilemma', e.target.value)}
            className={`${inputCls} h-12 resize-none`} />
        </Field>
        <Field label="金手指">
          <textarea value={editFields.coreCheat || ''} onChange={e => update('coreCheat', e.target.value)}
            className={`${inputCls} h-12 resize-none`} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="环境描述">
          <textarea value={editFields.environment || ''} onChange={e => update('environment', e.target.value)}
            className={`${inputCls} h-10 resize-none`} />
        </Field>
        <Field label="地图">
          <textarea value={editFields.map || ''} onChange={e => update('map', e.target.value)}
            className={`${inputCls} h-10 resize-none`} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="时间线">
          <textarea value={editFields.timeline || ''} onChange={e => update('timeline', e.target.value)}
            className={`${inputCls} h-12 resize-none`} />
        </Field>
        <Field label="章节">
          <textarea value={editFields.chapters || ''} onChange={e => update('chapters', e.target.value)}
            className={`${inputCls} h-12 resize-none`} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="其他数据">
          <input value={editFields.data || ''} onChange={e => update('data', e.target.value)}
            className={inputCls} />
        </Field>
        <Field label="年龄规则">
          <input value={editFields.ageRule || ''} onChange={e => update('ageRule', e.target.value)}
            className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="类型标签">
          <input value={editFields.tags || ''} onChange={e => update('tags', e.target.value)}
            className={inputCls} />
        </Field>
        <Field label="创作模式">
          <select value={editFields.narrativeMode || 'mode3'} onChange={e => update('narrativeMode', e.target.value)}
            className={inputCls}>
            <option value="mode1">模式1·沉浸扮演</option>
            <option value="mode2">模式2·上帝视角</option>
            <option value="mode3">模式3·混合</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="严格度">
          <select value={editFields.strictMode || 'strict'} onChange={e => update('strictMode', e.target.value)}
            className={inputCls}>
            <option value="strict">严格</option><option value="loose">宽松</option>
          </select>
        </Field>
        <Field label="工作流">
          <select value={editFields.workflowMode || 'guided'} onChange={e => update('workflowMode', e.target.value)}
            className={inputCls}>
            <option value="guided">引导</option><option value="flexible">灵活</option>
          </select>
        </Field>
        <Field label="前情提要">
          <select value={editFields.recapMode || 'N'} onChange={e => update('recapMode', e.target.value)}
            className={inputCls}>
            <option value="N">不开启</option><option value="Y">开启</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="定期总结">
          <select value={editFields.periodicSummary || 'O'} onChange={e => update('periodicSummary', e.target.value)}
            className={inputCls}>
            <option value="O">开启</option><option value="P">不开启</option>
          </select>
        </Field>
        <Field label="规则自检">
          <select value={editFields.ruleSelfCheck || 'Y'} onChange={e => update('ruleSelfCheck', e.target.value)}
            className={inputCls}>
            <option value="Y">开启</option><option value="N">不开启</option>
          </select>
        </Field>
      </div>
      <Field label="帮回辅助系统">
        <select value={editFields.banghuiEnabled || 'N'} onChange={e => update('banghuiEnabled', e.target.value)}
          className={inputCls}>
          <option value="N">关闭</option><option value="Y">开启</option>
        </select>
      </Field>
      <button onClick={onSave}
        className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
        disabled={saved}>
        {saved ? '✅ 已保存' : '💾 保存设定'}
      </button>
    </div>
  );
}

/** Tiny helper: labeled form field wrapper.
 *  微型辅助组件：带标签的表单字段包装器。 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-purple-500';
