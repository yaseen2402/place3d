document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("hideInstructions").addEventListener("click", () => {
    document.getElementById("instructions").classList.add("hidden");
  });

  document
    .getElementById("toggleInstructions")
    .addEventListener("click", () => {
      document.getElementById("instructions").classList.remove("hidden");
    });
});
