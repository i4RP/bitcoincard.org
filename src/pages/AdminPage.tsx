import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BLOCK_DEFINITIONS, DEFAULT_CONFIG, getConfig, saveDraft, type BlockConfig } from '../config'

function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [config, setConfig] = useState<BlockConfig>({ ...DEFAULT_CONFIG })
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const navigate = useNavigate()

  // Load draft config on mount
  useEffect(() => {
    if (!authenticated) return
    getConfig(true).then(setConfig)
  }, [authenticated])

  const handleLogin = () => {
    if (password === '0') {
      setAuthenticated(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  const handleToggle = async (blockId: string) => {
    const newConfig = { ...config, [blockId]: !config[blockId] }
    setConfig(newConfig)
    setSaving(true)
    setSaveStatus('idle')
    const ok = await saveDraft(newConfig, '0')
    setSaving(false)
    setSaveStatus(ok ? 'saved' : 'error')
    if (ok) {
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin</h1>
          <p className="text-sm text-gray-400 mb-6">管理ダッシュボードにアクセスするにはパスワードを入力してください</p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(false) }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="パスワード"
            className={`w-full px-4 py-3 rounded-xl border-2 ${passwordError ? 'border-red-400' : 'border-gray-200'} focus:border-indigo-500 focus:outline-none text-lg mb-4 transition-colors`}
            autoFocus
          />
          {passwordError && (
            <p className="text-red-500 text-sm mb-4">パスワードが違います</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-lg active:scale-95 transition-transform"
          >
            ログイン
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 select-none">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Admin Dashboard</h1>
          <button
            onClick={() => navigate('/admin/testscreen')}
            className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold active:scale-95 transition-transform"
          >
            テストスクリーン
          </button>
        </div>
      </div>

      {/* Block toggles */}
      <div className="p-4 space-y-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h2 className="text-base font-bold text-gray-800 mb-1">ブロック表示管理</h2>
          <p className="text-xs text-gray-400">各ブロックの表示/非表示を切り替えます。変更は下書きとして保存されます。</p>
        </div>

        {BLOCK_DEFINITIONS.map((block) => (
          <div
            key={block.id}
            className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">{block.name}</p>
              <p className="text-xs text-gray-400">{block.description}</p>
            </div>
            <button
              onClick={() => handleToggle(block.id)}
              disabled={saving}
              className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
                config[block.id] ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  config[block.id] ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}

        {/* Save status */}
        {saveStatus === 'saved' && (
          <div className="text-center text-sm text-green-600 font-medium py-2">
            下書きを保存しました
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="text-center text-sm text-red-500 font-medium py-2">
            保存に失敗しました
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 space-y-3">
          <button
            onClick={() => navigate('/admin/testscreen')}
            className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-base active:scale-95 transition-transform shadow-md"
          >
            テストスクリーンで確認
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-2xl bg-gray-200 text-gray-600 font-bold text-base active:scale-95 transition-transform"
          >
            パブリックサイトに戻る
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
