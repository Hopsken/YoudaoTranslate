include('md5.js')

const API_HOST = 'https://openapi.youdao.com/api?from=auto&to=auto'

function run(argument) {
  runWithString(argument)
}

function runWithString(argument) {
  if (!argument) {
    return [{
      title: '请输入'
    }]
  }

  if (argument.startsWith('~')) {
    const actionArgument = argument.substring(1).trim()
    return [
      {
        title: '设置为应用 ID',
        action: 'setCustomClientId',
        actionArgument
      },
      {
        title: '设置为应用密钥',
        action: 'setCustomApiKey',
        actionArgument
      }
    ]
  }

  return getTranslations(argument)
}

/**
 * 配置 ClientID 与 API_KEY
 * @param argument string
 */
function setCustomClientId(argument) {
  Action.preferences.CLIENT_ID = argument
  LaunchBar.alert('成功设置应用 ID！', `应用 ID 为：${argument}`, '确认')
}
function setCustomApiKey(argument) {
  Action.preferences.API_KEY = argument
  LaunchBar.alert('成功设置应用密钥！', `应用密钥为：${argument}`, '确认')
}

/**
 * 获取翻译结果
 * @param word string
 * @return Obj{ value, subtitle, alwaysShowsSubtitle, quickLookURL}
 */
function getTranslations(word) {
  if (!word || !word.trim()) {
    return [{
      title: '请输入'
    }]
  }

  const result = HTTP.getJSON(getQueryUrl(word)).data
  if (!result || result.errorCode !== '0') {
    if (result.errorCode === '108') {
      return [{
        title: '应用 ID 或应用密钥配置出错，点击查看配置方法',
        url: 'https://github.com/hopsken/YoudaoTranslate'
      }]
    }
    return [{
      title: '翻译出错'
    }]
  }

  let translations = []
  if (result.hasOwnProperty('translation')) {
    translations.push(parseTranslation(result.translation))
  }
  if (result.hasOwnProperty('basic')) {
    translations.push(parseBasic(result.basic))
  }
  if (result.hasOwnProperty('web')) {
    translations = translations.concat(parseWeb(result.web))
  }

  return translations.map(item => {
      return {
          title: item.value,
          subtitle: item.key || '',
          alwaysShowsSubtitle: true,
          action: 'saveToClipboard',
          actionArgument: item.value,
          quickLookURL: `https://youdao.com/w/${word}`
      }
  })
}

/**
 * 将翻译结果保存至剪切板，并打印上前置 app 
 * @param result string
 */
function saveToClipboard(result) {
  LaunchBar.executeAppleScript(`set the clipboard to "${result}"`)
  LaunchBar.paste(result)
}

/**
 * 解析 Translation 字段， 释义
 * @param Translation Object
 * @return Object
 */
function parseTranslation(arr) {
  return { value: arr[0], key: null }
}

/**
 * 解析 Basic 字段， 基础释义
 * @param Basic Object
 * @return Object
 */
function parseBasic(obj) {
  const phonetics = []
  if (obj.hasOwnProperty('phonetic')) {
    phonetics.push(`[${obj['phonetic']}]`)
  }
  if (obj.hasOwnProperty('uk-phonetic')) {
    phonetics.push(`[英：${obj['uk-phonetic']}]`)
  }
  if (obj.hasOwnProperty('us-phonetic')) {
    phonetics.push(`[美：${obj['us-phonetic']}]`)
  }

  return { value: obj.explains.join('; '), key: phonetics.join(' ') }
}

/**
 * 解析 Web 字段， 网络释义
 * @param Web Object
 * @return array
 */
function parseWeb(arr) {
  return arr.map(item => ({
    value: item.value.join('; '),
    key: '网络释义：' + item.key
  }))
}

/**
 * 拼接 URL
 * @param Query string
 * @return string
 */
function getQueryUrl(query) {
  const clientId = Action.preferences.CLIENT_ID || CLIENT_ID
  const apiKey = Action.preferences.API_KEY || API_KEY

  const encodedQuery = encodeURIComponent(query)
  const salt = Math.round(Math.random() * 100)
  const sign = md5(clientId + query + salt + apiKey)

  return `${API_HOST}&q=${encodedQuery}&appKey=${clientId}&salt=${salt}&sign=${sign}`
}
