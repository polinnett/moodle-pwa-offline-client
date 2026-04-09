import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import CoursesPage from "../pages/CoursesPage";
import CoursePage from "../pages/CoursePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/courses",
    element: <CoursesPage />,
  },
  {
    path: "/courses/:id",
    element: <CoursePage />,
  },
]);