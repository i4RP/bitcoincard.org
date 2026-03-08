import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getConfig, publishConfig, type BlockConfig, DEFAULT_CONFIG, BLOCK_DEFINITIONS } from '../config'
import App from '../App'

function TestScreen() {
  const [draftConfig, setDraftConfig] = useState<BlockConfig>({ ...DEFAULT_CONFIG })
  const [prodConfig, setProdConfig] = useState<BlockConfig>({ ...DEFAULT_CONFIG })
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getConfig(true), getConfig(false)]).then(([draft, prod]) => {
      setDraftConfig(draft)
      setProdConfig(prod)
    })
  }, [])

  const handlePublish = async () => {
    setPublishing(true)
    const ok = await publishConfig('0')
    setPublishing(false)
    if (ok) {
      setPublished(true)
      setProdConfig({ ...draftConfig })
      setTimeout(() => setPublished(false), 3000)
    }
  }

  // Find differences between draft and production
  const changes = BLOCK_DEFINITIONS.filter(
    (block) => draftConfig[block.id] !== prodConfig[block.id]
  )

  if (showPreview) {
    return (
      <div className="relative">
        {/* Preview banner */}
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-center py-2 text-sm font-bold shadow-lg">
          テストプレビュー
          <button
            onClick={() => setShowPreview(false)}
            className="ml-4 px-3 py-0.5 rounded-full bg-white/20 text-xs font-medium"
          >
            閉じる
          </button>
        </div>
        <div className="pt-8">
          <App blockConfigOverride={draftConfig} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 select-none">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin')}
            className="text-indigo-500 text-sm font-semibold"
          >
            ← 管理画面
          </button>
          <h1 className="text-lg font-bold text-gray-800">テストスクリーン</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Changes summary */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-base font-bold text-gray-800 mb-2">変更内容</h2>
          {changes.length === 0 ? (
            <p className="text-sm text-gray-400">本番環境との差分はありません</p>
          ) : (
            <div className="space-y-2">
              {changes.map((block) => (
                <div key={block.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{block.name}</p>
                    <p className="text-xs text-gray-400">{block.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${prodConfig[block.id] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {prodConfig[block.id] ? '表示中' : '非表示'}
                    </span>
                    <span className="text-gray-400 text-xs">→</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${draftConfig[block.id] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {draftConfig[block.id] ? '表示' : '非表示'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Block status overview */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-base font-bold text-gray-800 mb-2">下書き設定（全ブロック）</h2>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_DEFINITIONS.map((block) => (
              <div
                key={block.id}
                className={`px-3 py-2 rounded-xl text-xs font-medium ${
                  draftConfig[block.id]
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {block.name}: {draftConfig[block.id] ? 'ON' : 'OFF'}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => setShowPreview(true)}
            className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold text-base active:scale-95 transition-transform shadow-md"
          >
            プレビューで確認
          </button>

          <button
            onClick={handlePublish}
            disabled={publishing || changes.length === 0}
            className={`w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-transform shadow-md ${
              changes.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white'
            }`}
          >
            {publishing ? '反映中...' : published ? '本番に反映しました' : '本番環境に反映する'}
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="w-full py-4 rounded-2xl bg-gray-200 text-gray-600 font-bold text-base active:scale-95 transition-transform"
          >
            管理画面に戻る
          </button>
        </div>

        {published && (
          <div className="text-center text-sm text-green-600 font-medium py-2">
            本番環境に反映されました。CloudFrontキャッシュの反映に数分かかる場合があります。
          </div>
        )}
      </div>
    </div>
  )
}

export default TestScreen
