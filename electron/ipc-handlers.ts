import { ipcMain, dialog, BrowserWindow } from 'electron';
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
} from './database';
import { encryptApiKey, decryptApiKey } from './safe-storage';

let activeAbortController: AbortController | null = null;

function rowToScript(row: any) {
  const fallback: any = {
    mainQuests: '', sideQuests: '', environment: '', map: '', data: '',
    tags: '', referenceWorks: '', eraBackground: '', protagonistDilemma: '',
    coreCheat: '', ageRule: '', timeline: '', chapters: '', narrativeMode: 'mode3', strictMode: 'strict',
    workflowMode: 'guided', recapMode: 'N', periodicSummary: 'O', ruleSelfCheck: 'Y',
  };
  let extraData = { ...fallback };
  try { if (row.extra_data) extraData = { ...fallback, ...JSON.parse(row.extra_data) }; } catch { /* ignore */ }
  return {
    id: row.id,
    title: row.title,
    worldSetting: row.world_setting,
    background: row.background,
    extraData,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCharacter(row: any) {
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

function rowToAIConfig(row: any) {
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

function rowToConversation(row: any) {
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

function rowToTemplate(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    systemPrompt: row.system_prompt,
    isBuiltIn: !!row.is_built_in,
    createdAt: row.created_at,
  };
}

function rowToMessage(row: any) {
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
    return row ? rowToScript(row) : null;
  });
  ipcMain.handle('script:create', (_e, data: any) => {
    const row = createScript({
      id: data.id, title: data.title, worldSetting: data.worldSetting,
      background: data.background,
      extraData: data.extraData ? JSON.stringify(data.extraData) : undefined,
      createdAt: data.createdAt, updatedAt: data.updatedAt,
    });
    return rowToScript(row);
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
    return row ? rowToCharacter(row) : null;
  });
  ipcMain.handle('character:create', (_e, data: any) => {
    const row = createCharacter({
      id: data.id, scriptId: data.scriptId, name: data.name,
      personality: data.personality, background: data.background,
      speakingStyle: data.speakingStyle, appearance: data.appearance,
      avatar: data.avatar, createdAt: data.createdAt,
    });
    return rowToCharacter(row);
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
    return row ? rowToAIConfig(row) : null;
  });
  ipcMain.handle('aiConfig:create', (_e, data: any) => {
    // Encrypt the API key before storing
    const apiKeyEncrypted = data.apiKey ? encryptApiKey(data.apiKey) : '';
    const row = createAIConfig({
      id: data.id, name: data.name, apiUrl: data.apiUrl,
      apiKeyEncrypted, model: data.model,
      temperature: data.temperature, maxTokens: data.maxTokens,
      topP: data.topP, frequencyPenalty: data.frequencyPenalty,
      presencePenalty: data.presencePenalty,
    });
    return rowToAIConfig(row);
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
    return row ? rowToConversation(row) : null;
  });
  ipcMain.handle('conversation:create', (_e, data: any) => {
    const row = createConversation({
      id: data.id, scriptId: data.scriptId, characterId: data.characterId,
      parentId: data.parentId ?? null,
      title: data.title, createdAt: data.createdAt, updatedAt: data.updatedAt,
    });
    return rowToConversation(row);
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
    const row = createMessage({
      id: data.id, conversationId: data.conversationId,
      role: data.role, content: data.content, timestamp: data.timestamp,
    });
    return rowToMessage(row);
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
    return row ? rowToTemplate(row) : null;
  });
  ipcMain.handle('template:create', (_e, data: any) => {
    const row = createPromptTemplate({
      id: data.id, name: data.name, description: data.description,
      systemPrompt: data.systemPrompt, isBuiltIn: false, createdAt: data.createdAt,
    });
    return rowToTemplate(row);
  });
  ipcMain.handle('template:update', (_e, id: string, data: any) => {
    const row = updatePromptTemplate(id, data);
    return row ? rowToTemplate(row) : null;
  });
  ipcMain.handle('template:delete', (_e, id: string) => { deletePromptTemplate(id); });

  // ─── Chat: Summary ──────────────────────────────────────
  ipcMain.handle('chat:summary', async (event, configId: string, messages: any[], characterName: string) => {
    const configRow = getAIConfig(configId) as any;
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
      const response = await fetch(`${configRow.api_url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}: ${await response.text()}`);
      }

      const json = await response.json();
      const summary = json.choices?.[0]?.message?.content ?? '无法生成总结';
      win.webContents.send('chat:summaryResult', { summary });
    } catch (err: any) {
      win.webContents.send('chat:summaryResult', { summary: '', error: err.message });
    }
  });

  // ─── Chat (SSE streaming) ───────────────────────────────
  ipcMain.handle('chat:send', async (event, configId: string, messages: any[], failoverConfigId?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error('No window');

    const abortController = new AbortController();
    activeAbortController = abortController;

    // Find conversationId from message context
    let conversationId = '';
    const convMsg = messages.find(m => (m as any)._conversationId);
    if (convMsg) conversationId = (convMsg as any)._conversationId;

    // Try primary config, then failover
    const configIds = [configId];
    if (failoverConfigId && failoverConfigId !== configId) {
      configIds.push(failoverConfigId);
    }

    let lastError: string = '';

    for (const cid of configIds) {
      const configRow = getAIConfig(cid) as any;
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
        const response = await fetch(`${configRow.api_url}/v1/chat/completions`, {
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
          lastError = `API error ${response.status}: ${errText}`;
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

    // All configs failed
    win.webContents.send('chat:error', { error: lastError || 'Unknown error', conversationId });
  });

  ipcMain.handle('chat:stop', () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  });

  // ─── API Test Connection ────────────────────────────────
  ipcMain.handle('api:test', async (_event, configId: string) => {
    const configRow = getAIConfig(configId) as any;
    if (!configRow) return { ok: false, error: '配置不存在' };
    const apiKey = decryptApiKey(configRow.api_key_encrypted);
    if (!apiKey) return { ok: false, error: '未设置 API Key' };

    try {
      const response = await fetch(`${configRow.api_url}/v1/chat/completions`, {
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
        return { ok: false, error: `HTTP ${response.status}: ${errText.slice(0, 200)}` };
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
    const configRow = getAIConfig(configId) as any;
    if (!configRow) throw new Error('AI config not found');
    const apiKey = decryptApiKey(configRow.api_key_encrypted);

    let prompt: string;
    if (type === 'script') {
      prompt = `你是一个剧本创作助手。补全以下空白字段。严格输出JSON格式，只补空白字段，已有内容不改动：
{
  "worldSetting": "世界观（50-150字，如已有则输出空字符串）",
  "background": "背景（100-300字，如已有则输出空字符串）",
  "mainQuests": "主线任务（50-150字）",
  "sideQuests": "支线任务（50-100字）",
  "environment": "环境描述（30-80字）",
  "map": "地图/区域（30-80字）",
  "extraData": "其他数据（势力、等级、货币等，30-80字）"
}

标题：${partial.title || '未命名'}
世界观：${partial.worldSetting || '（空）'}
背景：${partial.background || '（空）'}
主线：${partial.mainQuests || '（空）'}
支线：${partial.sideQuests || '（空）'}
环境：${partial.environment || '（空）'}
地图：${partial.map || '（空）'}
数据：${partial.extraData || '（空）'}

只输出JSON：`;
    } else {
      prompt = `你是一个角色设计助手。根据以下角色姓名，补全性格、背景故事、说话风格和外貌描述。严格输出JSON格式，不要其他文字：
{"personality": "性格（20-50字）", "background": "背景故事（50-150字）", "speakingStyle": "说话风格/口癖（10-30字）", "appearance": "外貌描述（20-50字）"}

角色姓名：${partial.name || '未命名'}
${partial.personality ? `已有性格：${partial.personality}` : ''}
${partial.background ? `已有背景：${partial.background}` : ''}
${partial.speakingStyle ? `已有口癖：${partial.speakingStyle}` : ''}
${partial.appearance ? `已有外貌：${partial.appearance}` : ''}

请直接输出JSON：`;
    }

    try {
      const response = await fetch(`${configRow.api_url}/v1/chat/completions`, {
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
      if (!response.ok) throw new Error(`API error ${response.status}`);
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
    const configRow = getAIConfig(configId) as any;
    if (!configRow) return { reply: '', error: '配置不存在' };
    const apiKey = decryptApiKey(configRow.api_key_encrypted);

    const systemMsg = type === 'script'
      ? `你是专业剧本策划顾问，严格按以下12步工作流引导用户。每步需用户满意确认后才进入下一步。当前剧本：标题「${fields.title || '未定'}」、世界观「${fields.worldSetting || '未定'}」、背景「${fields.background || '未定'}」。主线「${fields.mainQuests || '未填'}」、支线「${fields.sideQuests || '未填'}」、环境「${fields.environment || '未填'}」、地图「${fields.map || '未填'}」。

【十二步工作流】
第零步(可选)：询问用户是否有对标作品(1-3部)，若有则解析文风、世界观、情节模式。
第一步：引导用户用25字一句话概括(谁+什么情况+什么方式+什么结果)。
第二步：扩写为5句话，需三幕式结构+三次灾难+道德前提。
第三步：从每个人物角度整理人名、身份、目标、抱负、价值观、矛盾。
第四步：将第二步每句扩写为段落，可选A故事级/B幕级/C序列级/D场景级。
第五步：深挖核心人物过去经历和原生家庭。
第六步：将一页大纲每段扩展为一页。
第七步：初始化动态实体知识库(角色/物品/地点/势力)，后续自动追踪更新。
第八步：罗列所有场景，每个含矛盾冲突。
第九步：为每个场景写明视点人物、目标/冲突/挫折、反应/困境/决定。
第十步：生成全文逐章创作。
第十一步：提供3-5个候选书名+黄金结构简介。

根据用户当前进度和表单内容判断处于哪一步，给出针对性引导。用中文回复。`
      : `你是角色设计顾问。用户正在设计角色：姓名「${fields.name || '未定'}」、性格「${fields.personality || '未定'}」、背景「${fields.background || '未定'}」、口癖「${fields.speakingStyle || '未定'}」、外貌「${fields.appearance || '未定'}」。请帮用户分析并给出建议。用中文回复，简洁直接。`;

    try {
      const response = await fetch(`${configRow.api_url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: configRow.model,
          messages: [{ role: 'system', content: systemMsg }, ...history],
          temperature: 0.7, max_tokens: 8192, stream: false,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
