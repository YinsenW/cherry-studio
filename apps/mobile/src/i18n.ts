import i18n from 'i18next'

void i18n.init({
  fallbackLng: 'zh-CN',
  lng: 'zh-CN',
  resources: {
    'zh-CN': {
      translation: {
        title: 'Pi Agent 移动端 PoC',
        subtitle: '一轮 OpenAI-compatible 文本对话与工具事件展示',
        baseUrl: 'API 地址',
        apiKey: 'API Key',
        model: '模型 ID',
        prompt: '消息',
        apiKeyPlaceholder: '保存在本机 SQLite 数据库',
        send: '发送给助理',
        running: '助理运行中…',
        answer: '助理回复',
        toolEvents: '工具调用事件',
        noAnswer: '等待回复…',
        noToolEvents: '模型尚未调用工具。可使用默认消息验证工具流程。',
        missingConfig: '请填写 API 地址、API Key、模型 ID 和消息。',
        initializing: '正在初始化本地数据…',
        defaultPrompt: '请调用 get_current_time 工具获取当前时间，然后告诉我结果。',
        status: '状态：{{status}}'
      }
    }
  }
})

export default i18n
