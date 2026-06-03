import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './contexts/ThemeContext'
import { RequireAuth } from './components/layout/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { CoursesPage } from './pages/CoursesPage'
import { CourseDetailPage } from './pages/CourseDetailPage'
import { LessonPage } from './pages/LessonPage'
import { QuizPage } from './pages/QuizPage'
import { HomePage } from './pages/HomePage'
import { ForumPage } from './pages/ForumPage'
import { ScrollRestoration } from './components/layout/ScrollRestoration'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'

const queryClient = new QueryClient()

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollRestoration />
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
              <Route path="/home" element={
                <RequireAuth><HomePage /></RequireAuth>
              } />
              <Route path="/courses/:courseId/forum/:moduleId" element={
                <RequireAuth><ForumPage /></RequireAuth>
              } />
              <Route path="/profile" element={
                <RequireAuth><ProfilePage /></RequireAuth>
              } />
              <Route path="/" element={
                localStorage.getItem('moodle_token')
                  ? <Navigate to="/home" replace />
                  : <Navigate to="/login" replace />
              } />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App