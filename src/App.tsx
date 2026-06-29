import React from 'react'
import { Routes, Route } from 'react-router-dom'
import SpeedTierList from '@/pages/SpeedTierList'
import EvSpConverter from '@/pages/EvSpConverter'
import DamageCalculator from '@/pages/DamageCalculator'
import TeamsPage from '@/pages/Teams'
import TeamDetailPage from '@/pages/TeamDetail'
import NotFound from '@/pages/NotFound'
import Layout from '@/components/templates/Layout'
import { FormatProvider } from '@/features/formats/FormatContext'

const App: React.FC = () => {
  return (
    <FormatProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DamageCalculator />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="teams/:id" element={<TeamDetailPage />} />
          <Route path="ev-converter" element={<EvSpConverter />} />
          <Route path="speed-tiers" element={<SpeedTierList />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </FormatProvider>
  )
}

export default App