'use client'

import { useEffect, useState } from 'react'

export default function TestAPI() {
  const [results, setResults] = useState<any>({})

  useEffect(() => {
    async function testEndpoints() {
      const endpoints = [
        '/api/auth/session',
        '/api/auth/providers',
        '/api/auth/signin',
        '/api/auth/csrf'
      ]

      const testResults: any = {}

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint)
          const contentType = response.headers.get('content-type')
          
          testResults[endpoint] = {
            status: response.status,
            statusText: response.statusText,
            contentType,
            headers: Object.fromEntries(response.headers.entries())
          }

          if (contentType?.includes('application/json')) {
            try {
              testResults[endpoint].data = await response.json()
            } catch (e) {
              testResults[endpoint].jsonError = 'Failed to parse JSON'
              testResults[endpoint].rawText = await response.text()
            }
          } else {
            const text = await response.text()
            testResults[endpoint].rawText = text.slice(0, 500) + (text.length > 500 ? '...' : '')
          }
        } catch (error: any) {
          testResults[endpoint] = {
            error: error.message
          }
        }
      }

      setResults(testResults)
    }

    testEndpoints()
  }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth API Test Results</h1>
      
      <div className="space-y-6">
        {Object.entries(results).map(([endpoint, result]: [string, any]) => (
          <div key={endpoint} className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">{endpoint}</h2>
            
            <div className="space-y-2 text-sm">
              {result.error ? (
                <div className="text-red-600">
                  <strong>Error:</strong> {result.error}
                </div>
              ) : (
                <>
                  <div>
                    <strong>Status:</strong> {result.status} {result.statusText}
                  </div>
                  <div>
                    <strong>Content-Type:</strong> {result.contentType || 'Not specified'}
                  </div>
                  
                  {result.data && (
                    <div>
                      <strong>JSON Data:</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {result.jsonError && (
                    <div className="text-red-600">
                      <strong>JSON Parse Error:</strong> {result.jsonError}
                    </div>
                  )}
                  
                  {result.rawText && (
                    <div>
                      <strong>Raw Response:</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto text-xs">
                        {result.rawText}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}