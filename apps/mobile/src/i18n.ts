import i18n from 'i18next'

void i18n.init({
  fallbackLng: 'zh-CN',
  lng: 'zh-CN',
  resources: {
    'zh-CN': {
      translation: {
        title: 'Cherry Studio 移动端',
        subtitle: '本地持久化的多会话 Pi Agent 对话',
        chatTab: '对话',
        settingsTab: '设置',
        topics: '话题',
        newTopic: '+ 新建',
        untitledTopic: '新话题',
        noMessages: '这个话题还没有消息。',
        userRole: '你',
        assistantRole: '助理',
        toolRole: '工具：{{name}}',
        bashRole: '命令执行',
        customRole: '消息：{{name}}',
        branchSummaryRole: '分支摘要',
        compactionSummaryRole: '上下文摘要',
        toolCallContent: '调用工具 {{name}}\n{{input}}',
        imageContent: '[图片]',
        emptyMessage: '[空消息]',
        providerSettings: 'Provider 设置',
        providerDescription: '配置保存在本机 SQLite 数据库，并用于之后的所有话题。',
        baseUrl: 'API 地址',
        apiKey: 'API Key',
        model: '模型 ID',
        prompt: '消息',
        apiKeyPlaceholder: '保存在本机 SQLite 数据库',
        saveProvider: '保存 Provider',
        providerSaved: 'Provider 已保存。',
        send: '发送',
        running: '助理运行中…',
        streamingAnswer: '正在回复',
        toolEvents: '工具调用事件',
        noToolEvents: '模型尚未调用工具。可使用默认消息验证工具流程。',
        missingProviderConfig: '请在设置中填写并保存 API 地址、API Key 和模型 ID。',
        missingPrompt: '请输入消息。',
        initializing: '正在初始化本地数据…',
        defaultPrompt: '请调用 get_current_time 工具获取当前时间，然后告诉我结果。',
        status: '状态：{{status}}'
      }
    }
  }
})

export default i18n
