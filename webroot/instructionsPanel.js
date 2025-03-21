document.addEventListener("DOMContentLoaded", () => {
  const instructions = document.getElementById("instructions");
  const toggleButton = document.getElementById("toggleInstructions");

  if (!instructions || !toggleButton) {
    console.error("Instructions elements not found");
    return;
  }

  let isInstructionsVisible = false;

  toggleButton.addEventListener("click", () => {
    isInstructionsVisible = !isInstructionsVisible;
    instructions.classList.toggle("hidden");
    toggleButton.textContent = isInstructionsVisible
      ? "Hide Controls"
      : "Show Controls";
  });
});
