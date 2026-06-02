import { ipcMain, dialog, BrowserWindow, safeStorage } from 'electron';
import {
  getAllScripts, getScript, createScript, updateScript, deleteScript,
  getAllCharacters, getCharacter, createCharacter, updateCharacter, deleteCharacter,
  getAllAIConfigs, getAIConfig, createAIConfig, updateAIConfig, deleteAIConfig,
  getAllConversations, getConversation, createConversation, updateConversation, deleteConversation,
  getAllMessages, createMessage, updateMessage, deleteMessagesAfter,
  getAllPromptTemplates, getPromptTemplate, createPromptTemplate, updatePromptTemplate, deletePromptTemplate,
  getConversationBranches,
  exportAllData, importAllData,
  getSetting, setSetting,
} from './db';
import { encryptApiKey, decryptApiKey } from './safe-storage';
import { aiCompleteScriptPrompt, aiCompleteCharacterPrompt, discussScriptPrompt, discussCharacterPrompt } from './prompts';
import { validateId, validateText, validateRole, normalizeApiUrl } from './validate';
import type { ScriptRow, CharacterRow, AIConfigRow, ConversationRow, MessageRow, TemplateRow } from './db/types';

/** en: Translate raw fetch errors into user-friendly messages.
 *  zh: 将原始 fetch 错误转为用户可读的提示。 */
function friendlyError(status: number, message: string): string {
  if (status === 401) return '❌ API Key 无效或已过期，请在 AI 配置中更新。';
  if (status === 403) return '❌ 访问被拒绝，请检查 API Key 权限。';
  if (status === 429) return '⏳ 请求过于频繁，请稍后再试。';
  if (status === 500 || status === 502 || status === 503) return `❌ API 服务器故障 (${status})，请稍后重试。`;
  if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED') || message.includes('fetch failed')) return '🔌 无法连接到 API 服务器，请检查网络或 API 地址。';
  if (message.includes('ETIMEDOUT') || message.includes('AbortError')) return '⏰ 请求超时，请检查网络或 API 地址。';
  return `❌ API 错误 (${status}): ${message.slice(0, 200)}`;
}

let activeAbortController: AbortController | null = null;

function rowToScript(row: ScriptRow) {
  const fallback: any = {
    mainQuests: '', sideQuests: '', environment: '', map: '', data: '',
    tags: '', referenceWorks: '', eraBackground: '', protagonistDilemma: '',
    coreCheat: '', ageRule: '', timeline: '', chapters: '', narrativeMode: 'mode3', strictMode: 'strict',
    workflowMode: 'guided', recapMode: 'N', periodicSummary: 'O', ruleSelfCheck: 'Y', banghuiEnabled: 'N',
  };
  let extraData = { ...fallback };
  let parseError = false;
  try { if (row.extra_data) extraData = { ...fallback, ...JSON.parse(row.extra_data) }; } catch (err) {
    console.error('[rowToScript] JSON parse error for script', row.id, '— falling back to defaults:', err);
    parseError = true;
  }
  return {
    id: row.id,
    title: row.title,
    worldSetting: row.world_setting,
    background: row.background,
    extraData,
    _parseError: parseError || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCharacter(row: CharacterRow) {
  return {
    id: row.id,
    scriptId: row.script_id,
    name: row.name,
    personality: row.personality,
    background: row.background,
    speakingStyle: row.speaking_style,
    appearance: row.appearance,
    avatar: row.avatar,
    createdAt: row.created_at,
  };
}

function rowToAIConfig(row: AIConfigRow) {
  return {
    id: row.id,
    name: row.name,
    apiUrl: row.api_url,
    apiKeyEncrypted: row.api_key_encrypted,
    model: row.model,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    topP: row.top_p,
    frequencyPenalty: row.frequency_penalty,
    presencePenalty: row.presence_penalty,
  };
}

function rowToConversation(row: ConversationRow) {
  return {
    id: row.id,
    scriptId: row.script_id,
    characterId: row.character_id,
    parentId: row.parent_id ?? null,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTemplate(row: TemplateRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    systemPrompt: row.system_prompt,
    isBuiltIn: !!row.is_built_in,
    createdAt: row.created_at,
  };
}

function rowToMessage(row: MessageRow) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp,
  };
}

export function registerIpcHandlers(): void {
  // ─── Scripts ────────────────────────────────────────────
  ipcMain.handle('script:getAll', () => getAllScripts().map(rowToScript));
  ipcMain.handle('script:get', (_e, id: string) => {
    const row = getScript(id);
    return row ? rowToScript(row!) : null;
  });
  ipcMain.handle('script:create', (_e, data: any) => {
    validateId(data.id, '剧本ID');
    validateText(data.title, '剧本标题', 200);
    const row = createScript({
      id: data.id, title: data.title, worldSetting: data.worldSetting,
      background: data.background,
      extraData: data.extraData ? JSON.stringify(data.extraData) : undefined,
      createdAt: data.createdAt, updatedAt: data.updatedAt,
    });
    return rowToScript(row!);
  });
  ipcMain.handle('script:update', (_e, id: string, data: any) => {
    const updateData: any = { ...data };
    if (data.extraData) updateData.extraData = JSON.stringify(data.extraData);
    const row = updateScript(id, updateData);
    return row ? rowToScript(row) : null;
  });
  ipcMain.handle('script:delete', (_e, id: string) => { deleteScript(id); });

  // ─── Characters ─────────────────────────────────────────
  ipcMain.handle('character:getAll', (_e, scriptId: string) =>
    getAllCharacters(scriptId).map(rowToCharacter));
  ipcMain.handle('character:get', (_e, id: string) => {
    const row = getCharacter(id);
    return row ? rowToCharacter(row!) : null;
  });
  ipcMain.handle('character:create', (_e, data: any) => {
    validateId(data.id, '角色ID');
    validateText(data.name, '角色名', 100);
    validateId(data.scriptId, '剧本ID');
    const row = createCharacter({
      id: data.id, scriptId: data.scriptId, name: data.name,
      personality: data.personality, background: data.background,
      speakingStyle: data.speakingStyle, appearance: data.appearance,
      avatar: data.avatar, createdAt: data.createdAt,
    });
    return rowToCharacter(row!);
  });
  ipcMain.handle('character:update', (_e, id: string, data: any) => {
    const row = updateCharacter(id, data);
    return row ? rowToCharacter(row) : null;
  });
  ipcMain.handle('character:delete', (_e, id: string) => { deleteCharacter(id); });

  // ─── AI Configs ─────────────────────────────────────────
  ipcMain.handle('aiConfig:getAll', () => getAllAIConfigs().map(rowToAIConfig));
  ipcMain.handle('aiConfig:get', (_e, id: string) => {
    const row = getAIConfig(id);
    return row ? rowToAIConfig(row!) : null;
  });
  ipcMain.handle('aiConfig:create', (_e, data: any) => {
    validateId(data.id, '配置ID');
    validateText(data.name, '配置名', 100);
    validateText(data.apiUrl, 'API地址', 500);
    // Encrypt the API key before storing
    const apiKeyEncrypted = data.apiKey ? encryptApiKey(data.apiKey) : '';
    const row = createAIConfig({
      id: data.id, name: data.name, apiUrl: data.apiUrl,
      apiKeyEncrypted, model: data.model,
      temperature: data.temperature, maxTokens: data.maxTokens,
      topP: data.topP, frequencyPenalty: data.frequencyPenalty,
      presencePenalty: data.presencePenalty,
    });
    return rowToAIConfig(row!);
  });
  ipcMain.handle('aiConfig:update', (_e, id: string, data: any) => {
    const updateData: any = { ...data };
    if (data.apiKey !== undefined) {
      updateData.apiKeyEncrypted = data.apiKey ? encryptApiKey(data.apiKey) : '';
      delete updateData.apiKey;
    }
    const row = updateAIConfig(id, updateData);
    return row ? rowToAIConfig(row) : null;
  });
  ipcMain.handle('aiConfig:delete', (_e, id: string) => { deleteAIConfig(id); });

  // ─── Conversations ──────────────────────────────────────
  ipcMain.handle('conversation:getAll', (_e, scriptId?: string, characterId?: string) =>
    getAllConversations(scriptId, characterId).map(rowToConversation));
  ipcMain.handle('conversation:get', (_e, id: string) => {
    const row = getConversation(id);
    return row ? rowToConversation(row!) : null;
  });
  ipcMain.handle('conversation:create', (_e, data: any) => {
    validateId(data.id, '对话ID');
    validateId(data.scriptId, '剧本ID');
    const row = createConversation({
      id: data.id, scriptId: data.scriptId, characterId: data.characterId,
      parentId: data.parentId ?? null,
      title: data.title, createdAt: data.createdAt, updatedAt: data.updatedAt,
    });
    return rowToConversation(row!);
  });
  ipcMain.handle('conversation:branches', (_e, id: string) => getConversationBranches(id));
  ipcMain.handle('conversation:update', (_e, id: string, data: any) => {
    const row = updateConversation(id, data);
    return row ? rowToConversation(row) : null;
  });
  ipcMain.handle('conversation:delete', (_e, id: string) => { deleteConversation(id); });

  // ─── Messages ───────────────────────────────────────────
  ipcMain.handle('message:getAll', (_e, conversationId: string) =>
    getAllMessages(conversationId).map(rowToMessage));
  ipcMain.handle('message:create', (_e, data: any) => {
    validateId(data.id, '消息ID');
    validateRole(data.role);
    validateText(data.content, '消息内容', 50000);
    return createMessage({
      id: data.id, conversationId: data.conversationId,
      role: data.role, content: data.content, timestamp: data.timestamp,
    });
  });
  ipcMain.handle('message:update', (_e, id: string, content: string) => {
    updateMessage(id, content);
  });
  ipcMain.handle('message:deleteAfter', (_e, conversationId: string, afterTimestamp: number) => {
    deleteMessagesAfter(conversationId, afterTimestamp);
  });

  // ─── Prompt Templates ───────────────────────────────────
  ipcMain.handle('template:getAll', () => getAllPromptTemplates().map(rowToTemplate));
  ipcMain.handle('template:get', (_e, id: string) => {
    const row = getPromptTemplate(id);
    return row ? rowToTemplate(row!) : null;
  });
  ipcMain.handle('template:create', (_e, data: any) => {
    const row = createPromptTemplate({
      id: data.id, name: data.name, description: data.description,
      systemPrompt: data.systemPrompt, isBuiltIn: false, createdAt: data.createdAt,
    });
    return rowToTemplate(row!);
  });
  ipcMain.handle('template:update', (_e, id: string, data: any) => {
    const row = updatePromptTemplate(id, data);
    return row ? rowToTemplate(row) : null;
  });
  ipcMain.handle('template:delete', (_e, id: string) => { deletePromptTemplate(id); });

  // ─── Chat: Summary ──────────────────────────────────────
  ipcMain.handle('chat:summary', async (event, configId: string, messages: any[], characterName: string) => {
    const configRow = getAIConfig(configId);
    if (!configRow) throw new Error('AI config not found');

    const apiKey = decryptApiKey(configRow.api_key_encrypted);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error('No window');

    const summaryPrompt = {
      role: 'system',
      content: `请以旁观者视角，用简洁的语言总结以下与${characterName}的对话剧情进展。包含：1）发生了哪些关键事件；2）角色关系如何变化；3）当前剧情处于什么阶段。请用流畅的中文叙述，不超过500字。`,
    };

    const body = {
      model: configRow.model,
      messages: [summaryPrompt, ...messages],
      temperature: 0.5,
      max_tokens: 800,
      stream: false,
    };

    try {
      const response = await fetch(normalizeApiUrl(configRow.api_url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(friendlyError(response.status, errText));
      }

      const json = await response.json();
      const summary = json.choices?.[0]?.message?.content ?? '无法生成总结';
      win.webContents.send('chat:summaryResult', { summary });
    } catch (err: any) {
      win.webContents.send('chat:summaryResult', { summary: '', error: err.message });
    }
  });

  // ─── Chat (SSE streaming - pure event, no handle blocking) ───
  // en: 使用 ipcMain.on 代替 handle，避免长时间阻塞主进程 / Use .on instead of .handle to avoid blocking main process
  ipcMain.on('chat:send', (_event, configId: string, messages: any[], failoverConfigId?: string) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (!win) return;

    // ── Input validation / 输入校验 ──
    try {
      validateId(configId, '配置ID');
    } catch (err: any) {
      win.webContents.send('chat:error', { error: `配置ID无效: ${err.message}`, conversationId: '' });
      return;
    }
    if (!Array.isArray(messages) || messages.length > 200) {
      win.webContents.send('chat:error', { error: `消息数量超限 (最大200, 实际${Array.isArray(messages) ? messages.length : 0})`, conversationId: '' });
      return;
    }
    if (failoverConfigId && failoverConfigId !== configId) {
      try { validateId(failoverConfigId, '备用配置ID'); } catch (err: any) {
        win.webContents.send('chat:error', { error: `备用配置ID无效: ${err.message}`, conversationId: '' });
        return;
      }
    }
    // en: 校验每条消息的 role/content 基本结构 / Validate basic structure of each message
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m || typeof m.role !== 'string' || !['user', 'assistant', 'system'].includes(m.role)) {
        win.webContents.send('chat:error', { error: `消息[${i}] role 无效`, conversationId: '' });
        return;
      }
      if (typeof m.content !== 'string' || m.content.length > 100000) {
        win.webContents.send('chat:error', { error: `消息[${i}] content 无效或超长`, conversationId: '' });
        return;
      }
    }

    // en: 中止前一个请求以避免并发污染 / Abort previous request to prevent concurrent pollution
    if (activeAbortController) { activeAbortController.abort(); }
    const abortController = new AbortController();
    activeAbortController = abortController;

    // Find conversationId from message context
    let conversationId = '';
    const convMsg = messages.find(m => (m as any)._conversationId);
    if (convMsg) conversationId = (convMsg as any)._conversationId;

    /** en: 异步发起 SSE 请求，避免阻塞主进程 / Async SSE request, non-blocking */
    (async () => {
    // Try primary config, then failover
    const configIds = [configId];
    if (failoverConfigId && failoverConfigId !== configId) {
      configIds.push(failoverConfigId);
    }

    let lastError: string = '';

    for (const cid of configIds) {
      const configRow = getAIConfig(cid);
      if (!configRow) continue;

      const apiKey = decryptApiKey(configRow.api_key_encrypted);
      const body = {
        model: configRow.model,
        messages,
        temperature: configRow.temperature,
        max_tokens: configRow.max_tokens,
        top_p: configRow.top_p,
        frequency_penalty: configRow.frequency_penalty,
        presence_penalty: configRow.presence_penalty,
        stream: true,
      };

      try {
        const response = await fetch(normalizeApiUrl(configRow.api_url), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = friendlyError(response.status, errText);
          continue; // try failover
        }

        const reader = response.body?.getReader();
        if (!reader) { lastError = 'No response body'; continue; }

        const decoder = new TextDecoder();
        let buffer = '';
        let doneReceived = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              doneReceived = true;
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                win.webContents.send('chat:token', { token: content, conversationId });
              }
            } catch { /* skip malformed chunks */ }
          }
          if (doneReceived) break;
        }

        win.webContents.send('chat:done', { conversationId });
        return; // success, don't try more configs
      } catch (err: any) {
        if (err.name === 'AbortError') {
          win.webContents.send('chat:done', { conversationId: '' });
          return;
        }
        lastError = err.message || String(err);
        // continue to failover
      }
    }

    // All configs failed / 所有配置均失败
    try { win.webContents.send('chat:error', { error: lastError || 'Unknown error', conversationId }); } catch { /* window gone */ }
    })();
  });

  ipcMain.handle('chat:stop', () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  });

  // ─── API Test Connection ────────────────────────────────
  ipcMain.handle('api:test', async (_event, configId: string) => {
    const configRow = getAIConfig(configId);
    if (!configRow) return { ok: false, error: '配置不存在' };
    const apiKey = decryptApiKey(configRow.api_key_encrypted);
    if (!apiKey) return { ok: false, error: '未设置 API Key' };

    try {
      const response = await fetch(normalizeApiUrl(configRow.api_url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: configRow.model,
          messages: [{ role: 'user', content: '回复OK' }],
          max_tokens: 10,
          stream: false,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        return { ok: false, error: friendlyError(response.status, errText) };
      }
      const json = await response.json();
      const reply = json.choices?.[0]?.message?.content ?? '';
      return { ok: true, reply, model: configRow.model };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  // ─── AI Complete ────────────────────────────────────────
  ipcMain.handle('ai:complete', async (_event, configId: string, type: 'script' | 'character', partial: any) => {
    const configRow = getAIConfig(configId);
    if (!configRow) throw new Error('AI config not found');
    const apiKey = decryptApiKey(configRow.api_key_encrypted);

    const prompt = type === 'script'
      ? aiCompleteScriptPrompt(partial)
      : aiCompleteCharacterPrompt(partial);

    try {
      const response = await fetch(normalizeApiUrl(configRow.api_url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: configRow.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 4096,
          stream: false,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(friendlyError(response.status, errText));
      }
      const json = await response.json();
      const text = json.choices?.[0]?.message?.content ?? '';
      // Extract JSON from response (handle markdown code blocks)
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : {};
    } catch (err: any) {
      return { error: err.message };
    }
  });

  // ─── AI Discuss Chat ────────────────────────────────────
  ipcMain.handle('ai:discuss', async (_event, configId: string, type: string, fields: any, history: any[]) => {
    const configRow = getAIConfig(configId);
    if (!configRow) return { reply: '', error: '配置不存在' };
    const apiKey = decryptApiKey(configRow.api_key_encrypted);

    const systemMsg = type === 'script'
      ? discussScriptPrompt(fields)
      : discussCharacterPrompt(fields);

    try {
      const response = await fetch(normalizeApiUrl(configRow.api_url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: configRow.model,
          messages: [{ role: 'system', content: systemMsg }, ...history],
          temperature: 0.7, max_tokens: 8192, stream: false,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(friendlyError(response.status, errText));
      }
      const json = await response.json();
      return { reply: json.choices?.[0]?.message?.content ?? '' };
    } catch (err: any) {
      return { reply: '', error: err.message };
    }
  });

  // ─── Global Settings ────────────────────────────────────
  ipcMain.handle('settings:get', (_e, key: string) => getSetting(key));
  ipcMain.handle('settings:set', (_e, key: string, value: string) => { setSetting(key, value); });

  // ─── Import / Export ────────────────────────────────────
  ipcMain.handle('data:export', () => exportAllData());
  ipcMain.handle('data:import', (_e, data: any) => {
    importAllData(data);
    return { success: true };
  });

  // ─── SafeStorage availability check ────────────────────
  ipcMain.handle('safeStorage:isAvailable', () => safeStorage.isEncryptionAvailable());

  // ─── Avatar picker ──────────────────────────────────────
  ipcMain.handle('dialog:pickAvatar', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}
