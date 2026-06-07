import { useState } from 'react'
import SetupScreen from './components/SetupScreen'
import DraftScreen from './components/DraftScreen'
import ResultScreen from './components/ResultScreen'
import './index.css'

export default function App() {
  const [screen, setScreen] = useState('setup')
  const [config, setConfig] = useState(null)
  const [finalSlots, setFinalSlots] = useState(null)

  function handleSetupDone(cfg) {
    setConfig(cfg)
    setScreen('draft')
  }

  function handleDraftDone(slots) {
    setFinalSlots(slots)
    setScreen('result')
  }

  function handleRestart() {
    setConfig(null)
    setFinalSlots(null)
    setScreen('setup')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {screen === 'setup' && <SetupScreen onStart={handleSetupDone} />}
      {screen === 'draft' && (
        <DraftScreen config={config} onComplete={handleDraftDone} />
      )}
      {screen === 'result' && (
        <ResultScreen slots={finalSlots} formation={config?.formation} onRestart={handleRestart} />
      )}
    </div>
  )
}
