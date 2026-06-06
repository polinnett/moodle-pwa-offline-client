import { Icon } from "../ui/Icon";
import type { CourseModule } from "../../types";

export const UnsupportedContent = ({ module }: { module: CourseModule }) => (
  <div
    className="rounded-2xl p-6 text-center
      bg-white dark:bg-gray-800
      border border-green-100 dark:border-gray-700"
  >
    <div className="flex justify-center mb-3">
      <Icon name="default" size={50} />
    </div>
    <p className="font-medium text-gray-700 dark:text-gray-300">
      {module.name}
    </p>
    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
      Этот тип контента пока не поддерживается
    </p>
  </div>
);
