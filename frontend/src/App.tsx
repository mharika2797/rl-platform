import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/researcher/Dashboard'
import Tasks from './pages/researcher/Tasks'
import TaskDetail from './pages/researcher/TaskDetail'
import Queue from './pages/annotator/Queue'
import Annotate from './pages/annotator/Annotate'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/annotate/:assignmentId" element={<Annotate />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1422',
            color: '#e2e8f0',
            border: '1px solid #1e2d45',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '13px',
          },
        }}
      />
    </QueryClientProvider>
  )
}