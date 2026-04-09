const BASE_URL = import.meta.env.VITE_MOODLE_BASE_URL;
const TOKEN = import.meta.env.VITE_MOODLE_TOKEN;

export async function apiRequest<T>(
  wsfunction: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const query = new URLSearchParams({
    wstoken: TOKEN,
    moodlewsrestformat: "json",
    wsfunction,
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ),
  });

  const response = await fetch(
    `${BASE_URL}/webservice/rest/server.php?${query.toString()}`
  );

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json();
}
