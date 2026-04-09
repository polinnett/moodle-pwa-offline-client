import { Link } from "react-router-dom";
import type { Course } from "../types/course";

interface Props {
  course: Course;
}

export default function CourseCard({ course }: Props) {
  return (
    <article
      style={{
        border: "1px solid #ccc",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <h3>{course.fullname}</h3>
      <p>{course.shortname}</p>
      <Link to={`/courses/${course.id}`}>Открыть курс</Link>
    </article>
  );
}