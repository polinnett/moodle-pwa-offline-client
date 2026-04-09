import { useEffect, useState } from "react";
import CourseCard from "../components/CourseCard";
import { useCoursesStore } from "../store/coursesStore";
import { loadCourses } from "../services/loadCourses";

export default function CoursesPage() {
  const { courses, setCourses } = useCoursesStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await loadCourses(2); // тестовый userid
        setCourses(data);
      } catch (e) {
        setError("Не удалось загрузить курсы");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, [setCourses]);

  if (loading) return <p style={{ padding: 24 }}>Загрузка...</p>;
  if (error) return <p style={{ padding: 24 }}>{error}</p>;

  return (
    <main style={{ padding: 24 }}>
      <h1>Мои курсы</h1>
      {courses.length === 0 ? (
        <p>Курсы не найдены</p>
      ) : (
        courses.map((course) => <CourseCard key={course.id} course={course} />)
      )}
    </main>
  );
}