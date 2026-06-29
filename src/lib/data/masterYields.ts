// AUTO-GENERATED from assets/Costing Master sheet.xlsx (sheet "Yield").
// Regenerate with: node scripts/gen-master-yields.mjs  — do not edit by hand.
// Each entry is a standard prep yield: raw (unprocessed) -> usable (after trim/prep).
// Boiled/absorption preps have usable > raw (yield > 100%, zero trim wastage).

export interface MasterYield {
  name: string;
  section: string;
  /** Unprocessed weight in grams. */
  raw: number;
  /** Usable weight after prep, in grams. */
  usable: number;
}

export const MASTER_YIELDS: MasterYield[] = [
  {
    "name": "Processed Basil Leaves",
    "section": "Processed",
    "raw": 1200,
    "usable": 700
  },
  {
    "name": "Processed Broccoli",
    "section": "Processed",
    "raw": 3000,
    "usable": 1400
  },
  {
    "name": "Processed Coriander",
    "section": "Processed",
    "raw": 170,
    "usable": 100
  },
  {
    "name": "Processed Dill Leaves",
    "section": "Processed",
    "raw": 120,
    "usable": 100
  },
  {
    "name": "Processed Green Garlic",
    "section": "Processed",
    "raw": 1300,
    "usable": 600
  },
  {
    "name": "Processed Iceberg",
    "section": "Processed",
    "raw": 330,
    "usable": 200
  },
  {
    "name": "Processed Mint",
    "section": "Processed",
    "raw": 210,
    "usable": 100
  },
  {
    "name": "Processed Alphonso Mango",
    "section": "Processed",
    "raw": 1350,
    "usable": 950
  },
  {
    "name": "Processed Arugula",
    "section": "Processed",
    "raw": 900,
    "usable": 580
  },
  {
    "name": "Processed Jamun",
    "section": "Processed",
    "raw": 500,
    "usable": 300
  },
  {
    "name": "Processed Red Chilli",
    "section": "Processed",
    "raw": 1000,
    "usable": 900
  },
  {
    "name": "Processed Brussels Sprouts",
    "section": "Processed",
    "raw": 1000,
    "usable": 800
  },
  {
    "name": "Processed Lollo Rosso",
    "section": "Processed",
    "raw": 1000,
    "usable": 670
  },
  {
    "name": "Processed Shimeji Mushroom",
    "section": "Processed",
    "raw": 1000,
    "usable": 900
  },
  {
    "name": "Processed Pineapple",
    "section": "Processed",
    "raw": 1000,
    "usable": 500
  },
  {
    "name": "Processed Thai Red Chilli",
    "section": "Processed",
    "raw": 1000,
    "usable": 850
  },
  {
    "name": "Processed Bok Choy",
    "section": "Processed",
    "raw": 1000,
    "usable": 670
  },
  {
    "name": "Processed Lemongrass",
    "section": "Processed",
    "raw": 1000,
    "usable": 800
  },
  {
    "name": "Processed Spinach",
    "section": "Processed",
    "raw": 1000,
    "usable": 780
  },
  {
    "name": "Processed Baby Corn",
    "section": "Processed",
    "raw": 1000,
    "usable": 150
  },
  {
    "name": "Processed Leeks",
    "section": "Processed",
    "raw": 534,
    "usable": 274
  },
  {
    "name": "Chopped Cucumber",
    "section": "Chopped",
    "raw": 400,
    "usable": 210
  },
  {
    "name": "Chopped Green Chilli",
    "section": "Chopped",
    "raw": 68,
    "usable": 50
  },
  {
    "name": "Chopped Green Garlic",
    "section": "Chopped",
    "raw": 270,
    "usable": 200
  },
  {
    "name": "Chopped Parsley",
    "section": "Chopped",
    "raw": 200,
    "usable": 150
  },
  {
    "name": "Chopped Spring Onion",
    "section": "Chopped",
    "raw": 120,
    "usable": 100
  },
  {
    "name": "Chopped Tomatoes",
    "section": "Chopped",
    "raw": 1000,
    "usable": 980
  },
  {
    "name": "Chopped Carrot",
    "section": "Chopped",
    "raw": 1000,
    "usable": 800
  },
  {
    "name": "Chopped Ginger",
    "section": "Chopped",
    "raw": 1000,
    "usable": 800
  },
  {
    "name": "Chopped Green Bell Pepper",
    "section": "Chopped",
    "raw": 1000,
    "usable": 650
  },
  {
    "name": "Chopped Chinese Cabbage",
    "section": "Chopped",
    "raw": 1000,
    "usable": 800
  },
  {
    "name": "Chopped Indian Cabbage",
    "section": "Chopped",
    "raw": 1000,
    "usable": 780
  },
  {
    "name": "Sliced Jalapenos",
    "section": "Sliced",
    "raw": 2200,
    "usable": 2000
  },
  {
    "name": "Sliced Zucchini",
    "section": "Sliced",
    "raw": 900,
    "usable": 800
  },
  {
    "name": "Sliced Carrot",
    "section": "Sliced",
    "raw": 1200,
    "usable": 725
  },
  {
    "name": "Sliced Cucumber",
    "section": "Sliced",
    "raw": 880,
    "usable": 550
  },
  {
    "name": "Sliced Mushroom",
    "section": "Sliced",
    "raw": 880,
    "usable": 550
  },
  {
    "name": "Sliced Onion",
    "section": "Sliced",
    "raw": 1500,
    "usable": 1000
  },
  {
    "name": "Sliced Lotus Root",
    "section": "Sliced",
    "raw": 1000,
    "usable": 780
  },
  {
    "name": "Sliced Purple Cabbage",
    "section": "Sliced",
    "raw": 700,
    "usable": 608
  },
  {
    "name": "Thin Sliced White Spring Onion",
    "section": "Sliced",
    "raw": 150,
    "usable": 60
  },
  {
    "name": "Cut Broccoli",
    "section": "Cut",
    "raw": 500,
    "usable": 400
  },
  {
    "name": "Cut Carrot",
    "section": "Cut",
    "raw": 400,
    "usable": 200
  },
  {
    "name": "Cut French Beans",
    "section": "Cut",
    "raw": 287,
    "usable": 250
  },
  {
    "name": "Cut Zucchini",
    "section": "Cut",
    "raw": 600,
    "usable": 200
  },
  {
    "name": "Bell Pepper Rings",
    "section": "Rings",
    "raw": 3300,
    "usable": 1600
  },
  {
    "name": "Cucumber Rings",
    "section": "Rings",
    "raw": 5300,
    "usable": 5030
  },
  {
    "name": "Onion Rings",
    "section": "Rings",
    "raw": 2500,
    "usable": 1250
  },
  {
    "name": "Diced Onion",
    "section": "Diced",
    "raw": 500,
    "usable": 200
  },
  {
    "name": "Diced Grapefruit",
    "section": "Diced",
    "raw": 1000,
    "usable": 480
  },
  {
    "name": "Lemon Juice",
    "section": "Juiced",
    "raw": 1400,
    "usable": 500
  },
  {
    "name": "Watermelon Juice",
    "section": "Juiced",
    "raw": 3000,
    "usable": 1400
  },
  {
    "name": "Whole Mushroom",
    "section": "Whole",
    "raw": 1900,
    "usable": 1500
  },
  {
    "name": "Whole Parsley",
    "section": "Whole",
    "raw": 100,
    "usable": 50
  },
  {
    "name": "White Spring Onion",
    "section": "Other Prep",
    "raw": 1000,
    "usable": 500
  },
  {
    "name": "Slit Onion",
    "section": "Other Prep",
    "raw": 70,
    "usable": 30
  },
  {
    "name": "Spring onion 1/2",
    "section": "Other Prep",
    "raw": 2000,
    "usable": 850
  },
  {
    "name": "Dried Sirarakhong Chilli",
    "section": "Other Prep",
    "raw": 240,
    "usable": 137
  },
  {
    "name": "Dolce Vita Peeled Tomatoes - 3kg",
    "section": "Canned drained weight",
    "raw": 3000,
    "usable": 2800
  },
  {
    "name": "Black Beans",
    "section": "Canned drained weight",
    "raw": 400,
    "usable": 240
  },
  {
    "name": "Red Kidney Beans",
    "section": "Canned drained weight",
    "raw": 400,
    "usable": 240
  },
  {
    "name": "Artichoke Hearts",
    "section": "Canned drained weight",
    "raw": 390,
    "usable": 200
  },
  {
    "name": "Capers",
    "section": "Canned drained weight",
    "raw": 100,
    "usable": 60
  },
  {
    "name": "Sliced Red Paprika",
    "section": "Canned drained weight",
    "raw": 3000,
    "usable": 1500
  },
  {
    "name": "Black Olives",
    "section": "Canned drained weight",
    "raw": 3000,
    "usable": 1560
  },
  {
    "name": "Jalapeño Slices",
    "section": "Canned drained weight",
    "raw": 3000,
    "usable": 1650
  },
  {
    "name": "Water Chestnut",
    "section": "Canned drained weight",
    "raw": 507,
    "usable": 304
  },
  {
    "name": "Boiled Spaghetti",
    "section": "Boiled",
    "raw": 1000,
    "usable": 1850
  },
  {
    "name": "Boiled Macaroni",
    "section": "Boiled",
    "raw": 1000,
    "usable": 1610
  },
  {
    "name": "Boiled Bucatini",
    "section": "Boiled",
    "raw": 1000,
    "usable": 1810
  },
  {
    "name": "Boiled Fettuccini",
    "section": "Boiled",
    "raw": 1000,
    "usable": 1850
  },
  {
    "name": "Boiled Linguini",
    "section": "Boiled",
    "raw": 1000,
    "usable": 1950
  },
  {
    "name": "Boiled Conchiglioni",
    "section": "Boiled",
    "raw": 1000,
    "usable": 1800
  },
  {
    "name": "Boiled Rigatoni",
    "section": "Boiled",
    "raw": 1000,
    "usable": 1800
  },
  {
    "name": "Boiled Penne",
    "section": "Boiled",
    "raw": 1000,
    "usable": 1750
  },
  {
    "name": "Boiled Arborio Rice",
    "section": "Boiled",
    "raw": 500,
    "usable": 700
  },
  {
    "name": "Orange Zest",
    "section": "Zest",
    "raw": 1000,
    "usable": 60
  },
  {
    "name": "Lemon Zest",
    "section": "Zest",
    "raw": 1000,
    "usable": 50
  },
  {
    "name": "Beetroot Paste",
    "section": "Paste",
    "raw": 1000,
    "usable": 720
  },
  {
    "name": "Roasted Bell Pepper",
    "section": "Roasted",
    "raw": 1000,
    "usable": 600
  },
  {
    "name": "Dehydrated Lemon Slices",
    "section": "Dehydrated",
    "raw": 1000,
    "usable": 120
  },
  {
    "name": "Julienne Chinese Cabbage",
    "section": "Julienne",
    "raw": 1000,
    "usable": 800
  },
  {
    "name": "Julienne Indian Cabbage",
    "section": "Julienne",
    "raw": 1000,
    "usable": 780
  },
  {
    "name": "Julienne Leeks",
    "section": "Julienne",
    "raw": 534,
    "usable": 130
  }
];
