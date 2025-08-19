'use client'

import { useEffect, useState } from 'react'

export default function AuthStatus() {
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/session')
        console.log('Response status:', response.status)
        console.log('Response headers:', Object.fromEntries(response.headers.entries()))
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const text = await response.text()
        console.log('Raw response:', text)
        
        if (!text) {
          setData(null)
          setStatus('no-session')
          return
        }
        
        const sessionData = JSON.parse(text)
        setData(sessionData)
        setStatus('success')
      } catch (err: any) {
        console.error('Auth check error:', err)
        setError(err.message)
        setStatus('error')
      }
    }
    
    checkAuth()
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Status Debug</h1>
      
      <div className="space-y-4">
        <div>
          <strong>Status:</strong> {status}
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {data && (
          <div>
            <strong>Session Data:</strong>
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
        
        {status === 'no-session' && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            No active session found (this is normal if not signed in)
          </div>
        )}
        
        <div className="pt-4">
          <a 
            href="/api/auth/session" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Test /api/auth/session directly
          </a>
        </div>
      </div>
    </div>
  )
}