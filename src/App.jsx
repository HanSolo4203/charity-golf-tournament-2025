import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import GolfEventManager from './components/GolfEventManager'
import AuctionBidding from './components/AuctionBidding'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<GolfEventManager />} />
        <Route path="/golf" element={<GolfEventManager />} />
        <Route path="/auction" element={<AuctionBidding />} />
        <Route path="/auction/:paintingId" element={<AuctionBidding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
