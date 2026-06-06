import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  getQuizzesByCourse,
  getOrStartAttempt,
  getAttemptData,
  saveAttemptAnswers,
  finishAttempt,
  getAttemptReview,
} from "../api/moodle";
import { Layout } from "../components/layout/Layout";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import { Icon } from "../components/ui/Icon";
import { parseQuestion } from "../utils/quiz";

export const QuizPage = () => {
  const { courseId, moduleId } = useParams<{
    courseId: string;
    moduleId: string;
  }>();
  const id = Number(courseId);

  const [quizData, setQuizData] = useState<{
    sumgrades: number;
    grade: number;
  } | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<
    { slot: number; html: string; type: string }[]
  >([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    | "loading"
    | "resume"
    | "quiz"
    | "submitting"
    | "result"
    | "error"
    | "no_attempts"
  >("loading");
  const [result, setResult] = useState<{
    grade: number;
    maxgrade: number;
    earnedRaw: number;
    maxRaw: number;
    passmark?: number;
  } | null>(null);
  const [quizName, setQuizName] = useState("Тест");
  const [resumeTime, setResumeTime] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const isOnline = useOfflineStatus();
  const [currentPage, setCurrentPage] = useState(0);
  const [nextPage, setNextPage] = useState(-1);

  const parsedQuestions = useMemo(
    () => questions.map((q) => ({ ...q, parsed: parseQuestion(q.html) })),
    [questions],
  );

  useEffect(() => {
    const init = async () => {
      try {
        const quizzes = await getQuizzesByCourse(id);

        const quiz = quizzes.find(
          (q: { coursemodule: number; name: string }) =>
            q.coursemodule === Number(moduleId),
        );

        if (!quiz) throw new Error("Тест не найден");
        setQuizName(quiz.name);
        setQuizData({ sumgrades: quiz.sumgrades, grade: quiz.grade });

        const attempt = await getOrStartAttempt(quiz.id);
        setAttemptId(attempt.id);

        const startTime = new Date(attempt.timestart * 1000).toLocaleString(
          "ru-RU",
        );
        setResumeTime(startTime);

        const data = await getAttemptData(attempt.id, 0);
        setQuestions(data.questions ?? []);
        setNextPage(data.nextpage);

        const isNew = attempt.timemodified === attempt.timestart;
        setStatus(isNew ? "quiz" : "resume");
      } catch (e) {
        if (e instanceof Error && e.message === "NO_ATTEMPTS_LEFT") {
          setStatus("no_attempts");
        } else {
          setStatus("error");
        }
      }
    };
    init();
  }, [id, moduleId]);

  const handleNextPage = async () => {
    if (!attemptId || nextPage === -1) return;
    try {
      const submitData: Record<string, string> = {};
      Object.assign(submitData, answers);
      questions.forEach((q) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(q.html, "text/html");
        const seqEl = doc.querySelector(
          'input[name*="sequencecheck"]',
        ) as HTMLInputElement;
        if (seqEl?.name) submitData[seqEl.name] = seqEl.value;
      });
      await saveAttemptAnswers(attemptId, submitData);

      const data = await getAttemptData(attemptId, nextPage);
      setQuestions(data.questions ?? []);
      setNextPage(data.nextpage);
      setCurrentPage(nextPage);
      setAnswers({});
      window.scrollTo(0, 0);
    } catch (e) {
      console.error("ошибка перехода на следующую страницу:", e);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    setStatus("submitting");
    try {
      const submitData: Record<string, string> = {};
      Object.assign(submitData, answers);

      questions.forEach((q) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(q.html, "text/html");
        const seqEl = doc.querySelector(
          'input[name*="sequencecheck"]',
        ) as HTMLInputElement;
        if (seqEl?.name) submitData[seqEl.name] = seqEl.value;

        const isMatch = !!doc.querySelector('select[name*="_sub"]');
        const isDdwtos = !!doc.querySelector(".placeinput");

        if (isMatch) {
          doc.querySelectorAll('select[name*="_sub"]').forEach((sel) => {
            const select = sel as HTMLSelectElement;
            if (!submitData[select.name]) submitData[select.name] = "0";
          });
        } else if (isDdwtos) {
          const places = Array.from(
            doc.querySelectorAll(".placeinput"),
          ) as HTMLInputElement[];
          places.forEach((place: HTMLInputElement) => {
            if (!submitData[place.name]) submitData[place.name] = "0";
          });
        }
      });

      await saveAttemptAnswers(attemptId, submitData);
      await finishAttempt(attemptId);

      const quizzes = await getQuizzesByCourse(id);
      const quiz = quizzes.find(
        (q: { coursemodule: number }) => q.coursemodule === Number(moduleId),
      );
      if (quiz) localStorage.removeItem(`quiz_attempt_${quiz.id}`);

      const review = await getAttemptReview(attemptId);
      const sumgrades = quizData?.sumgrades ?? 1;
      const maxGrade = quizData?.grade ?? 10;
      const earnedSumgrades = parseFloat(review.attempt?.sumgrades) || 0;
      const earnedGrade = (earnedSumgrades / sumgrades) * maxGrade;

      setResult({
        grade: parseFloat(earnedGrade.toFixed(2)),
        maxgrade: maxGrade,
        earnedRaw: parseFloat(earnedSumgrades.toFixed(2)),
        maxRaw: parseFloat(sumgrades.toFixed(2)),
      });
      setStatus("result");
    } catch (e) {
      console.error("ошибка submit:", e);
      setStatus("error");
    }
  };

  if (status === "resume") {
    return (
      <Layout title={quizName} showBack>
        <div
          className="rounded-2xl p-8
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📝</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              У вас есть незавершенная попытка
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Начата: {resumeTime}
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setStatus("quiz")}
              className="w-full py-3 rounded-xl font-medium
                bg-green-500 hover:bg-green-600 text-white
                cursor-pointer transition-colors"
            >
              Продолжить попытку
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full py-3 rounded-xl font-medium
                border border-gray-200 dark:border-gray-600
                text-gray-600 dark:text-gray-400
                hover:bg-gray-50 dark:hover:bg-gray-700
                cursor-pointer transition-colors"
            >
              Вернуться к курсу
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (status === "loading") {
    return (
      <Layout title="Тест" showBack>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </Layout>
    );
  }

  if (status === "no_attempts") {
    return (
      <Layout title={quizName} showBack>
        <div
          className="rounded-2xl p-8 text-center
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          <div className="flex justify-center mb-3">
            <Icon name="default" size={48} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Попытки исчерпаны
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray.400">
            Вы использовали все доступные попытки для этого теста
          </p>
        </div>
      </Layout>
    );
  }

  if (status === "error") {
    return (
      <Layout title="Тест" showBack>
        <div
          className="rounded-2xl p-6 text-center
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          <div className="flex justify-center mb-3">
            <Icon name="default" size={48} />
          </div>
          <p className="font-medium text-gray-700 dark:text-gray-300">
            Не удалось загрузить тест
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Проверьте подключение к интернету. Тесты работают только при
            подключении к интернету
          </p>
        </div>
      </Layout>
    );
  }

  if (status === "result" && result) {
    const gradeNum = parseFloat(String(result.grade)) || 0;
    const maxNum = parseFloat(String(result.maxgrade)) || 0;
    const percent = maxNum > 0 ? Math.round((gradeNum / maxNum) * 100) : 0;

    return (
      <Layout title={quizName} showBack>
        <div
          className="rounded-2xl p-8
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Результаты теста
          </h2>
          <div className="space-y-3 mb-6">
            <div
              className="flex justify-between items-center
              py-3 border-b border-gray-100 dark:border-gray-700"
            >
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Набрано баллов
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {result.grade.toFixed(2)} / {result.maxgrade.toFixed(2)}
              </span>
            </div>
            <div
              className="flex justify-between items-center
              py-3 border-b border-gray-100 dark:border-gray-700"
            >
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Правильных ответов
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {result.earnedRaw.toFixed(2)} / {result.maxRaw.toFixed(2)}
              </span>
            </div>
            <div
              className="flex justify-between items-center
              py-3 border-b border-gray-100 dark:border-gray-700"
            >
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Процент
              </span>
              <span
                className={`font-semibold ${percent >= 50 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
              >
                {percent}%
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Статус
              </span>
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full
                ${
                  percent >= 50
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {percent >= 50 ? "Пройден" : "Не пройден"}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-6">
            <div
              className={`h-2 rounded-full transition-all duration-500
                ${percent >= 50 ? "bg-green-500" : "bg-red-500"}`}
              style={{ width: `${percent}%` }}
            />
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
    );
  }

  return (
    <Layout title={quizName} showBack>
      <div className="space-y-4">
        <div ref={containerRef} className="space-y-4">
          {parsedQuestions.map((q, idx) => {
            const {
              qtext,
              answers: opts,
              fieldName,
              matchRows,
              ddwtosData,
              isMatch,
              isDdwtos,
              isCheckbox,
              checkboxOptions,
              isShortAnswer,
              shortAnswerName,
            } = q.parsed;
            const currentAnswer = answers[fieldName];

            return (
              <div
                key={q.slot}
                className="rounded-2xl overflow-hidden
                bg-white dark:bg-gray-800
                border border-green-100 dark:border-gray-700"
              >
                <div
                  className="px-4 py-2 bg-green-50 dark:bg-gray-700
                  border-b border-green-100 dark:border-gray-700"
                >
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    Вопрос {currentPage * 2 + idx + 1}
                  </span>
                </div>

                <div
                  className="px-4 pt-4 pb-2
                  text-sm font-medium text-gray-800 dark:text-gray-200"
                  dangerouslySetInnerHTML={{ __html: qtext }}
                />

                <div className="px-4 pb-4 space-y-2">
                  {!isMatch &&
                    !isDdwtos &&
                    opts.map((opt) => (
                      <button
                        key={opt.value}
                        role="radio"
                        aria-checked={currentAnswer === opt.value}
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [fieldName]: opt.value,
                          }))
                        }
                        className={`w-full text-left flex items-center gap-3 px-4 py-3
                        rounded-xl border transition-colors cursor-pointer text-sm
                        ${
                          currentAnswer === opt.value
                            ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors
                        ${
                          currentAnswer === opt.value
                            ? "border-green-500 bg-green-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                        >
                          {currentAnswer === opt.value && (
                            <div className="w-full h-full rounded-full bg-white scale-50" />
                          )}
                        </div>
                        <span dangerouslySetInnerHTML={{ __html: opt.label }} />
                      </button>
                    ))}

                  {isCheckbox &&
                    checkboxOptions.map((opt) => (
                      <button
                        key={opt.name}
                        role="checkbox"
                        aria-checked={answers[opt.name] === "1"}
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [opt.name]: prev[opt.name] === "1" ? "0" : "1",
                          }))
                        }
                        className={`w-full text-left flex items-center gap-3 px-4 py-3
                        rounded-xl border transition-colors cursor-pointer text-sm
                        ${
                          answers[opt.name] === "1"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 shrink-0 transition-colors
                        ${
                          answers[opt.name] === "1"
                            ? "border-green-500 bg-green-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                        >
                          {answers[opt.name] === "1" && (
                            <svg
                              viewBox="0 0 10 10"
                              className="w-full h-full text-white p-0.5"
                            >
                              <polyline
                                points="1,5 4,8 9,2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </svg>
                          )}
                        </div>
                        <span dangerouslySetInnerHTML={{ __html: opt.label }} />
                      </button>
                    ))}

                  {isShortAnswer && (
                    <input
                      type="text"
                      placeholder="Введите ответ..."
                      value={answers[shortAnswerName] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [shortAnswerName]: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border outline-none
                        transition-colors text-sm
                        border-gray-200 bg-gray-50 text-gray-900
                        focus:border-green-500 focus:ring-2 focus:ring-green-200
                        dark:border-gray-600 dark:bg-gray-700 dark:text-white
                        dark:focus:border-green-400 dark:focus:ring-green-900"
                    />
                  )}

                  {isMatch &&
                    matchRows.map((row) => (
                      <div
                        key={row.fieldName}
                        className="flex items-center gap-3
                      px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600"
                      >
                        <span
                          className="flex-1 text-sm text-gray-700 dark:text-gray-300"
                          dangerouslySetInnerHTML={{ __html: row.stem }}
                        />
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const val =
                              e.target.options[e.target.selectedIndex].value;
                            setAnswers((prev) => ({
                              ...prev,
                              [row.fieldName]: val,
                            }));
                          }}
                          className="text-sm rounded-lg px-3 py-2 cursor-pointer
                          border border-gray-200 dark:border-gray-600
                          bg-white dark:bg-gray-700
                          text-gray-800 dark:text-gray-200
                          focus:border-green-500 outline-none"
                        >
                          <option value="">Выберите...</option>
                          {row.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}

                  {isDdwtos && ddwtosData && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 px-1">
                        Выберите варианты для каждого пропуска:
                      </p>
                      {ddwtosData.places.map((place, i) => (
                        <div
                          key={place.name}
                          className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600"
                        >
                          <p className="text-xs text-gray-400 mb-2">
                            Пропуск {i + 1}
                          </p>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              const val =
                                e.target.options[e.target.selectedIndex].value;
                              setAnswers((prev) => ({
                                ...prev,
                                [place.name]: val,
                              }));
                            }}
                            className="w-full text-sm rounded-lg px-3 py-2 cursor-pointer
                              border border-gray-200 dark:border-gray-600
                              bg-white dark:bg-gray-700
                              text-gray-800 dark:text-gray-200
                              focus:border-green-500 outline-none"
                          >
                            <option value="">Выберите...</option>
                            {ddwtosData.choices.map((c, ci) => (
                              <option key={ci} value={String(ci + 1)}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!isOnline && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl
            bg-yellow-50 dark:bg-yellow-900/20
            border border-yellow-200 dark:border-yellow-800"
          >
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Нет подключения к интернету
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                Ответы не будут отправлены. Дождитесь восстановления соединения.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {nextPage !== -1 ? (
            <button
              onClick={handleNextPage}
              className="flex-1 py-3 rounded-xl font-medium text-sm
                cursor-pointer transition-colors
                bg-green-500 hover:bg-green-600 text-white"
            >
              Следующая страница
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={status === "submitting" || !isOnline}
              aria-disabled={status === "submitting" || !isOnline}
              aria-live="polite"
              className="flex-1 py-3 rounded-xl font-medium text-sm
                cursor-pointer transition-colors
                bg-green-500 hover:bg-green-600 text-white
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "submitting"
                ? "Отправляем..."
                : !isOnline
                  ? "Нет соединения"
                  : "Завершить тест"}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};
