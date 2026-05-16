import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  getQuizzesByCourse,
  getOrStartAttempt,
  getAttemptData,
  saveAttemptAnswers,
  finishAttempt,
  getAttemptReview,
} from '../api/moodle'
import { Layout } from '../components/Layout'

const cleanHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/http:\/\/localhost:8000/g, '/moodle-api')

const parseAnswers = (container: HTMLDivElement): Record<string, string> => {
  const answers: Record<string, string> = {}
  const inputs = container.querySelectorAll<HTMLInputElement>(
    'input[type="radio"]:checked, input[type="text"], input[type="hidden"]'
  )
  inputs.forEach(input => {
    if (input.name && !input.name.includes('flagged')) {
      answers[input.name] = input.value
    }
  })
  return answers
}

export const QuizPage = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const id = Number(courseId)

  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<{ slot: number; html: string; type: string }[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'loading' | 'quiz' | 'submitting' | 'result' | 'error'>('loading')
  const [result, setResult] = useState<{ grade: number; maxgrade: number } | null>(null)
  const [quizName, setQuizName] = useState('Тест')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const quizzes = await getQuizzesByCourse(id)
        console.log('quizzes:', JSON.stringify(quizzes, null, 2))
        console.log('moduleId из URL:', moduleId, typeof moduleId)
  
        const quiz = quizzes.find((q: { coursemodule: number; name: string }) =>
          q.coursemodule === Number(moduleId)
        )
        console.log('найденный quiz:', quiz)
  
        if (!quiz) throw new Error('Тест не найден')
        setQuizName(quiz.name)
  
        const attempt = await getOrStartAttempt(quiz.id)
        console.log('attempt:', JSON.stringify(attempt, null, 2))
        setAttemptId(attempt.id)
  
        const data = await getAttemptData(attempt.id, 0)
        setQuestions(data.questions)
        setStatus('quiz')
      } catch {
        setStatus('error')
      }
    }
    init()
  }, [id, moduleId])

  useEffect(() => {
    if (!containerRef.current || status !== 'quiz') return

    const handleChange = () => {
      if (containerRef.current) {
        const parsed = parseAnswers(containerRef.current)
        setAnswers(parsed)
      }
    }

    containerRef.current.addEventListener('change', handleChange)
    return () => containerRef.current?.removeEventListener('change', handleChange)
  }, [status, questions])

  const handleSubmit = async () => {
    if (!attemptId) return
    setStatus('submitting')
    try {
      const submitData: Record<string, string> = {}
  
      questions.forEach(q => {
        const { fieldName, seqName, seqValue } = parseQuestion(q.html)
        if (seqName) submitData[seqName] = seqValue
        if (answers[fieldName]) submitData[fieldName] = answers[fieldName]
      })
  
      console.log('отправляем данные:', submitData)
  
      await saveAttemptAnswers(attemptId, submitData)
      await finishAttempt(attemptId)
  
      const review = await getAttemptReview(attemptId)
      console.log('review:', JSON.stringify(review, null, 2))
  
      setResult({
        grade: parseFloat(review.grade) || 0,
        maxgrade: parseFloat(review.maxgrade) || 0,
      })
      setStatus('result')
    } catch (e) {
      console.error('ошибка submit:', e)
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <Layout title="Тест" showBack>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-700"/>
          ))}
        </div>
      </Layout>
    )
  }

  if (status === 'error') {
    return (
      <Layout title="Тест" showBack>
        <div className="rounded-2xl p-6 text-center
          bg-white dark:bg-gray-800
          border border-red-100 dark:border-red-900"
        >
          <div className="text-4xl mb-3">❌</div>
          <p className="font-medium text-gray-700 dark:text-gray-300">
            Не удалось загрузить тест
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Проверьте подключение к интернету
          </p>
        </div>
      </Layout>
    )
  }

  if (status === 'result' && result) {
    const percent = Math.round((result.grade / result.maxgrade) * 100)
    const passed = percent >= 50

    return (
      <Layout title={quizName} showBack>
        <div className="rounded-2xl p-8 text-center
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          <div className="text-6xl mb-4">{passed ? '🎉' : '😔'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {passed ? 'Тест пройден!' : 'Попробуйте ещё раз'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Ваш результат
          </p>

          <div className="inline-flex items-center justify-center
            w-32 h-32 rounded-full mb-6
            border-4 border-green-200 dark:border-green-900"
          >
            <div>
              <p className={`text-3xl font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}>
                {percent}%
              </p>
              <p className="text-xs text-gray-400">
                {result.grade} / {result.maxgrade}
              </p>
            </div>
          </div>

          <button
            onClick={() => window.history.back()}
            className="w-full py-3 rounded-xl font-medium
              bg-green-500 hover:bg-green-600 text-white
              cursor-pointer transition-colors"
          >
            Вернуться к курсу
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={quizName} showBack>
      <div className="space-y-4">

      <div ref={containerRef} className="space-y-4">
        {questions.map((q, idx) => {
            const { qtext, answers: opts, fieldName } = parseQuestion(q.html)
            const currentAnswer = answers[fieldName]

            return (
            <div key={q.slot}
                className="rounded-2xl overflow-hidden
                bg-white dark:bg-gray-800
                border border-green-100 dark:border-gray-700"
            >
                <div className="px-4 py-2 bg-green-50 dark:bg-gray-700
                border-b border-green-100 dark:border-gray-700"
                >
                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    Вопрос {idx + 1}
                </span>
                </div>

                <div className="px-4 pt-4 pb-2
                text-sm font-medium text-gray-800 dark:text-gray-200"
                dangerouslySetInnerHTML={{ __html: qtext }}
                />

                <div className="px-4 pb-4 space-y-2">
                {opts.map(opt => (
                    <button
                    key={opt.value}
                    onClick={() => setAnswers(prev => ({
                        ...prev,
                        [fieldName]: opt.value,
                    }))}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3
                        rounded-xl border transition-colors cursor-pointer text-sm
                        ${currentAnswer === opt.value
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors
                        ${currentAnswer === opt.value
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300 dark:border-gray-600'
                        }`}
                    >
                        {currentAnswer === opt.value && (
                        <div className="w-full h-full rounded-full bg-white scale-50"/>
                        )}
                    </div>
                    <span dangerouslySetInnerHTML={{ __html: opt.label }}/>
                    </button>
                ))}
                </div>
            </div>
            )
        })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={status === 'submitting'}
          className="w-full py-3 rounded-xl font-medium text-sm
            cursor-pointer transition-colors
            bg-green-500 hover:bg-green-600 text-white
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'submitting' ? 'Отправляем...' : 'Завершить тест'}
        </button>

      </div>
    </Layout>
  )
}

const parseQuestion = (html: string) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
  
    const qtextEl = doc.querySelector('.qtext')
    const qtext = qtextEl?.innerHTML ?? ''
  
    const answers: { value: string; label: string }[] = []
    doc.querySelectorAll('.answer input[type="radio"]').forEach(input => {
      const inp = input as HTMLInputElement
      if (inp.classList.contains('sr-only') || inp.value === '-1') return
  
      const ariaId = inp.getAttribute('aria-labelledby')
      const ariaEl = ariaId ? doc.getElementById(ariaId) : null
      const flexFill = ariaEl?.querySelector('.flex-fill')
      const labelEl = doc.querySelector(`label[for="${inp.id}"]`)
  
      const label =
        flexFill?.textContent?.trim() ||
        ariaEl?.textContent?.trim() ||
        labelEl?.textContent?.trim() ||
        inp.value
  
      answers.push({ value: inp.value, label })
    })
  
    const firstInput = doc.querySelector(
      '.answer input[type="radio"]:not(.sr-only)'
    ) as HTMLInputElement
    const fieldName = firstInput?.name ?? ''
  
    const seqEl = doc.querySelector(
      'input[name*="sequencecheck"]'
    ) as HTMLInputElement
    const seqName = seqEl?.name ?? ''
    const seqValue = seqEl?.value ?? '1'
  
    return { qtext, answers, fieldName, seqName, seqValue }
}

