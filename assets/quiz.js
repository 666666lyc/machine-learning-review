"use strict";

for (const question of document.querySelectorAll("[data-quiz]")) {
  const feedback = question.querySelector(".feedback");

  question.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = [...question.querySelectorAll("input:checked")]
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
      return;
    }

    if (selected === question.dataset.alternate) {
      feedback.dataset.state = "context";
      feedback.textContent = question.dataset.alternateText;
      return;
    }

    feedback.dataset.state = "retry";
    feedback.textContent = "答案还需要检查。可以重选，也可以展开解析自查。";
  });

  question.addEventListener("change", () => {
    delete feedback.dataset.state;
    feedback.textContent = "";
  });
}
