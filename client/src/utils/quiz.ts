export const parseQuestion = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const qtextEl = doc.querySelector(".qtext");
  qtextEl?.querySelectorAll(".accesshide").forEach((el) => el.remove());

  const isDdwtos = !!doc.querySelector(".placeinput");
  const placeInputs = isDdwtos
    ? (Array.from(doc.querySelectorAll(".placeinput")) as HTMLInputElement[])
    : [];

  let placeCounter = 0;
  qtextEl?.querySelectorAll(".drop").forEach((place) => {
    placeCounter++;
    const span = doc.createElement("span");
    span.innerHTML = `<span style="display:inline-block;min-width:25px;padding:1px 4px;color:#16a34a;font-weight:bold;text-align:center;">[${placeCounter}]</span>`;
    place.replaceWith(span);
  });

  const qtext = qtextEl?.innerHTML ?? "";

  const isMatch = !!doc.querySelector('select[name*="_sub"]');

  const answers: { value: string; label: string }[] = [];
  doc.querySelectorAll('.answer input[type="radio"]').forEach((input) => {
    const inp = input as HTMLInputElement;
    if (inp.classList.contains("sr-only") || inp.value === "-1") return;
    const ariaId = inp.getAttribute("aria-labelledby");
    const ariaEl = ariaId ? doc.getElementById(ariaId) : null;
    const flexFill = ariaEl?.querySelector(".flex-fill");
    const labelEl = doc.querySelector(`label[for="${inp.id}"]`);
    const label =
      flexFill?.textContent?.trim() ||
      ariaEl?.textContent?.trim() ||
      labelEl?.textContent?.trim() ||
      inp.value;
    answers.push({ value: inp.value, label });
  });

  const isCheckbox = !!doc.querySelector('.answer input[type="checkbox"]');
  const checkboxOptions: { name: string; label: string }[] = [];
  if (isCheckbox) {
    doc.querySelectorAll('.answer input[type="checkbox"]').forEach((input) => {
      const inp = input as HTMLInputElement;
      const ariaId = inp.getAttribute("aria-labelledby");
      const ariaEl = ariaId ? doc.getElementById(ariaId) : null;
      const flexFill = ariaEl?.querySelector(".flex-fill");
      const labelEl = doc.querySelector(`label[for="${inp.id}"]`);
      const label =
        flexFill?.textContent?.trim() ||
        ariaEl?.textContent?.trim() ||
        labelEl?.textContent?.trim() ||
        inp.name;
      checkboxOptions.push({ name: inp.name, label });
    });
  }

  const isShortAnswer = !!doc.querySelector(
    'input[type="text"][name*="_answer"]'
  );
  const shortAnswerName = isShortAnswer
    ? (
        doc.querySelector(
          'input[type="text"][name*="_answer"]'
        ) as HTMLInputElement
      )?.name ?? ""
    : "";

  const matchRows: {
    stem: string;
    fieldName: string;
    options: { value: string; label: string }[];
  }[] = [];
  if (isMatch) {
    doc.querySelectorAll('select[name*="_sub"]').forEach((sel) => {
      const select = sel as HTMLSelectElement;
      const row = select.closest("tr");
      const stem = row?.querySelector(".text")?.textContent?.trim() ?? "";
      const options = Array.from(select.options)
        .filter((o) => o.value !== "0")
        .map((o) => ({ value: o.value, label: o.text }));
      matchRows.push({ stem, fieldName: select.name, options });
    });
  }

  const choices = isDdwtos
    ? Array.from(doc.querySelectorAll(".draghome"))
        .map((el) => el.textContent?.trim() ?? "")
        .filter(Boolean)
    : [];

  const ddwtosData: { places: { name: string }[]; choices: string[] } | null =
    isDdwtos
      ? {
          places: placeInputs.map((p) => ({ name: p.name })),
          choices,
        }
      : null;

  const firstInput = doc.querySelector(
    '.answer input[type="radio"]:not(.sr-only)'
  ) as HTMLInputElement;
  const fieldName = firstInput?.name ?? "";

  const seqEl = doc.querySelector(
    'input[name*="sequencecheck"]'
  ) as HTMLInputElement;
  const seqName = seqEl?.name ?? "";
  const seqValue = seqEl?.value ?? "1";

  return {
    qtext,
    answers,
    fieldName,
    seqName,
    seqValue,
    matchRows,
    ddwtosData,
    isMatch,
    isDdwtos,
    isCheckbox,
    checkboxOptions,
    isShortAnswer,
    shortAnswerName,
  };
};
