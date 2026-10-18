(() => {
  const records = [...document.querySelectorAll("[data-case]")];
  const search = document.querySelector("#pa-search");
  const category = document.querySelector("#pa-category");
  const count = document.querySelector("#pa-count");
  if (!search || !category || !count) return;
  document.querySelector(".pa-controls").hidden = false;
  const texts = records.map((r) => r.textContent.toLocaleLowerCase());
  function filter() {
    const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    records.forEach((record, i) => {
      record.hidden = !(category.value === "all" || record.dataset.category === category.value) || !terms.every((term) => texts[i].includes(term));
      if (!record.hidden) visible++;
    });
    count.textContent = `${visible} of ${records.length} source records`;
    document.querySelector("#pa-empty").hidden = visible > 0;
  }
  search.addEventListener("input", filter);
  category.addEventListener("change", filter);
  document.querySelector("#pa-reset").addEventListener("click", () => { search.value = ""; category.value = "all"; filter(); });
  function revealHash() {
    const id = location.hash.slice(1);
    const record = records.find((r) => r.id === id);
    if (!record) return;
    search.value = ""; category.value = "all"; filter();
    record.open = true;
    record.scrollIntoView({ block: "start" });
  }
  window.addEventListener("hashchange", revealHash);
  revealHash();
})();
