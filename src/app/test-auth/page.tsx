'use client'

import { useSession } from 'next-auth/react'

export default function TestAuth() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      
      <div className="space-y-4">
        <div>
          <strong>Status:</strong> {status}
        </div>
        
        {session ? (
          <div>
            <strong>Session:</strong>
            <pre className="bg-gray-100 p-4 rounded mt-2">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        ) : (
          <div>
            <strong>No session found</strong>
            <p>User is not authenticated</p>
          </div>
        )}
      </div>
    </div>
  )
}