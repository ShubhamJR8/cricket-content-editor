import React, { useState } from 'react'
import VideoSlicer from './components/VideoSlicer'

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center">
      <header className="w-full max-w-6xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Reel Cricket Slicer</h1>
        <p className="text-zinc-400 text-sm">Hit 'M' to drop a marker. First tap = Start (-2s buffer), Second tap = End.</p>
      </header>
      
      <main className="w-full max-w-6xl flex-grow px-4 pb-12 flex flex-col gap-8">
         <VideoSlicer />
      </main>
    </div>
  )
}

export default App
