import React, { useState } from 'react'
import GolfEventManager from './components/GolfEventManager'
import AuctionBidding from './components/AuctionBidding'

function App() {
  const [currentPage, setCurrentPage] = useState('golf')

  const renderPage = () => {
    switch (currentPage) {
      case 'golf':
        return <GolfEventManager onNavigateToAuction={() => setCurrentPage('auction')} />
      case 'auction':
        return <AuctionBidding onBack={() => setCurrentPage('golf')} />
      default:
        return <GolfEventManager onNavigateToAuction={() => setCurrentPage('auction')} />
    }
  }

  return (
    <div className="App">
      {renderPage()}
    </div>
  )
}

export default App
