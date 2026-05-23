import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f5f9]">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="flex-1 overflow-hidden flex flex-col min-w-0"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="md:hidden flex items-center gap-3 h-14 px-4 border-b border-[#e2e8f0] bg-white flex-shrink-0 z-10">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-11 h-11 flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7 rounded-xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9] to-[#6366f1]" />
                <span className="relative text-white font-black text-[12px] z-10">N</span>
              </div>
              <span className="text-[#0f172a] font-bold text-[15px] tracking-tight">Nova</span>
            </div>
          </div>
          <Outlet />
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
