import { Check, Moon, Settings, Sun } from "lucide-react"

export default function ThemeGuide() {
  return (
    <div className="flex flex-col items-center p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">How to Change Your PawTrack Theme</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Step 1: Click the Theme Button</h2>
          <div className="border rounded-lg p-4 bg-white dark:bg-slate-800 shadow-md">
            <p className="mb-4">Look for the sun/moon icon in the top-right corner of your dashboard:</p>
            <div className="flex items-center justify-end gap-2 p-3 bg-gray-100 dark:bg-slate-700 rounded-md">
              <div className="w-9 h-9 rounded-md flex items-center justify-center border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold">
                JS
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Step 2: Select a Display Mode</h2>
          <div className="border rounded-lg p-4 bg-white dark:bg-slate-800 shadow-md">
            <p className="mb-4">Choose between Light, Dark, or System mode:</p>
            <div className="w-56 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-md">
              <p className="px-2 py-1.5 text-sm font-semibold">Appearance</p>
              <div className="h-px bg-gray-200 dark:bg-slate-700 my-1"></div>
              <p className="px-2 py-1 text-xs text-gray-500">Mode</p>
              <div className="px-2 py-1.5 flex items-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer">
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
              </div>
              <div className="px-2 py-1.5 flex items-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer">
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </div>
              <div className="px-2 py-1.5 flex items-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>System</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Step 3: Choose a Color Theme</h2>
          <div className="border rounded-lg p-4 bg-white dark:bg-slate-800 shadow-md">
            <p className="mb-4">Select from six color themes to personalize your dashboard:</p>
            <div className="w-56 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-md">
              <p className="px-2 py-1 text-xs text-gray-500">Color Theme</p>

              <div className="px-2 py-1.5 flex items-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer">
                <div className="w-4 h-4 rounded-full bg-purple-600 mr-2"></div>
                <span>Purple (Default)</span>
                <Check className="ml-auto h-4 w-4" />
              </div>

              <div className="px-2 py-1.5 flex items-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer">
                <div className="w-4 h-4 rounded-full bg-teal-400 mr-2"></div>
                <span>Teal</span>
              </div>

              <div className="px-2 py-1.5 flex items-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer">
                <div className="w-4 h-4 rounded-full bg-amber-400 mr-2"></div>
                <span>Amber</span>
              </div>

              <div className="px-2 py-1.5 flex items-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer">
                <div className="w-4 h-4 rounded-full bg-purple-300 mr-2"></div>
                <span>Lavender</span>
              </div>

              <div className="px-2 py-1.5 flex items-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer">
                <div className="w-4 h-4 rounded-full bg-green-300 mr-2"></div>
                <span>Mint</span>
              </div>

              <div className="px-2 py-1.5 flex items-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer">
                <div className="w-4 h-4 rounded-full bg-red-300 mr-2"></div>
                <span>Coral</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 w-full">
        <h2 className="text-xl font-semibold mb-4">Theme Examples</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border rounded-lg overflow-hidden shadow-md">
            <div className="h-3 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
            <div className="p-3">
              <p className="font-semibold text-purple-600">Purple Theme</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Default gradient theme</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden shadow-md">
            <div className="h-3 bg-gradient-to-r from-teal-400 to-teal-500"></div>
            <div className="p-3">
              <p className="font-semibold text-teal-500">Teal Theme</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Light turquoise gradient</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden shadow-md">
            <div className="h-3 bg-gradient-to-r from-amber-400 to-amber-500"></div>
            <div className="p-3">
              <p className="font-semibold text-amber-500">Amber Theme</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Light golden gradient</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden shadow-md">
            <div className="h-3 bg-gradient-to-r from-purple-300 to-purple-400"></div>
            <div className="p-3">
              <p className="font-semibold text-purple-400">Lavender Theme</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Soft purple gradient</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden shadow-md">
            <div className="h-3 bg-gradient-to-r from-green-300 to-green-400"></div>
            <div className="p-3">
              <p className="font-semibold text-green-400">Mint Theme</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fresh green gradient</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden shadow-md">
            <div className="h-3 bg-gradient-to-r from-red-300 to-red-400"></div>
            <div className="p-3">
              <p className="font-semibold text-red-400">Coral Theme</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Soft pink-red gradient</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
