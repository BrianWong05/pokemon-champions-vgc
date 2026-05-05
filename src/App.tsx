import React from 'react'
import { Routes, Route } from 'react-router-dom'
import SpeedTierList from '@/pages/SpeedTierList'
import EvSpConverter from '@/pages/EvSpConverter'
import DamageCalculator from '@/pages/DamageCalculator'
import NotFound from '@/pages/NotFound'
import Layout from '@/components/templates/Layout'

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DamageCalculator />} />
        <Route path="ev-converter" element={<EvSpConverter />} />
        <Route path="speed-tiers" element={<SpeedTierList />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App