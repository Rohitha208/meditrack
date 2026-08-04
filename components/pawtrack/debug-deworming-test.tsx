'use client';

import { useState } from 'react';
import { useGetDewormingVisitById } from '@/queries/deworming/intake/get-deworming-visit-by-id';

export default function DebugDewormingTest() {
  const [testId, setTestId] = useState('3fa85f64-5717-4562-b3fc-2c963f66afa6');
  const [customId, setCustomId] = useState('');
  const [useCustomId, setUseCustomId] = useState(false);

  const idToTest = useCustomId ? customId : testId;
  const { data, isLoading, isError, error, refetch } = useGetDewormingVisitById(
    idToTest, 
    !!idToTest
  );

  const handleTest = () => {
    refetch();
  };

  return (
    <div className="p-6 border rounded-lg bg-gray-50">
      <h2 className="text-xl font-bold mb-4">🔍 Deworming API Debug Test</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Test with Sample UUID:
          </label>
          <input
            type="text"
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter UUID to test"
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={useCustomId}
              onChange={(e) => setUseCustomId(e.target.checked)}
            />
            <span className="text-sm">Use custom ID instead</span>
          </label>
        </div>

        {useCustomId && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Custom ID:
            </label>
            <input
              type="text"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter your custom ID"
            />
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={handleTest}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test API'}
          </button>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Current Test ID:</h3>
          <code className="bg-gray-200 p-2 rounded text-sm block">
            {idToTest || 'No ID provided'}
          </code>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Results:</h3>
          
          {isLoading && (
            <div className="text-blue-600">⏳ Loading...</div>
          )}
          
          {isError && (
            <div className="text-red-600">
              <div className="font-semibold">❌ Error:</div>
              <pre className="bg-red-100 p-2 rounded text-sm mt-1 overflow-auto">
                {error?.message || 'Unknown error'}
              </pre>
            </div>
          )}
          
          {data && (
            <div className="text-green-600">
              <div className="font-semibold">✅ Success:</div>
              <pre className="bg-green-100 p-2 rounded text-sm mt-1 overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <ul className="space-y-1">
            <li>• Check server console for detailed API logs</li>
            <li>• Verify NEXT_PUBLIC_API_URL environment variable</li>
            <li>• Ensure backend server is running</li>
            <li>• Check if the ID exists in the backend database</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 