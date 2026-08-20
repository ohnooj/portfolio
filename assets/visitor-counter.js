(() => {
  const counter = document.querySelector("[data-visitor-counter]");
  if (!counter) {
    return;
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (window.location.protocol === "file:" || localHosts.has(window.location.hostname)) {
    return;
  }

  const endpoint = "https://api.counterapi.dev/v1/joonho-kim/profile/up";

  fetch(endpoint, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Counter request failed");
      }
      return response.json();
    })
    .then((data) => {
      if (!Number.isFinite(data.count)) {
        throw new Error("Counter response was missing count");
      }
      counter.textContent = `views ${new Intl.NumberFormat().format(data.count)}`;
    })
    .catch(() => {
      counter.textContent = "views unavailable";
    });
})();
