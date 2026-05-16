import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './contexts/ThemeContext'
import { RequireAuth } from './components/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { CoursesPage } from './pages/CoursesPage'
import { CourseDetailPage } from './pages/CourseDetailPage'
import { LessonPage } from './pages/LessonPage'
import { QuizPage } from './pages/QuizPage'

const queryClient = new QueryClient()

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/courses" element={
              <RequireAuth><CoursesPage /></RequireAuth>
            } />
            <Route path="/courses/:courseId" element={
              <RequireAuth><CourseDetailPage /></RequireAuth>
            } />
            <Route path="/courses/:courseId/lessons/:moduleId" element={
              <RequireAuth><LessonPage /></RequireAuth>
            } />
            <Route path="/courses/:courseId/quiz/:moduleId" element={
              <RequireAuth><QuizPage /></RequireAuth>
            } />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App