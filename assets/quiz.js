"use strict";

const reviewKey = "ml-review-missed";
function readReview(fallback = {}) {
  try {
    const stored = JSON.parse(localStorage.getItem(reviewKey) || "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch {
    return fallback;
  }
}
let review = readReview();

function updateReview(card, keep, part) {
  const number = card?.dataset.originalQuestion;
  if (!number) return;

  const latest = readReview(review);
  const entry = latest[number];
  const parts = new Set(Array.isArray(entry?.parts) ? entry.parts : []);
  if (part && keep) parts.add(part);
  if (part && !keep) parts.delete(part);
  const manual = part ? Boolean(entry?.manual && card.querySelectorAll("[data-quiz]").length > 1) : keep;
  if (manual || (part && parts.size)) {
    latest[number] = {
      lesson: location.pathname.split("/").pop(),
      title: document.querySelector("h1").textContent,
      date: new Date().toLocaleDateString("zh-CN"),
      parts: [...parts],
      manual
    };
  } else {
    delete latest[number];
  }
  review = latest;

  try {
    localStorage.setItem(reviewKey, JSON.stringify(review));
  } catch {
    // Feedback remains usable in browsers that disable local storage.
  }
  window.dispatchEvent(new Event("review-updated"));
}

const reviewList = document.querySelector("#review-list");
function renderReview() {
  if (!reviewList) return;
  reviewList.replaceChildren();
  for (const [number, entry] of Object.entries(review)) {
    if (!/^\d{1,2}$/.test(number) || !/^\d{4}-[a-z-]+\.html$/.test(entry?.lesson)) continue;
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `lessons/${entry.lesson}#q${number}`;
    link.textContent = `第 ${number} 题 · ${entry.title}`;
    item.append(link, `（${entry.date}）`);
    reviewList.append(item);
  }
  document.querySelector("#review-empty").hidden = reviewList.childElementCount > 0;
}
renderReview();
window.addEventListener("review-updated", renderReview);
window.addEventListener("storage", (event) => {
  if (event.key !== reviewKey && event.key !== null) return;
  review = readReview();
  window.dispatchEvent(new Event("review-updated"));
});
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  review = readReview();
  window.dispatchEvent(new Event("review-updated"));
});

for (const card of document.querySelectorAll(".question[data-original-question]")) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "review-toggle";
  const refresh = () => {
    const saved = Boolean(review[card.dataset.originalQuestion]);
    button.textContent = saved ? "移出错题回顾" : "加入错题回顾";
    button.setAttribute("aria-pressed", String(saved));
  };
  refresh();
  button.addEventListener("click", () => updateReview(card, !review[card.dataset.originalQuestion]));
  window.addEventListener("review-updated", refresh);
  card.append(button);
}

for (const question of document.querySelectorAll("[data-quiz]")) {
  const feedback = question.querySelector(".feedback");
  const inputs = [...question.querySelectorAll("input")];
  const part = inputs[0]?.name;
  const card = question.closest(".question[data-original-question]");

  question.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = inputs.filter((input) => input.checked)
      .map((input) => input.value)
      .sort()
      .join("");

    if (!selected) {
      feedback.dataset.state = "retry";
      feedback.textContent = "先选答案，再检查。";
      return;
    }

    if (selected === question.dataset.answer) {
      feedback.dataset.state = "correct";
      feedback.textContent = "选对了。展开解析，核对你的判断依据。";
      updateReview(card, false, part);
      return;
    }

    if (selected === question.dataset.alternate) {
      feedback.dataset.state = "context";
      feedback.textContent = question.dataset.alternateText;
      return;
    }

    updateReview(card, true, part);
    feedback.dataset.state = "retry";
    const list = document.createElement("ul");
    list.className = "quiz-feedback-list";
    for (const input of inputs) {
      const expected = question.dataset.answer.includes(input.value);
      if (input.checked === expected || !input.dataset.reason) continue;
      const detail = document.createElement("li");
      const state = input.checked ? "误选" : "漏选";
      detail.textContent = `${state} ${input.value} · ${input.dataset.reason}`;
      list.append(detail);
    }
    if (list.childElementCount) {
      feedback.replaceChildren(list);
    } else {
      feedback.textContent = "可以重选，或展开解析核对每一步。";
    }
  });

  question.addEventListener("change", () => {
    delete feedback.dataset.state;
    feedback.textContent = "";
  });
}
