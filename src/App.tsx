import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import SpeedTierList from './pages/SpeedTierList'

const Home: React.FC = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="bg-white p-8 rounded-lg shadow-md text-center">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">
        Pokemon Champions VGC
      </h1>
      <p className="text-gray-700 mb-6">
        Vite + React + TypeScript + Tailwind CSS 4 is ready!
      </p>
      <Link 
        to="/speed-tiers" 
        className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors"
      >
        View Speed Tiers
      </Link>
    </div>
  </div>
)

const App: React.FC = () => {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/speed-tiers" element={<SpeedTierList />} />
      </Routes>
    </Router>
  )
}

export default App
