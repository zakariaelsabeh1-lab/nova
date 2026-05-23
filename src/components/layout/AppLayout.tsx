import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { motion } from 'framer-motion'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f5f9]">
      <Sidebar />
      <motion.main
        className="flex-1 overflow-y-auto"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
