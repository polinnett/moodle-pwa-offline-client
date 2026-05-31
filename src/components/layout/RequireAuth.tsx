import { Navigate } from 'react-router-dom'

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('moodle_token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}