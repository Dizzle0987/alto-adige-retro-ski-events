const filters = document.querySelectorAll(".filter");
const cards = document.querySelectorAll(".event-card");
const emptyState = document.querySelector(".empty-state");

filters.forEach((button) => {
  button.addEventListener("click", () => {
    const selected = button.dataset.filter;
    let visible = 0;

    filters.forEach((filter) => {
      const active = filter === button;
      filter.classList.toggle("is-active", active);
      filter.setAttribute("aria-pressed", String(active));
    });

    cards.forEach((card) => {
      const categories = card.dataset.categories.split(" ");
      const show = selected === "all" || categories.includes(selected);
      card.hidden = !show;
      if (show) visible += 1;
    });

    emptyState.hidden = visible !== 0;
  });
});
