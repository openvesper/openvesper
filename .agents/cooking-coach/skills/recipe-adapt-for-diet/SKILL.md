---
name: recipe-adapt-for-diet
description: Adapt any recipe for a dietary restriction or preference while preserving the dish's character. Use when the user wants to make a recipe gluten-free, dairy-free, vegan, low-FODMAP, keto, halal, kosher, or accommodate specific allergies. Provides ingredient substitutions with appropriate ratios, technique adjustments needed, and flavor/texture trade-offs to expect.
---

# Recipe Adapt for Diet

When the user wants to adapt a recipe:

## 1. Get the restrictions
Be specific:
- "Gluten-free" → celiac (strict) vs gluten-sensitive (some flexibility)
- "Dairy-free" → lactose intolerant vs vegan
- "Nut-free" → peanut only or tree nuts too?
- "Halal" → no pork, alcohol-free certain interpretations
- Allergies → severity (anaphylaxis vs intolerance)

## 2. Identify the role of each restricted ingredient

Before substituting, ask: what is this ingredient DOING in the recipe?
- Structure (eggs in cake, gluten in bread)
- Flavor (cheese in pasta)
- Moisture (milk in pancakes)
- Browning (butter in sauté)
- Emulsification (egg yolk in mayo)

You can't substitute well without understanding the role.

## 3. Substitution table

### Gluten-free baking
| Original | Substitute | Notes |
|----------|------------|-------|
| All-purpose flour (1 cup) | GF flour blend + ¼ tsp xanthan gum | Best: rice + tapioca + potato starch |
| Bread flour | GF bread flour + extra binding | Bread is hard GF; suggest different recipe |
| Pasta | Brown rice or chickpea pasta | Cook 1 min less than directions |

### Dairy-free
| Original | Substitute | Notes |
|----------|------------|-------|
| Milk (cup) | Oat milk or unsweetened soy | Coconut for richness, oat for neutral |
| Butter (stick) | Vegan butter or coconut oil | Coconut adds flavor; vegan butter best for baking |
| Cream | Coconut cream or cashew cream | Cashew cream needs blending |
| Cheese | Nutritional yeast (savory) or vegan cheese | Don't expect 1:1 melt |

### Egg replacement (per egg)
- **Binding:** 1 tbsp ground flax + 3 tbsp water (rest 5 min)
- **Whipped:** ¼ cup aquafaba
- **Leavening:** ½ tsp baking powder + 1 tbsp oil + 1 tbsp water

### Low-FODMAP swaps
| Out | In |
|-----|-----|
| Garlic | Garlic-infused oil |
| Onion | Green onion tops only |
| Wheat | Oat / rice / sourdough (often tolerated) |
| Honey | Maple syrup |
| Apple | Banana (firm) |

### Keto adaptations
- Sugar → erythritol or monk fruit (1:1, but tastes cooler)
- Flour → almond flour (1:1 in moist baking; not bread)
- Bread crumbs → crushed pork rinds
- Pasta → zucchini noodles, shirataki, or palmini

## 4. Set expectations honestly

Always note what changes:
- "This will be slightly denser than the original"
- "It will brown less without butter"
- "The texture will be more cake-like than chewy"
- "It won't rise as much"

Don't oversell. Adapted recipes are different, not identical.

## 5. Output format

```
📋 ORIGINAL: [dish name]
🎯 ADAPTING FOR: [restriction]

📝 INGREDIENT SUBSTITUTIONS
• [original] → [substitute] + notes

🔧 TECHNIQUE ADJUSTMENTS
• [what changes in method]

⚖️ EXPECTED DIFFERENCES
• Texture: ...
• Flavor: ...
• Appearance: ...

✨ TIP
[one specific improvement to compensate for the swap]
```
