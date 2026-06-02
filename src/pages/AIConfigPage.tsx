import { useEffect, useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useNavStore } from '@/stores/navStore';
import { generateId } from '@/lib/id';
import { resolveTemplatePreview } from '@/lib/templateResolver';
import type { AIConfig } from '@/types';

const defaultConfig = {
  name: '',
  apiUrl: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.8,
  maxTokens: 8192,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

const MODEL_PRESETS = [
  { name: 'Ollama 本地', apiUrl: 'http://localhost:11434', model: 'qwen2.5:14b' },
  { name: 'DeepSeek V4 Pro', apiUrl: 'https://api.deepseek.com', model: 'deepseek-v4-pro' },
  { name: 'DeepSeek V4 Flash', apiUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash' },
  { name: 'DeepSeek V3', apiUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: 'DeepSeek R1', apiUrl: 'https://api.deepseek.com', model: 'deepseek-reasoner' },
  { name: 'GPT-4o', apiUrl: 'https://api.openai.com', model: 'gpt-4o' },
  { name: 'GPT-4o-mini', apiUrl: 'https://api.openai.com', model: 'gpt-4o-mini' },
  { name: 'Claude 3.5 Sonnet', apiUrl: 'https://api.anthropic.com', model: 'claude-3-5-sonnet-20241022' },
  { name: 'Qwen Max', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode', model: 'qwen-max' },
  { name: 'GLM-4', apiUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' },
  { name: 'Moonshot', apiUrl: 'https://api.moonshot.cn', model: 'moonshot-v1-8k' },
];

export function AIConfigPage() {
  const theme = useNavStore((s) => s.theme);
  const isDark = theme === 'dark';
  const { configs, activeConfigId, failoverConfigId, loading, loadConfigs, addConfig, editConfig, removeConfig, setActiveConfig, setFailoverConfig } =
    useConfigStore();
  const { templates, loading: tplLoading, loadTemplates, addTemplate, editTemplate, removeTemplate } = useTemplateStore();

  const [activeTab, setActiveTab] = useState<'configs' | 'templates' | 'rules' | 'protagonist' | 'gm' | 'shortcuts'>('configs');
  const [globalRules, setGlobalRules] = useState('');
  const [rulesSaved, setRulesSaved] = useState(false);
  const [showTplForm, setShowTplForm] = useState(false);
  const [tplForm, setTplForm] = useState({ id: '', name: '', description: '', systemPrompt: '' });
  const [editingTplId, setEditingTplId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIConfig | null>(null);
  const [form, setForm] = useState({ ...defaultConfig });
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadGlobalRules = async () => {
    try {
      const rules = await window.electronAPI.getSetting('global_rules');
      setGlobalRules(rules ?? '');
    } catch { /* settings table might not exist yet */ }
  };

  const saveGlobalRules = async () => {
    await window.electronAPI.setSetting('global_rules', globalRules);
    setRulesSaved(true);
    setTimeout(() => setRulesSaved(false), 2000);
  };

  // Protagonist settings
  const [protagName, setProtagName] = useState('');
  const [protagPersonality, setProtagPersonality] = useState('');
  const [protagBackground, setProtagBackground] = useState('');
  const [protagAppearance, setProtagAppearance] = useState('');
  const [protagGlobal, setProtagGlobal] = useState(false);
  const [protagSaved, setProtagSaved] = useState(false);

  const loadProtagonist = async () => {
    try {
      const data = await window.electronAPI.getSetting('protagonist_data');
      const global = await window.electronAPI.getSetting('protagonist_global');
      if (data) {
        const p = JSON.parse(data);
        setProtagName(p.name || '');
        setProtagPersonality(p.personality || '');
        setProtagBackground(p.background || '');
        setProtagAppearance(p.appearance || '');
      }
      setProtagGlobal(global === '1');
    } catch { /* not set yet */ }
  };

  const saveProtagonist = async () => {
    await window.electronAPI.setSetting('protagonist_data', JSON.stringify({
      name: protagName, personality: protagPersonality,
      background: protagBackground, appearance: protagAppearance,
    }));
    await window.electronAPI.setSetting('protagonist_global', protagGlobal ? '1' : '0');
    setProtagSaved(true);
    setTimeout(() => setProtagSaved(false), 2000);
  };

  // GM settings
  const [gmStyle, setGmStyle] = useState('immersive');
  const [gmDetail, setGmDetail] = useState('rich');
  const [gmPacing, setGmPacing] = useState('balanced');
  const [gmDice, setGmDice] = useState(false);
  const [gmCustom, setGmCustom] = useState('');
  const [gmSaved, setGmSaved] = useState(false);

  const loadGmSettings = async () => {
    try {
      const data = await window.electronAPI.getSetting('gm_settings');
      if (data) {
        const g = JSON.parse(data);
        setGmStyle(g.style || 'immersive');
        setGmDetail(g.detail || 'rich');
        setGmPacing(g.pacing || 'balanced');
        setGmDice(g.dice || false);
        setGmCustom(g.custom || '');
      }
    } catch { /* not set */ }
  };

  const saveGmSettings = async () => {
    await window.electronAPI.setSetting('gm_settings', JSON.stringify({
      style: gmStyle, detail: gmDetail, pacing: gmPacing,
      dice: gmDice, custom: gmCustom,
    }));
    setGmSaved(true);
    setTimeout(() => setGmSaved(false), 2000);
  };

  // Chat shortcuts
  const [shortcuts, setShortcuts] = useState<string[]>(['', '', '', '', '']);
  const [shortcutsSaved, setShortcutsSaved] = useState(false);

  const loadShortcuts = async () => {
    try {
      const data = await window.electronAPI.getSetting('chat_shortcuts');
      if (data) setShortcuts(JSON.parse(data));
    } catch { /* not set */ }
  };

  // en: Load all persisted settings on mount / zh: 挂载时加载所有持久化设置
  useEffect(() => {
    loadConfigs();
    loadTemplates();
    loadGlobalRules();
    loadProtagonist();
    loadGmSettings();
    loadShortcuts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveShortcuts = async () => {
    const filtered = shortcuts.filter((s) => s.trim());
    await window.electronAPI.setSetting('chat_shortcuts', JSON.stringify(filtered));
    setShortcutsSaved(true);
    setTimeout(() => setShortcutsSaved(false), 2000);
  };

  const openCreate = () => {
    setEditingConfig(null);
    setForm({ ...defaultConfig });
    setShowApiKey(false);
    setHasExistingKey(false);
    setShowForm(true);
  };

  const openEdit = (config: AIConfig) => {
    setEditingConfig(config);
    setForm({
      name: config.name,
      apiUrl: config.apiUrl,
      apiKey: '',
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
    });
    setShowApiKey(false);
    setHasExistingKey(!!config.apiKeyEncrypted);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.apiUrl.trim() || !form.model.trim()) return;

    // en: Warn if encryption is unavailable (Linux without keychain) — API key stored as plaintext
    // zh: 密钥链不可用时警告—API Key 以明文存储
    if (form.apiKey && !(await window.electronAPI.isEncryptionAvailable())) {
      const ok = confirm(
        '⚠️ 系统密钥链不可用。API Key 将以明文存储，建议在支持密钥链的环境中运行（如 Windows/macOS 或安装了 gnome-keyring 的 Linux）。\n\n是否继续保存？'
      );
      if (!ok) return;
    }

    const data = {
      name: form.name.trim(),
      apiUrl: form.apiUrl.trim(),
      model: form.model.trim(),
      temperature: form.temperature,
      maxTokens: form.maxTokens,
      topP: form.topP,
      frequencyPenalty: form.frequencyPenalty,
      presencePenalty: form.presencePenalty,
    };

    if (editingConfig) {
      await editConfig(editingConfig.id, { ...data, apiKey: form.apiKey || undefined });
    } else {
      await addConfig({ id: generateId(), ...data, apiKey: form.apiKey });
    }
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await removeConfig(id);
  };

  const handleTestApi = async (configId: string) => {
    setTestingId(configId);
    setTestResult(null);
    try {
      const result = await window.electronAPI.testApi(configId);
      setTestResult({
        ok: result.ok,
        msg: result.ok ? `✅ 连接成功！模型回复：「${result.reply}」` : `❌ ${result.error}`,
      });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `❌ ${err.message}` });
    }
    setTestingId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">⚙️ AI 配置</h2>
            <p className="text-sm text-gray-500 mt-1">管理 OpenAI 兼容 API 的配置，支持多组切换</p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + 添加配置
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">
                {editingConfig ? '编辑配置' : '添加配置'}
              </h3>

              {/* Quick presets */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">快捷预设（自动填入接口地址和模型）</label>
                <div className="flex gap-1.5 flex-wrap">
                  {MODEL_PRESETS.map((preset) => (
                    <button
                      key={preset.model}
                      type="button"
                      onClick={() => setForm({ ...form, apiUrl: preset.apiUrl, model: preset.model, name: form.name || preset.name })}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                        form.apiUrl === preset.apiUrl && form.model === preset.model
                          ? 'bg-purple-900/50 text-purple-300 border-purple-500/50'
                          : 'bg-gray-700/50 text-gray-400 border-gray-600 hover:border-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>配置名称 *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="如：OpenAI、DeepSeek"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">API 地址 *</label>
                  <input
                    type="text"
                    value={form.apiUrl}
                    onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="https://api.openai.com"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">OpenAI 兼容格式，会自动拼接 /v1/chat/completions</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-gray-400">
                      API Key {editingConfig ? '' : <span className="text-red-400">*</span>}
                    </label>
                    {editingConfig && hasExistingKey && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        🔒 已保存密钥 · 留空保持不变
                      </span>
                    )}
                    {editingConfig && !hasExistingKey && (
                      <span className="text-xs text-yellow-400">⚠️ 未设置密钥</span>
                    )}
                    {!editingConfig && !form.apiKey && (
                      <span className="text-xs text-red-400">必填</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-sm text-gray-100 focus:outline-none focus:border-purple-500 font-mono"
                      placeholder={editingConfig ? '输入新密钥覆盖旧密钥，或留空不变' : 'sk-...'}
                      required={!editingConfig}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                      tabIndex={-1}
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    🔐 使用操作系统安全存储加密保存 · 加密后无法逆向查看
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">模型名称 *</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="deepseek-v4-pro"
                    list="model-presets"
                    required
                  />
                  <datalist id="model-presets">
                    {MODEL_PRESETS.map((p) => (
                      <option key={p.model} value={p.model}>{p.name}</option>
                    ))}
                  </datalist>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      温度 ({form.temperature})
                      <span className="text-xs text-gray-600 ml-1">控制随机性</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={form.temperature}
                      onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                      <span>0 稳定</span><span>1 平衡</span><span>2 随机</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">低→回答稳定一致；高→更有创意和变化。角色扮演建议 0.7~0.9</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      最大 Token ({form.maxTokens})
                      <span className="text-xs text-gray-600 ml-1">单次回复上限</span>
                    </label>
                    <input
                      type="number"
                      value={form.maxTokens}
                      onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 2048 })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                      min={1}
                      max={1048576}
                    />
                    <p className="text-xs text-gray-600 mt-1">限制 AI 单次回复的最大长度。1 中文 ≈ 1.5 token</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Top P
                      <span className="text-xs text-gray-600 ml-1">核采样</span>
                    </label>
                    <input
                      type="number"
                      value={form.topP}
                      onChange={(e) => setForm({ ...form, topP: parseFloat(e.target.value) || 1 })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                      min={0}
                      max={1}
                      step={0.05}
                    />
                    <p className="text-xs text-gray-600 mt-1">只从概率累积到 P 的词中采样。1.0=不限制，建议 0.9~1.0</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      频率惩罚
                      <span className="text-xs text-gray-600 ml-1">防重复</span>
                    </label>
                    <input
                      type="number"
                      value={form.frequencyPenalty}
                      onChange={(e) => setForm({ ...form, frequencyPenalty: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                      min={-2}
                      max={2}
                      step={0.1}
                    />
                    <p className="text-xs text-gray-600 mt-1">越高 AI 越避免重复用词。角色扮演建议 0~0.3</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      存在惩罚
                      <span className="text-xs text-gray-600 ml-1">拓话题</span>
                    </label>
                    <input
                      type="number"
                      value={form.presencePenalty}
                      onChange={(e) => setForm({ ...form, presencePenalty: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                      min={-2}
                      max={2}
                      step={0.1}
                    />
                    <p className="text-xs text-gray-600 mt-1">越高 AI 越倾向聊新话题。角色扮演建议 0~0.3</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {editingConfig ? '保存' : '添加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('configs')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'configs' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
            API 配置
          </button>
          <button onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'templates' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
            提示词模板
          </button>
          <button onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'rules' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
            📜 全局规则
          </button>
          <button onClick={() => setActiveTab('protagonist')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'protagonist' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
            🧑 主角设定
          </button>
          <button onClick={() => setActiveTab('gm')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'gm' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
            🎲 GM 设置
          </button>
          <button onClick={() => setActiveTab('shortcuts')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'shortcuts' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
            ⚡ 快捷输入
          </button>
        </div>

        {/* Config List */}
        {activeTab === 'configs' && (
          loading ? (
            <div className="text-center text-gray-500 py-12">加载中...</div>
          ) : configs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">⚙️</div>
              <p className="text-gray-500 mb-4">还没有 API 配置</p>
              <button onClick={openCreate} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">+ 添加配置</button>
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <div key={config.id} className={`bg-gray-800 rounded-xl border p-4 transition-all ${activeConfigId === config.id ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-gray-700'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-100">{config.name}</h3>
                        {activeConfigId === config.id && <span className="text-xs bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full">当前使用</span>}
                        {failoverConfigId === config.id && <span className="text-xs bg-yellow-900/60 text-yellow-300 px-2 py-0.5 rounded-full">备用</span>}
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>地址：{config.apiUrl}</div>
                        <div>模型：{config.model} · 温度：{config.temperature} · Max Tokens：{config.maxTokens}</div>
                        <div>{config.apiKeyEncrypted ? '🔒 密钥已加密存储' : '⚠️ 未设置 API Key'}</div>
                      </div>
                      {activeConfigId === config.id && configs.length > 1 && (
                        <div className="mt-2">
                          <label className="text-xs text-gray-500 mr-2">故障转移备用：</label>
                          <select value={failoverConfigId ?? ''}
                            onChange={(e) => setFailoverConfig(e.target.value || null)}
                            className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-300">
                            <option value="">不使用备用</option>
                            {configs.filter((c) => c.id !== config.id).map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleTestApi(config.id)}
                        disabled={testingId === config.id}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 rounded transition-colors"
                        title="测试连接"
                      >
                        {testingId === config.id ? '⏳' : '🔌 测试'}
                      </button>
                      {activeConfigId !== config.id && (
                        <button onClick={() => setActiveConfig(config.id)} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors">使用</button>
                      )}
                      <button onClick={() => openEdit(config)} className="text-gray-500 hover:text-blue-400 p-1 text-xs" title="编辑">✏️</button>
                      <button onClick={() => handleDelete(config.id)} className="text-gray-500 hover:text-red-400 p-1 text-xs" title="删除">🗑️</button>
                    </div>
                  </div>
                  {testResult && (
                    <div className={`mt-2 text-xs px-3 py-1.5 rounded-lg ${
                      testResult.ok ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'
                    }`}>
                      {testResult.msg}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Template List */}
        {activeTab === 'templates' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setEditingTplId(null); setTplForm({ id: '', name: '', description: '', systemPrompt: '' }); setShowTplForm(true); }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors">
                + 新建模板
              </button>
            </div>
            {tplLoading ? (
              <div className="text-center text-gray-500 py-12">加载中...</div>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-100 text-sm">{tpl.name}</h3>
                        <p className="text-xs text-gray-500">{tpl.description}</p>
                      </div>
                      <div className="flex gap-1">
                        {!tpl.isBuiltIn && (
                          <>
                            <button onClick={() => { setEditingTplId(tpl.id); setTplForm({ id: tpl.id, name: tpl.name, description: tpl.description, systemPrompt: tpl.systemPrompt }); setShowTplForm(true); }}
                              className="text-gray-500 hover:text-blue-400 p-1 text-xs">✏️</button>
                            <button onClick={() => removeTemplate(tpl.id)} className="text-gray-500 hover:text-red-400 p-1 text-xs">🗑️</button>
                          </>
                        )}
                        {tpl.isBuiltIn && <span className="text-xs text-gray-600">内置</span>}
                      </div>
                    </div>
                    <pre className="text-xs text-gray-400 bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">{resolveTemplatePreview(tpl)}</pre>
                  </div>
                ))}
              </div>
            )}

            {/* Template Form Modal */}
            {showTplForm && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg mx-4">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4">{editingTplId ? '编辑模板' : '新建模板'}</h3>
                  <form onSubmit={async (e) => { e.preventDefault();
                    if (!tplForm.name.trim() || !tplForm.systemPrompt.trim()) return;
                    if (editingTplId) {
                      await editTemplate(editingTplId, { name: tplForm.name, description: tplForm.description, systemPrompt: tplForm.systemPrompt });
                    } else {
                      await addTemplate({ id: generateId(), name: tplForm.name, description: tplForm.description, systemPrompt: tplForm.systemPrompt, createdAt: Date.now() });
                    }
                    setShowTplForm(false);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">名称 *</label>
                      <input type="text" value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500" required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">描述</label>
                      <input type="text" value={tplForm.description} onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">提示词 *</label>
                      <textarea value={tplForm.systemPrompt} onChange={(e) => setTplForm({ ...tplForm, systemPrompt: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-40 resize-none font-mono"
                        placeholder="可用变量：{name}, {personality}, {background}, {speakingStyle}, {appearance}, {scriptBackground}" required />
                      <p className="text-xs text-gray-600 mt-1">可用变量：{'{name}'}, {'{personality}'}, {'{background}'}, {'{speakingStyle}'}, {'{appearance}'}, {'{scriptBackground}'}</p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setShowTplForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">取消</button>
                      <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">{editingTplId ? '保存' : '创建'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* Global Rules */}
        {activeTab === 'rules' && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-100">📜 全局 AI 行为规则</h3>
                <p className="text-xs text-gray-500 mt-1">所有模型、所有角色、所有对话都会自动遵循这些规则。每行一条。</p>
              </div>
              <button onClick={saveGlobalRules}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  rulesSaved ? 'bg-green-900/50 text-green-400' : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}>
                {rulesSaved ? '✓ 已保存' : '保存规则'}
              </button>
            </div>
            <textarea
              value={globalRules}
              onChange={(e) => { setGlobalRules(e.target.value); setRulesSaved(false); }}
              placeholder={`示例规则（每行一条）：&#10;始终用中文回复&#10;回复不少于50字&#10;不要使用颜文字&#10;拒绝色情和暴力内容`}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-48 resize-none font-mono"
              spellCheck={false}
            />
            <p className="text-xs text-gray-600 mt-2">
              这些规则会被注入到每一次对话的系统提示词最前面，优先级高于角色设定和模板。
            </p>
          </div>
        )}

        {/* Chat Shortcuts */}
        {activeTab === 'shortcuts' && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-100">⚡ 聊天快捷输入</h3>
                <p className="text-xs text-gray-500 mt-1">聊天输入框上方显示快捷按钮，点击直接发送。留空则不显示。</p>
              </div>
              <button onClick={saveShortcuts}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${shortcutsSaved ? 'bg-green-900/50 text-green-400' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                {shortcutsSaved ? '✓ 已保存' : '保存'}
              </button>
            </div>
            <div className="space-y-2">
              {shortcuts.map((s, i) => (
                <input key={i} type="text" value={s}
                  onChange={(e) => {
                    const n = [...shortcuts]; n[i] = e.target.value;
                    setShortcuts(n); setShortcutsSaved(false);
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                  placeholder={`快捷输入 ${i + 1}...`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Protagonist Settings */}
        {activeTab === 'protagonist' && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-100">🧑 主角设定（你的角色）</h3>
                <p className="text-xs text-gray-500 mt-1">设定你在故事中的身份和性格，AI 将以此为基础与你互动。</p>
              </div>
              <button onClick={saveProtagonist}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  protagSaved ? 'bg-green-900/50 text-green-400' : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}>
                {protagSaved ? '✓ 已保存' : '保存设定'}
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <div className="text-sm text-gray-200">🌐 全局生效</div>
                  <div className="text-xs text-gray-500">开启后，所有对话都会自动注入你的主角设定</div>
                </div>
                <button onClick={() => setProtagGlobal(!protagGlobal)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${protagGlobal ? 'bg-green-600' : 'bg-gray-600'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${protagGlobal ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">姓名</label>
                <input type="text" value={protagName}
                  onChange={(e) => { setProtagName(e.target.value); setProtagSaved(false); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                  placeholder="你在故事中的名字" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">性格</label>
                <textarea value={protagPersonality}
                  onChange={(e) => { setProtagPersonality(e.target.value); setProtagSaved(false); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                  placeholder="你的性格特点..." />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">背景故事</label>
                <textarea value={protagBackground}
                  onChange={(e) => { setProtagBackground(e.target.value); setProtagSaved(false); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                  placeholder="你的来历和经历..." />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">外貌</label>
                <textarea value={protagAppearance}
                  onChange={(e) => { setProtagAppearance(e.target.value); setProtagSaved(false); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-16 resize-none"
                  placeholder="你的外貌描述..." />
              </div>
            </div>
          </div>
        )}

        {/* GM Settings */}
        {activeTab === 'gm' && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-100">🎲 GM 主持设置</h3>
                <p className="text-xs text-gray-500 mt-1">配置世界参与模式下 AI 作为 Game Master 的叙事风格。</p>
              </div>
              <button onClick={saveGmSettings}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${gmSaved ? 'bg-green-900/50 text-green-400' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                {gmSaved ? '✓ 已保存' : '保存'}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">叙事风格</label>
                <div className="flex gap-2">
                  {[
                    { v: 'immersive', label: '🎬 沉浸式', desc: '画面感强，细节丰富' },
                    { v: 'concise', label: '📝 简洁', desc: '节奏快，直奔主题' },
                    { v: 'literary', label: '📖 小说级', desc: '文学性强，描写细腻' },
                  ].map((opt) => (
                    <button key={opt.v} onClick={() => setGmStyle(opt.v)}
                      className={`flex-1 py-2 rounded-lg text-xs transition-colors ${gmStyle === opt.v ? 'bg-purple-900/50 text-purple-300 border border-purple-500/50' : 'bg-gray-900 text-gray-400 border border-gray-700 hover:border-gray-500'}`}
                      title={opt.desc}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">细节程度</label>
                <div className="flex gap-2">
                  {[
                    { v: 'minimal', label: '精简' },
                    { v: 'moderate', label: '适中' },
                    { v: 'rich', label: '丰富' },
                  ].map((opt) => (
                    <button key={opt.v} onClick={() => setGmDetail(opt.v)}
                      className={`flex-1 py-2 rounded-lg text-xs transition-colors ${gmDetail === opt.v ? 'bg-purple-900/50 text-purple-300 border border-purple-500/50' : 'bg-gray-900 text-gray-400 border border-gray-700 hover:border-gray-500'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">剧情节奏</label>
                <div className="flex gap-2">
                  {[
                    { v: 'fast', label: '⚡ 快速' },
                    { v: 'balanced', label: '⚖️ 平衡' },
                    { v: 'slow', label: '🐢 慢热' },
                  ].map((opt) => (
                    <button key={opt.v} onClick={() => setGmPacing(opt.v)}
                      className={`flex-1 py-2 rounded-lg text-xs transition-colors ${gmPacing === opt.v ? 'bg-purple-900/50 text-purple-300 border border-purple-500/50' : 'bg-gray-900 text-gray-400 border border-gray-700 hover:border-gray-500'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <div className="text-sm text-gray-200">🎲 骰子判定</div>
                  <div className="text-xs text-gray-500">允许 GM 使用 D20 等骰子进行成功率判定</div>
                </div>
                <button onClick={() => setGmDice(!gmDice)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${gmDice ? 'bg-green-600' : 'bg-gray-600'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${gmDice ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">自定义 GM 指令</label>
                <textarea value={gmCustom}
                  onChange={(e) => { setGmCustom(e.target.value); setGmSaved(false); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 h-20 resize-none"
                  placeholder="额外GM行为指令，如：开局必须从酒馆开始、禁止使用现代词汇..." />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
