export interface BlockConfig {
  [blockId: string]: boolean
}

export const BLOCK_DEFINITIONS = [
  { id: 'bitcoincard', name: 'BitcoinCard', description: 'Pay anywhere with Bitcoin' },
  { id: 'clock', name: 'Clock', description: '世界時計' },
  { id: 'fluq', name: 'FLUQ', description: '暗号資産会計' },
  { id: 'awwf', name: 'A World Without Fee', description: 'フリップカード' },
  { id: 'bitcoinpay', name: 'BitcoinPay', description: 'コーポレートページ' },
  { id: 'music', name: 'Music', description: 'nausica.ai' },
  { id: 'widget', name: 'BitcoinPay Widget', description: '決済ウィジェット' },
  { id: 'sufaria', name: 'SUFARIA', description: '暗号メッセージング' },
  { id: 'stas-swap', name: 'STAS SWAP', description: 'stas.exchange' },
]

export const DEFAULT_CONFIG: BlockConfig = {
  bitcoincard: true,
  clock: true,
  fluq: true,
  awwf: true,
  bitcoinpay: true,
  music: true,
  widget: true,
  sufaria: true,
  'stas-swap': true,
}

const API_URL = 'https://2igna4hak6ghh2ldmupq552vbm0zmvpe.lambda-url.ap-northeast-1.on.aws'

export async function getConfig(draft = false): Promise<BlockConfig> {
  try {
    const path = draft ? '/draft' : '/config'
    const res = await fetch(`${API_URL}${path}`)
    if (!res.ok) return { ...DEFAULT_CONFIG }
    return await res.json()
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export async function saveDraft(config: BlockConfig, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, blocks: config }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function publishConfig(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    return res.ok
  } catch {
    return false
  }
}
