// AUTO-GENERATED from the "Current 11/15 Inch Pizza 2026" sheets in
// assets/CAPICHE COSTING 2026.xlsx. One master pizza with per-size ingredient
// lists (net grams). Prices come from masterPrices.ts at seed time.

export type PizzaSize = "11_INCH" | "15_INCH";
export interface PizzaVariantIngredient { name: string; qty: number; unit: "Gram"; }
export interface PizzaRecipe {
  name: string;
  variants: Partial<Record<PizzaSize, PizzaVariantIngredient[]>>;
}

export const PIZZA_SIZE_LABEL: Record<PizzaSize, string> = { "11_INCH": "11-inch", "15_INCH": "15-inch" };

export const PIZZA_RECIPES: PizzaRecipe[] = [
  {
    "name": "Affair Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Spicy Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Onion",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Peeled Garlic",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Capers",
          "qty": 4,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Button Mushroom",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Garlic Ricotta",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Shimeji mushroom",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Spring onion",
          "qty": 8,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Spicy Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Onion",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Peeled Garlic",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Capers",
          "qty": 6,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Button Mushroom",
          "qty": 70,
          "unit": "Gram"
        },
        {
          "name": "Garlic Ricotta",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Shimeji mushroom",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Spring onion",
          "qty": 10,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Apollo pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Garlic slice",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Red paprika",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Zucchini",
          "qty": 70,
          "unit": "Gram"
        },
        {
          "name": "Artichoke",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Caramelised onion",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Feta cheese",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Marinated Arugula",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Bread crumbs",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Garlic slice",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Red paprika",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Zucchini",
          "qty": 100,
          "unit": "Gram"
        },
        {
          "name": "Artichoke",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "caramelised onion",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Feta cheese",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Marinated Arugula",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Bread crumbs",
          "qty": 20,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Baby Hulk Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Sriracha Sauce",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Amul Fresh Cream",
          "qty": 90,
          "unit": "Gram"
        },
        {
          "name": "Pesto",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Sour cream",
          "qty": 20,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Sriracha Sauce",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Amul Fresh Cream",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Basil Pesto",
          "qty": 40,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Sour cream",
          "qty": 25,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Burrata hot honey",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Oregano",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Olive oil",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Burrata cheese",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Hot honey",
          "qty": 6,
          "unit": "Gram"
        },
        {
          "name": "Garlic oil",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Gochujgaru",
          "qty": 3,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Oregano",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Olive oil",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Burrata cheese",
          "qty": 130,
          "unit": "Gram"
        },
        {
          "name": "Hot honey",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Garlic oil",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Gochujgaru",
          "qty": 5,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "CHILLI CRUNCH",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Bechamel sauce",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Chili crunch sauce",
          "qty": 100,
          "unit": "Gram"
        },
        {
          "name": "Burrata Cheese",
          "qty": 130,
          "unit": "Gram"
        },
        {
          "name": "Black sesame",
          "qty": 6,
          "unit": "Gram"
        },
        {
          "name": "Coriander",
          "qty": 8,
          "unit": "Gram"
        },
        {
          "name": "Spring onion",
          "qty": 8,
          "unit": "Gram"
        },
        {
          "name": "Basil",
          "qty": 8,
          "unit": "Gram"
        },
        {
          "name": "Dil leaves",
          "qty": 8,
          "unit": "Gram"
        },
        {
          "name": "Chiili crips oil",
          "qty": 8,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Bechamel sauce",
          "qty": 70,
          "unit": "Gram"
        },
        {
          "name": "Chili crunch sauce",
          "qty": 200,
          "unit": "Gram"
        },
        {
          "name": "Buratta cheese",
          "qty": 170,
          "unit": "Gram"
        },
        {
          "name": "Black sesame",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Coriander",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Spring onion",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Basil",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Dil leaves",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Chiili crips oil",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Chilli Butter Corn",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "White sauce",
          "qty": 69.68,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella cheese",
          "qty": 58.06,
          "unit": "Gram"
        },
        {
          "name": "Cheddar cheese",
          "qty": 11.61,
          "unit": "Gram"
        },
        {
          "name": "Corn mix",
          "qty": 69.68,
          "unit": "Gram"
        },
        {
          "name": "Jalapeno slices",
          "qty": 29.03,
          "unit": "Gram"
        },
        {
          "name": "Garlic slices",
          "qty": 17.42,
          "unit": "Gram"
        },
        {
          "name": "Black sesame (crust)",
          "qty": 5.81,
          "unit": "Gram"
        },
        {
          "name": "Chilli butter dollop",
          "qty": 14.52,
          "unit": "Gram"
        },
        {
          "name": "Spring onion",
          "qty": 2.9,
          "unit": "Gram"
        },
        {
          "name": "Gochugaru",
          "qty": 1.16,
          "unit": "Gram"
        },
        {
          "name": "Dynamite crunch",
          "qty": 11.61,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "White sauce",
          "qty": 120,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella cheese",
          "qty": 100,
          "unit": "Gram"
        },
        {
          "name": "Cheddar cheese",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Corn mix",
          "qty": 120,
          "unit": "Gram"
        },
        {
          "name": "Jalapeno slices",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Garlic slices",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Black sesame (crust)",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Chilli butter dollop",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Spring onion",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Gochugaru",
          "qty": 2,
          "unit": "Gram"
        },
        {
          "name": "Dynamite crunch",
          "qty": 20,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Garlic pie Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Slice garlic",
          "qty": 40,
          "unit": "Gram"
        },
        {
          "name": "Chooped garlic",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Green garlic",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Slice garlic",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Chooped garlic",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Green garlic",
          "qty": 20,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Hell Boy Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro sauce",
          "qty": 69.68,
          "unit": "Gram"
        },
        {
          "name": "Red Sriracha",
          "qty": 17.42,
          "unit": "Gram"
        },
        {
          "name": "Smoked cheese",
          "qty": 58.06,
          "unit": "Gram"
        },
        {
          "name": "Cheddar cheese",
          "qty": 11.61,
          "unit": "Gram"
        },
        {
          "name": "Garlic slices",
          "qty": 17.42,
          "unit": "Gram"
        },
        {
          "name": "Honey butter drizzle",
          "qty": 5.81,
          "unit": "Gram"
        },
        {
          "name": "Chimichurri (chunky)",
          "qty": 14.52,
          "unit": "Gram"
        },
        {
          "name": "Whipped feta dollop",
          "qty": 14.52,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro sauce",
          "qty": 120,
          "unit": "Gram"
        },
        {
          "name": "Red Sriracha",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Smoked cheese",
          "qty": 100,
          "unit": "Gram"
        },
        {
          "name": "Cheddar cheese",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Garlic slices",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Honey butter drizzle",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Chimichurri (chunky)",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Whipped feta dollop",
          "qty": 25,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Margherita Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 70,
          "unit": "Gram"
        },
        {
          "name": "Basil",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Parmesan Cheese",
          "qty": 8,
          "unit": "Gram"
        },
        {
          "name": "Olive oil",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 120,
          "unit": "Gram"
        },
        {
          "name": "Basil",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Parmesan Cheese",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Olive oil",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Mid Hulk Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Sriracha Sauce",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Amul Fresh Cream",
          "qty": 90,
          "unit": "Gram"
        },
        {
          "name": "Pesto",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Sour cream",
          "qty": 20,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Sriracha Sauce",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Amul Fresh Cream",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Pesto",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Sour cream",
          "qty": 25,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Ortolana pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Jalapeno",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Black olive",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Broccoli",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Green Bellpaper",
          "qty": 70,
          "unit": "Gram"
        },
        {
          "name": "Capers",
          "qty": 6,
          "unit": "Gram"
        },
        {
          "name": "Marinated Aragula",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Slice almond",
          "qty": 5,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Jalapeno",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Black olive",
          "qty": 40,
          "unit": "Gram"
        },
        {
          "name": "Broccoli",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Green Bellpaper",
          "qty": 100,
          "unit": "Gram"
        },
        {
          "name": "Capers",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Marinated Aragula",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Slice almond",
          "qty": 5,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Peperone Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Ring bell pepper",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Green Chilli",
          "qty": 8,
          "unit": "Gram"
        },
        {
          "name": "Ring onion",
          "qty": 35,
          "unit": "Gram"
        },
        {
          "name": "Black Sliced Olives",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Bell Pepper",
          "qty": 70,
          "unit": "Gram"
        },
        {
          "name": "Green Chilli",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Onion",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Black Sliced Olives",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Picanate",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Chili oil",
          "qty": 6,
          "unit": "Gram"
        },
        {
          "name": "Ghost Paper",
          "qty": 1,
          "unit": "Gram"
        },
        {
          "name": "Roasted Bell paper",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Gochugaru",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Garlic slice",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Green Chilli",
          "qty": 7,
          "unit": "Gram"
        },
        {
          "name": "Red Paprika Slices",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Jalapeno",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Chili oil",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Ghost Paper",
          "qty": 1.5,
          "unit": "Gram"
        },
        {
          "name": "Roasted Bell paper",
          "qty": 40,
          "unit": "Gram"
        },
        {
          "name": "Gochugaru",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Garlic slice",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Green Chilli",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Red Paprika Slices",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Fresh Jalapeno",
          "qty": 25,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Prime Hulk Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Sriracha Sauce",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Amul Fresh Cream",
          "qty": 90,
          "unit": "Gram"
        },
        {
          "name": "Pesto",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Ghost Peper",
          "qty": 1.5,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Sour cream",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Green Sriracha Sauce",
          "qty": 45,
          "unit": "Gram"
        },
        {
          "name": "Amul Fresh Cream",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Basil Pesto",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Ghost Peper",
          "qty": 2.35,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Sour cream",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Rubirosa Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Spicy Pomodoro Sauce",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Pesto",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Sriracha Sauce",
          "qty": 3,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Spicy Pomodoro Sauce",
          "qty": 130,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Pesto",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Sriracha Sauce",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Sid's pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozzarella",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Marinated Arugula",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Fresh Jalapeno",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Ricotta Cheese",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 40,
          "unit": "Gram"
        },
        {
          "name": "Marinated Arugula",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Fresh Jalapeno",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Ricotta Cheese",
          "qty": 40,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Third Wave Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Boiled Broccoli",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Peeled Garlic",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Red paprika sliced",
          "qty": 10,
          "unit": "Gram"
        },
        {
          "name": "Jalapenos",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Chilli Crisp",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Boiled Broccoli",
          "qty": 50,
          "unit": "Gram"
        },
        {
          "name": "Peeled Garlic",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Red paprika sliced",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Jalapenos",
          "qty": 30,
          "unit": "Gram"
        },
        {
          "name": "Chilli Crisp",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Triple sauce",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 40,
          "unit": "Gram"
        },
        {
          "name": "Ornage sauce",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Pesto",
          "qty": 20,
          "unit": "Gram"
        },
        {
          "name": "Parmesan",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 110,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "Orange sauce",
          "qty": 40,
          "unit": "Gram"
        },
        {
          "name": "Pesto",
          "qty": 40,
          "unit": "Gram"
        },
        {
          "name": "Parmesan",
          "qty": 15,
          "unit": "Gram"
        }
      ]
    }
  },
  {
    "name": "Truffle Pizza",
    "variants": {
      "11_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 180,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 80,
          "unit": "Gram"
        },
        {
          "name": "TRUFFLE PASTE",
          "qty": 3,
          "unit": "Gram"
        },
        {
          "name": "TRUFFLE OIL",
          "qty": 3,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 15,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 60,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 10,
          "unit": "Gram"
        }
      ],
      "15_INCH": [
        {
          "name": "Pizza Dough",
          "qty": 310,
          "unit": "Gram"
        },
        {
          "name": "Basil Pomodoro Sauce",
          "qty": 150,
          "unit": "Gram"
        },
        {
          "name": "TRUFFLE PASTE",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "TRUFFLE OIL",
          "qty": 5,
          "unit": "Gram"
        },
        {
          "name": "Buffalo Mozrella",
          "qty": 25,
          "unit": "Gram"
        },
        {
          "name": "Mozzarella Grated",
          "qty": 120,
          "unit": "Gram"
        },
        {
          "name": "Rice flour",
          "qty": 15,
          "unit": "Gram"
        }
      ]
    }
  }
];
