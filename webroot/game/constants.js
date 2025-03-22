export const COLOR_PALETTES = {
  basic: {
    name: "Basic",
    colors: {
      red: "#ff0000",
      green: "#00ff00",
      blue: "#0000ff",
      yellow: "#ffff00",
      purple: "#800080",
      orange: "#ffa500",
      white: "#ffffff",
    },
  },
  pastel: {
    name: "Pastel",
    colors: {
      pink: "#FFB6C1",
      mint: "#98FF98",
      lavender: "#E6E6FA",
      peach: "#FFDAB9",
      skyBlue: "#87CEEB",
      coral: "#FF7F50",
      cream: "#FFFDD0",
    },
  },
  dark: {
    name: "Dark",
    colors: {
      navy: "#000080",
      maroon: "#800000",
      forest: "#228B22",
      brown: "#8B4513",
      gray: "#808080",
      indigo: "#4B0082",
      black: "#000000",
    },
  },
};

export const COLORS = COLOR_PALETTES.basic.colors;

export const GRID_SIZE = 30;
export const CUBE_SIZE = 1;
export const GRID_OFFSET = 14.5; // Half of 30 minus 0.5 for center alignment
